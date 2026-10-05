"""Envío de alertas por WhatsApp con plantillas aprobadas de Meta.

Todo el envío real está detrás de `modo_simulacion()`. Sin credenciales de Meta
y sin plantillas APPROVED no sale ningún mensaje, y el motivo queda registrado.
"""

from __future__ import annotations

import os
from typing import Any, Mapping

import requests
from contactos import (
    CANAL,
    ESTADO_ENVIADO,
    ESTADO_FALLIDO,
    ESTADO_SIMULADO,
    NIVELES_NOTIFICABLES,
    obtener_contactos_notificables,
    esquema_disponible,
)
from notificaciones import debe_notificar

# Meta envía a /{phone-number-id}/messages con el token del portador.
_VERSION = "v21.0"
_TIMEOUT = 15

# Plantillas aprobadas que se esperan. El nombre es el que se registra en el
# WhatsApp Manager; WHATSAPP_PLANTILLA_<NIVEL> permite renombrarlas.
PLANTILLAS_POR_DEFECTO = {
    "ROJO": "alerta_inundacion_rojo",
    "NARANJA": "alerta_inundacion_naranja",
    "AMARILLO": "alerta_inundacion_amarillo",
}


# --------------------------------------------------------------------------
# Configuración del proveedor
# --------------------------------------------------------------------------


def modo_simulacion() -> bool:
    """Si no hay credenciales, el sistema opera en simulación y lo dice."""
    return os.getenv("WHATSAPP_MODO", "").lower() != "produccion"


def credenciales_configuradas() -> bool:
    return all(
        os.getenv(clave)
        for clave in ("WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_WABA_ID")
    )


def estado_modo() -> dict[str, Any]:
    """Diagnóstico del canal, para saber qué falta antes de activar.

    Distingue dos bloqueos que se confunden: que falte la tabla (no se puede ni
    guardar el número) y que falten credenciales o plantillas (el número sí se
    guarda, pero no se entrega nada).
    """
    if not esquema_disponible():
        return {
            "modo": "simulacion",
            "listo_para_enviar": False,
            "puede_guardar_numero": False,
            "faltan_credenciales": [],
            "plantillas_aprobadas": {},
            "detalle": (
                "Falta la tabla 'contactos_whatsapp'. Aplica "
                "backend/sql/contactos_whatsapp.sql en el editor SQL de Supabase."
            ),
        }

    faltan = [
        clave
        for clave in ("WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_WABA_ID")
        if not os.getenv(clave)
    ]
    plantillas = {
        nivel: plantilla_aprobada(nivel) for nivel in NIVELES_NOTIFICABLES
    }
    pendientes = [n for n, ok in plantillas.items() if not ok]
    comun = {
        "puede_guardar_numero": True,
        "faltan_credenciales": faltan,
        "plantillas_aprobadas": plantillas,
    }

    if faltan:
        return {
            **comun,
            "modo": "simulacion",
            "listo_para_enviar": False,
            "detalle": f"Faltan variables: {', '.join(faltan)}",
        }
    if pendientes:
        return {
            **comun,
            "modo": "simulacion" if modo_simulacion() else "produccion",
            "listo_para_enviar": False,
            "detalle": (
                "Plantillas sin aprobar: "
                f"{', '.join(pendientes)}. Meta solo permite plantillas APPROVED."
            ),
        }
    return {
        **comun,
        "modo": "simulacion" if modo_simulacion() else "produccion",
        "listo_para_enviar": not modo_simulacion(),
        "detalle": (
            "Todo listo, pero WHATSAPP_MODO=simulacion impide el envío real"
            if modo_simulacion()
            else None
        ),
    }


def nombre_plantilla(nivel: str) -> str:
    clave = f"WHATSAPP_PLANTILLA_{nivel.upper()}"
    return os.getenv(clave) or PLANTILLAS_POR_DEFECTO.get(nivel.upper(), "")


def plantilla_aprobada(nivel: str) -> bool:
    """Solo se envía con plantillas aprobadas.

    El estado vive en .env porque lo otorga Meta y cambia por su cuenta; se
    declara aquí en vez de consultarlo a cada envío para no gastar cuota de la
    API en una decisión que cambia una vez cada varios meses.
    """
    return os.getenv(f"WHATSAPP_PLANTILLA_APROBADA_{nivel.upper()}", "").lower() in {
        "1",
        "true",
        "si",
        "sí",
    }


def _payload(nivel: str, decision: Mapping[str, Any], lectura: Mapping[str, Any] | None) -> dict[str, Any]:
    """Arma el cuerpo del mensaje con las variables de la plantilla."""
    distancia = (lectura or {}).get("distancia_cm")
    velocidad = (lectura or {}).get("velocidad_cm_min")
    confirmada = bool(decision.get("confirmada_por_satelite"))

    return {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": "",
        "type": "template",
        "template": {
            "name": nombre_plantilla(nivel),
            "language": {"code": os.getenv("WHATSAPP_IDIOMA", "es")},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": nivel},
                        {
                            "type": "text",
                            "text": f"{float(distancia):.0f}"
                            if distancia is not None
                            else "sin dato",
                        },
                        {
                            "type": "text",
                            "text": f"{float(velocidad):.2f}"
                            if velocidad is not None
                            else "sin dato",
                        },
                        {"type": "text", "text": "sí" if confirmada else "no"},
                    ],
                }
            ],
        },
    }


def _enviar_real(telefono: str, cuerpo: dict[str, Any]) -> tuple[bool, str | None]:
    """Llama a la Cloud API de Meta. Devuelve (enviado, error)."""
    cuerpo = {**cuerpo, "to": telefono}
    url = (
        f"https://graph.facebook.com/{_VERSION}/"
        f"{os.environ['WHATSAPP_PHONE_NUMBER_ID']}/messages"
    )
    try:
        respuesta = requests.post(
            url,
            json=cuerpo,
            headers={
                "Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}",
                "Content-Type": "application/json",
            },
            timeout=_TIMEOUT,
        )
    except requests.RequestException as error:
        return False, f"conexion: {str(error)[:160]}"

    if respuesta.status_code >= 200 and respuesta.status_code < 300:
        return True, None

    try:
        detalle = respuesta.json().get("error", {})
        # `dict.get(k, default)` siempre evalúa el default, así que `or` evita
        # materializar respuesta.text cuando el error ya trae mensaje.
        mensaje = detalle.get("message") or respuesta.text
        codigo = detalle.get("code")
        subcodigo = (detalle.get("error_data") or {}).get("details", "")
        return False, f"HTTP {respuesta.status_code} code={codigo}: {mensaje} {subcodigo}"[:300]
    except (ValueError, AttributeError):
        return False, f"HTTP {respuesta.status_code}: {getattr(respuesta, 'text', '')[:200]}"


def _auditar(alerta_id: str, contacto_id: str, estado: str, error: str | None = None) -> None:
    from crud import _require_supabase

    cliente = _require_supabase()
    cliente.table("notificaciones_alertas").insert({
        "alerta_id": alerta_id,
        "contacto_id": contacto_id,
        "destinatario": contacto_id,
        "tipo_destinatario": "persona",
        "canal": CANAL,
        "estado_envio": estado,
        "error_envio": error,
    }).execute()


def notificar_alerta_whatsapp(
    alerta: Mapping[str, Any],
    decision: Mapping[str, Any],
    lectura: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Envía la alerta ya decidida a los contactos autorizados por WhatsApp.

    Es best-effort: un fallo aquí no puede tumbar la ingesta de la lectura.
    """
    nivel = str(decision.get("nivel_final", "")).upper()
    resumen: dict[str, Any] = {
        "alerta_id": alerta.get("id"),
        "nivel": nivel,
        "canal": CANAL,
        "notificado": False,
        "contactos": 0,
        "enviados": 0,
        "simulados": 0,
        "fallidos": 0,
        "motivo": None,
    }

    if not debe_notificar(decision):
        resumen["motivo"] = "La decisión de decision.py no amerita notificación"
        return resumen

    if not plantilla_aprobada(nivel):
        resumen["motivo"] = (
            f"La plantilla '{nombre_plantilla(nivel) or 'sin configurar'}' para {nivel} "
            "no está marcada como aprobada. Meta solo permite plantillas APPROVED."
        )
        return resumen

    try:
        contactos = obtener_contactos_notificables(nivel)
    except Exception as error:  # noqa: BLE001
        resumen["motivo"] = f"No se pudieron leer los contactos: {error}"
        return resumen

    if not contactos:
        resumen["motivo"] = "No hay contactos con consentimiento vigente para este nivel"
        return resumen

    resumen["contactos"] = len(contactos)
    resumen["notificado"] = True
    cuerpo = _payload(nivel, decision, lectura)
    simulando = modo_simulacion()

    for contacto in contactos:
        if simulando:
            resumen["simulados"] += 1
            try:
                _auditar(alerta["id"], contacto["id"], ESTADO_SIMULADO)
            except Exception:  # noqa: BLE001
                pass
            continue

        enviado, error = _enviar_real(contacto["telefono"], cuerpo)
        if enviado:
            resumen["enviados"] += 1
            estado = ESTADO_ENVIADO
        else:
            resumen["fallidos"] += 1
            estado = ESTADO_FALLIDO

        try:
            _auditar(alerta["id"], contacto["id"], estado, error)
        except Exception:  # noqa: BLE001
            pass

    return resumen
