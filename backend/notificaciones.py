"""Registro de dispositivos y despacho de alertas por Web Push (PWA).

Qué alerta se notifica NO se decide en este módulo: se delega a
`decision.evaluar_alerta_fusionada`, que ya se invoca al recibir una lectura en
`POST /api/lecturas`. Este módulo solo toma la decisión ya resuelta, arma el
mensaje y lo entrega a los dispositivos suscritos.

El envío usa Web Push (VAPID), así que no requiere app nativa ni credenciales
de Firebase: la clave pública VAPID se publica en `GET /notificaciones/vapid`
para que el navegador la use al suscribirse.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping

from crud import _require_supabase
from pywebpush import WebPushException, webpush

CANAL = "web_push"
ESTADO_ACTIVO = "activo"
ESTADO_FALLIDO = "fallido"
ESTADO_DESUSCRITO = "desuscrito"

# Los push services responden 404/410 cuando la suscripción caducó. En ese caso
# no tiene sentido reintentar: el token se limpia para no despachar en el vacío.
ESTADOS_TERMINALES = {404, 410}

_NIVELES_NOTIFICABLES = ("AMARILLO", "NARANJA", "ROJO")


class ErrorNotificaciones(RuntimeError):
    """Falla operativa al registrar o despachar notificaciones."""


class ErrorEsquemaPush(ErrorNotificaciones):
    """La tabla de dispositivos no existe todavía en Supabase.

    El backend usa un token rol `anon` y PostgREST no permite DDL, así que
    `sql/dispositivos_push.sql` debe corrirse a mano en el editor de Supabase.
    """


_INSTRUCCION_ESQUEMA = (
    "Falta la tabla 'dispositivos_push'. Corre backend/sql/dispositivos_push.sql "
    "en el editor SQL de Supabase."
)


def _require_esquema_push(cliente) -> None:
    """Falla pronto y con un mensaje útil si el esquema aún no está aplicado."""
    try:
        cliente.table("dispositivos_push").select("id").limit(1).execute()
    except Exception as error:  # noqa: BLE001
        if "dispositivos_push" in str(error) or "PGRST205" in str(error):
            raise ErrorEsquemaPush(_INSTRUCCION_ESQUEMA) from error
        raise


# --------------------------------------------------------------------------
# Configuración VAPID
# --------------------------------------------------------------------------


def vapid_configurado() -> bool:
    return bool(
        os.getenv("VAPID_PUBLIC_KEY") and os.getenv("VAPID_PRIVATE_KEY")
    )


def clave_publica_vapid() -> str | None:
    return os.getenv("VAPID_PUBLIC_KEY") or None


def _afirmacion_vapid() -> str | None:
    correo = os.getenv("VAPID_CLAIMS_EMAIL")
    return f"mailto:{correo}" if correo else None


def _normalizar_suscripcion(suscripcion: Any) -> dict[str, Any]:
    """Valida la suscripción que entrega el navegador y devuelve el JSON canónico.

    Comparar el JSON canónico es lo que permite deduplicar la misma suscripción
    aunque venga con el orden de claves distinto.
    """
    if isinstance(suscripcion, str):
        try:
            suscripcion = json.loads(suscripcion)
        except json.JSONDecodeError as error:
            raise ErrorNotificaciones("La suscripción no es un JSON válido") from error

    if not isinstance(suscripcion, Mapping):
        raise ErrorNotificaciones("La suscripción debe ser un objeto")

    endpoint = suscripcion.get("endpoint")
    claves = suscripcion.get("keys")

    if not isinstance(endpoint, str) or not endpoint.startswith("https://"):
        raise ErrorNotificaciones("Falta un endpoint HTTPS válido en la suscripción")
    if not isinstance(claves, Mapping):
        raise ErrorNotificaciones("La suscripción no incluye las claves de cifrado")
    if not isinstance(claves.get("p256dh"), str) or not isinstance(claves.get("auth"), str):
        raise ErrorNotificaciones("Las claves p256dh y auth son obligatorias")

    return {"endpoint": endpoint, "expirationTime": None, "keys": dict(claves)}


def _huella(suscripcion: Mapping[str, Any]) -> str:
    return str(suscripcion["endpoint"])


# --------------------------------------------------------------------------
# Registro de dispositivos
# --------------------------------------------------------------------------


def registrar_dispositivo(
    suscripcion: Any,
    vapid_public_key: str | None = None,
    etiqueta: str | None = None,
) -> dict[str, Any]:
    """Registra o reactiva un dispositivo. Repetirla no duplica la suscripción."""
    cliente = _require_supabase()
    _require_esquema_push(cliente)
    normalizada = _normalizar_suscripcion(suscripcion)
    huella = _huella(normalizada)
    clave = vapid_public_key or clave_publica_vapid()

    if not clave:
        raise ErrorNotificaciones(
            "El servidor no tiene VAPID configurado; no se puede asociar la suscripción"
        )

    ahora = datetime.now(timezone.utc).isoformat()
    existente = (
        cliente.table("dispositivos_push")
        .select("id, estado")
        .eq("suscripcion_json->>endpoint", huella)
        .execute()
    )
    filas = existente.data or []

    if filas:
        # Reactiva el dispositivo y refresca el JSON por si rotaron las claves.
        actualizada = (
            cliente.table("dispositivos_push")
            .update({
                "suscripcion_json": normalizada,
                "vapid_public_key": clave,
                "estado": ESTADO_ACTIVO,
                "ultimo_error": None,
                "updated_at": ahora,
            })
            .eq("id", filas[0]["id"])
            .execute()
        )
        return {
            "id": filas[0]["id"],
            "registrado": True,
            "reactivado": filas[0].get("estado") != ESTADO_ACTIVO,
        } if actualizada.data else {"id": filas[0]["id"], "registrado": True, "reactivado": False}

    nuevo = (
        cliente.table("dispositivos_push")
        .insert({
            "suscripcion_json": normalizada,
            "vapid_public_key": clave,
            "canal": CANAL,
            "estado": ESTADO_ACTIVO,
            "etiqueta": etiqueta,
        })
        .execute()
    )
    if not nuevo.data:
        raise ErrorNotificaciones("Supabase no devolvió el dispositivo registrado")
    return {"id": nuevo.data[0]["id"], "registrado": True, "reactivado": False}


def desregistrar_dispositivo(suscripcion: Any) -> bool:
    """Da de baja la suscripción. Borra la fila en vez de marcarla para no
    conservar tokens caducados ni depender de una limpieza posterior."""
    cliente = _require_supabase()
    try:
        normalizada = _normalizar_suscripcion(suscripcion)
    except ErrorNotificaciones:
        return False

    borrado = (
        cliente.table("dispositivos_push")
        .delete()
        .eq("suscripcion_json->>endpoint", _huella(normalizada))
        .execute()
    )
    return bool(borrado.data)


def obtener_dispositivos_activos() -> list[dict[str, Any]]:
    cliente = _require_supabase()
    _require_esquema_push(cliente)
    respuesta = (
        cliente.table("dispositivos_push")
        .select("id, suscripcion_json, vapid_public_key, etiqueta, estado")
        .eq("estado", ESTADO_ACTIVO)
        .execute()
    )
    return respuesta.data or []


def contar_dispositivos_activos() -> int:
    cliente = _require_supabase()
    _require_esquema_push(cliente)
    respuesta = (
        cliente.table("dispositivos_push")
        .select("id", count="exact")
        .eq("estado", ESTADO_ACTIVO)
        .execute()
    )
    return len(respuesta.data or [])


def _marcar_dispositivo(dispositivo_id: str, estado: str, error: str | None = None) -> None:
    cliente = _require_supabase()
    (
        cliente.table("dispositivos_push")
        .update({
            "estado": estado,
            "ultimo_error": error,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", dispositivo_id)
        .execute()
    )


def _acumular_envio(dispositivo_id: str, exitoso: bool) -> None:
    columna = "envios_exitosos" if exitoso else "envios_fallidos"
    cliente = _require_supabase()
    fila = (
        cliente.table("dispositivos_push")
        .select(columna)
        .eq("id", dispositivo_id)
        .execute()
    )
    actual = (fila.data or [{}])[0].get(columna) or 0
    (
        cliente.table("dispositivos_push")
        .update({columna: int(actual) + 1})
        .eq("id", dispositivo_id)
        .execute()
    )


def _auditar_envio(
    alerta_id: str,
    dispositivo_id: str,
    estado: str,
    error: str | None = None,
) -> None:
    """Deja rastro en notificaciones_alertas, la tabla que ya usa la gráfica 8."""
    cliente = _require_supabase()
    cliente.table("notificaciones_alertas").insert({
        "alerta_id": alerta_id,
        "dispositivo_id": dispositivo_id,
        "destinatario": dispositivo_id,
        "tipo_destinatario": "dispositivo",
        "canal": CANAL,
        "estado_envio": estado,
        "error_envio": error,
    }).execute()


def _ya_notificado(alerta_id: str, dispositivo_id: str) -> bool:
    """Evita reenviar la misma alerta al mismo dispositivo."""
    cliente = _require_supabase()
    respuesta = (
        cliente.table("notificaciones_alertas")
        .select("id")
        .eq("alerta_id", alerta_id)
        .eq("dispositivo_id", dispositivo_id)
        .eq("estado_envio", "enviado")
        .limit(1)
        .execute()
    )
    return bool(respuesta.data)


# --------------------------------------------------------------------------
# Mensaje y despacho
# --------------------------------------------------------------------------


def debe_notificar(decision: Mapping[str, Any]) -> bool:
    """Regla de disparo. Delega en decision.py: no se duplica la lógica aquí."""
    if not decision.get("crear_alerta"):
        return False
    return str(decision.get("nivel_final", "")).upper() in _NIVELES_NOTIFICABLES


def _mensaje(
    alerta: Mapping[str, Any],
    decision: Mapping[str, Any],
    lectura: Mapping[str, Any] | None,
) -> dict[str, Any]:
    nivel = str(decision.get("nivel_final", alerta.get("nivel_final", ""))).upper()
    distancia = (lectura or {}).get("distancia_cm")
    velocidad = (lectura or {}).get("velocidad_cm_min")

    detalles = []
    if distancia is not None:
        detalles.append(f"distancia {float(distancia):.0f} cm")
    if velocidad is not None:
        detalles.append(f"subida {float(velocidad):.2f} cm/min")

    resumen = ", ".join(detalles) if detalles else "sin mediciones adjuntas"
    confirmada = bool(decision.get("confirmada_por_satelite"))

    if confirmada:
        cierre = "Confirmada con datos satelitales."
    else:
        cierre = "Detectada por el sensor."

    return {
        "titulo": f"Alerta de inundación {nivel}",
        "cuerpo": f"El nivel del río subió a {nivel} ({resumen}). {cierre}",
        "data": {
            "alerta_id": alerta.get("id"),
            "nivel": nivel,
            "confirmada_por_satelite": confirmada,
            "url": "/#/alerts",
        },
    }


def _enviar_uno(dispositivo: Mapping[str, Any], cuerpo: bytes) -> tuple[bool, str | None]:
    try:
        webpush(
            subscription_info=dispositivo["suscripcion_json"],
            data=cuerpo,
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
            vapid_claims={"sub": _afirmacion_vapid() or "mailto:soporte@sat.local"},
            ttl=3600,
        )
    except WebPushException as error:
        codigo = getattr(getattr(error, "response", None), "status_code", None)
        return False, f"{codigo or 'sin_codigo'}: {str(error)[:180]}"
    except Exception as error:  # noqa: BLE001
        return False, str(error)[:180]
    return True, None


def notificar_alerta(
    alerta: Mapping[str, Any],
    decision: Mapping[str, Any],
    lectura: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Envía la alerta ya decidida a los dispositivos suscritos.

    Nunca propaga un fallo de envío: una alerta móvil que no se pudo entregar no
    puede tumbar la ingesta de la lectura que la originó.
    """
    resumen = {
        "alerta_id": alerta.get("id"),
        "nivel": decision.get("nivel_final"),
        "notificado": False,
        "dispositivos": 0,
        "enviados": 0,
        "fallidos": 0,
        "omitidos": 0,
        "motivo": None,
    }

    if not debe_notificar(decision):
        resumen["motivo"] = "La decisión de decision.py no amerita notificación"
        return resumen
    if not vapid_configurado():
        resumen["motivo"] = "VAPID no está configurado en el servidor"
        return resumen

    try:
        dispositivos = obtener_dispositivos_activos()
    except Exception as error:  # noqa: BLE001
        resumen["motivo"] = f"No se pudieron leer los dispositivos: {error}"
        return resumen

    if not dispositivos:
        resumen["motivo"] = "No hay dispositivos suscritos"
        return resumen

    cuerpo = json.dumps(_mensaje(alerta, decision, lectura)).encode("utf-8")
    resumen["dispositivos"] = len(dispositivos)
    resumen["notificado"] = True

    for dispositivo in dispositivos:
        dispositivo_id = dispositivo["id"]
        try:
            if _ya_notificado(alerta["id"], dispositivo_id):
                resumen["omitidos"] += 1
                continue
        except Exception:  # noqa: BLE001
            # Si la auditoría falla no se bloquea el envío, pero se reintenta luego.
            pass

        exitoso, error = _enviar_uno(dispositivo, cuerpo)
        if exitoso:
            resumen["enviados"] += 1
            try:
                _acumular_envio(dispositivo_id, True)
                _auditar_envio(alerta["id"], dispositivo_id, "enviado")
            except Exception:  # noqa: BLE001
                pass
            continue

        resumen["fallidos"] += 1
        try:
            _auditar_envio(alerta["id"], dispositivo_id, "fallido", error)
        except Exception:  # noqa: BLE001
            pass

        codigo = (error or "").split(":")[0]
        if codigo.isdigit() and int(codigo) in ESTADOS_TERMINALES:
            try:
                cliente = _require_supabase()
                cliente.table("dispositivos_push").delete().eq("id", dispositivo_id).execute()
            except Exception:  # noqa: BLE001
                _marcar_dispositivo(dispositivo_id, ESTADO_DESUSCRITO, error)
        else:
            try:
                _acumular_envio(dispositivo_id, False)
                _marcar_dispositivo(dispositivo_id, ESTADO_FALLIDO, error)
            except Exception:  # noqa: BLE001
                pass

    return resumen
