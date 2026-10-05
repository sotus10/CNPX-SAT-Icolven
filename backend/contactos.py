"""Avisos de alerta por WhatsApp (WhatsApp Business Cloud API).

Estado: modo simulación. El envío real queda desactivado hasta que existan
credenciales de Meta y plantillas aprobadas.

Por qué plantillas y no texto libre: Meta solo permite *template messages*
fuera de la ventana de atención de 24 horas, y deben estar en estado
APPROVED (la revisión puede tardar hasta 24 h). Un aviso de crecida se envía
a personas que no te escribieron antes, así que siempre cae fuera de esa
ventana. Por eso aquí no existe ningún camino de texto libre: si la plantilla
no está aprobada, no se envía y se dice por qué.

El disparador de qué alerta se avisa viene de `decision.evaluar_alerta_fusionada`,
igual que el push. Este módulo no redefine la decisión.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Mapping

from crud import _require_supabase

CANAL = "whatsapp"
ESTADO_ENVIADO = "enviado"
ESTADO_FALLIDO = "fallido"
ESTADO_SIMULADO = "simulado"

NIVELES_NOTIFICABLES = ("AMARILLO", "NARANJA", "ROJO")

# WhatsApp exige E.164: signo, código de país, 7-15 dígitos. Sin espacios.
_RE_E164 = re.compile(r"^\+[1-9]\d{6,14}$")


class ErrorContactos(RuntimeError):
    """Falla al leer o validar los contactos autorizados."""


class ErrorConsentimiento(ErrorContactos):
    """El contacto no tiene consentimiento vigente."""


class ErrorEsquemaAusente(ErrorContactos):
    """La tabla de contactos no existe todavía en Supabase.

    Deliberadamente NO hereda de ErrorConsentimiento: los endpoints distinguen el
    503 de esquema ausente del 422 de dato inválido, y que uno fuera subclase del
    otro hacía que el esquema ausente se reportara como 422.

    El backend corre con un token rol `anon` y PostgREST no permite DDL, así que
    `sql/contactos_whatsapp.sql` debe correrse a mano en el editor de Supabase.
    """


_INSTRUCCION_ESQUEMA = (
    "Falta la tabla 'contactos_whatsapp'. Corre backend/sql/contactos_whatsapp.sql "
    "en el editor SQL de Supabase."
)


def _require_esquema(cliente) -> None:
    """Falla pronto y con un mensaje útil si el esquema aún no está aplicado."""
    try:
        cliente.table("contactos_whatsapp").select("id").limit(1).execute()
    except Exception as error:  # noqa: BLE001
        if "contactos_whatsapp" in str(error) or "PGRST205" in str(error):
            raise ErrorEsquemaAusente(_INSTRUCCION_ESQUEMA) from error
        raise


# --------------------------------------------------------------------------
# Contactos y consentimiento
# --------------------------------------------------------------------------


def normalizar_telefono(telefono: Any) -> str:
    """Normaliza a E.164. Rechaza formatos ambiguos en vez de adivinarlos.

    Un número mal interpretado en un sistema de alarma es peor que no enviar:
    se limpia a formato internacional, pero un prefijo local sin país no se
    invierte porque podría terminar en el país equivocado.
    """
    if not isinstance(telefono, str):
        raise ErrorContactos("El teléfono debe ser texto")
    crudo = telefono.strip()
    if not crudo:
        raise ErrorContactos("El teléfono está vacío")

    tiene_signo = crudo.startswith("+")
    solo_digitos = re.sub(r"[^\d]", "", crudo)

    if tiene_signo:
        candidato = f"+{solo_digitos}"
    else:
        # Sin código de país no se puede resolver sin adivinar.
        if len(crudo) > 0 and crudo.startswith("57") and len(solo_digitos) >= 12:
            candidato = f"+{solo_digitos}"
        else:
            raise ErrorContactos(
                f"'{crudo}' no incluye código de país. Usa formato E.164, "
                "por ejemplo +573001234567"
            )

    if not _RE_E164.match(candidato):
        raise ErrorContactos(f"'{crudo}' no es un teléfono E.164 válido")
    return candidato


def _ahora() -> str:
    return datetime.now(timezone.utc).isoformat()


def registrar_contacto(
    telefono: str,
    nombre: str,
    consentimiento: str = "pendiente",
    metodo_consentimiento: str | None = None,
    texto_consentimiento: str | None = None,
    niveles: list[str] | None = None,
    tipo_destinatario: str = "persona",
    entidad: str | None = None,
) -> dict[str, Any]:
    """Registra un contacto. Otorgar consentimiento exige evidencia."""
    cliente = _require_supabase()
    normalizado = normalizar_telefono(telefono)

    if not isinstance(nombre, str) or not nombre.strip():
        raise ErrorContactos("El nombre es obligatorio")

    estado = (consentimiento or "pendiente").strip().lower()
    if estado not in {"pendiente", "otorgado", "revocado", "rechazado"}:
        raise ErrorContactos(f"Estado de consentimiento desconocido: {consentimiento}")

    if estado == "otorgado" and not metodo_consentimiento:
        # Sin método no se puede demostrar ante una auditoría de datos.
        raise ErrorConsentimiento("Otorgar consentimiento exige metodo_consentimiento")

    niveles_normalizados = [
        n.strip().upper() for n in (niveles or list(NIVELES_NOTIFICABLES))
    ]
    invalidos = [n for n in niveles_normalizados if n not in NIVELES_NOTIFICABLES]
    if invalidos:
        raise ErrorContactos(f"Niveles no válidos: {', '.join(invalidos)}")

    ahora = _ahora()
    registro = {
        "telefono": normalizado,
        "nombre": nombre.strip(),
        "tipo_destinatario": tipo_destinatario,
        "entidad": entidad,
        "consentimiento": estado,
        "metodo_consentimiento": metodo_consentimiento,
        "texto_consentimiento": texto_consentimiento,
        "consentimiento_otorgado_en": ahora if estado == "otorgado" else None,
        "niveles": niveles_normalizados,
        "updated_at": ahora,
    }

    _require_esquema(cliente)
    existente = (
        cliente.table("contactos_whatsapp")
        .select("id")
        .eq("telefono", normalizado)
        .execute()
    )
    if existente.data:
        (cliente.table("contactos_whatsapp").update(registro).eq("id", existente.data[0]["id"]).execute())
        return {"id": existente.data[0]["id"], "telefono": normalizado, "actualizado": True}

    nuevo = cliente.table("contactos_whatsapp").insert(registro).execute()
    if not nuevo.data:
        raise ErrorContactos("Supabase no devolvió el contacto registrado")
    return {"id": nuevo.data[0]["id"], "telefono": normalizado, "actualizado": False}


def revocar_consentimiento(telefono: str) -> bool:
    """Revoca el consentimiento. La persona deja de recibir mensajes de inmediato."""
    cliente = _require_supabase()
    _require_esquema(cliente)
    normalizado = normalizar_telefono(telefono)
    ahora = _ahora()
    resultado = (
        cliente.table("contactos_whatsapp")
        .update({
            "consentimiento": "revocado",
            "consentimiento_revocado_en": ahora,
            "recibe_alertas": False,
            "updated_at": ahora,
        })
        .eq("telefono", normalizado)
        .execute()
    )
    return bool(resultado.data)


def obtener_contactos_notificables(nivel: str) -> list[dict[str, Any]]:
    """Contactos que pueden recibir este nivel ahora mismo.

    Los filtros viven en SQL para no traer a memoria a toda la lista de
    Suspension cuando solo interesa un subconjunto.
    """
    cliente = _require_supabase()
    _require_esquema(cliente)
    nivel_normalizado = nivel.strip().upper()
    if nivel_normalizado not in NIVELES_NOTIFICABLES:
        return []

    # Los filtros de consentimiento y preferencia viven en SQL para no traer a
    # memoria toda la lista cuando solo interesa un subconjunto.
    respuesta = (
        cliente.table("contactos_whatsapp")
        .select("id, telefono, nombre, niveles, recibe_alertas, entidad, consentimiento_revocado_en")
        .eq("consentimiento", "otorgado")
        .eq("recibe_alertas", True)
        .execute()
    )
    ahora = _ahora()
    return [
        fila
        for fila in (respuesta.data or [])
        if nivel_normalizado in (fila.get("niveles") or [])
        and _vigente(fila, ahora)
    ]


def _vigente(contacto: Mapping[str, Any], ahora: str) -> bool:
    """Revocar despues de otorgar deja de notificar, aunque el estado no cambiara.

    Cualquier marca de revocacion excluye al contacto. Comparar contra `ahora`
    dejaria pasar justamente el caso habitual (revocar en el pasado), que es
    exactamente cuando la revocacion ya surte efecto.
    """
    if contacto.get("consentimiento_revocado_en"):
        return False
    return True


def esquema_disponible() -> bool:
    """Si la tabla ya existe, sin lanzar excepcion.

    Lo usa el diagnostico del canal: sin esto la UI solo puede avisar que faltan
    credenciales, cuando en realidad tampoco se puede guardar el numero.
    """
    try:
        _require_esquema(_require_supabase())
    except Exception:  # noqa: BLE001
        return False
    return True


def consultar_contacto(telefono: str) -> dict[str, Any] | None:
    """Estado de un número concreto, para mostrarlo en la configuración del perfil.

    Devuelve solo consentimiento y preferencias, nunca nombre ni entidad. Saber
    si un número está en la lista es información que la persona ya tiene; que
    otra persona la consulte adivinando números, no.
    """
    # Se valida antes de tocar la base: un teléfono mal escrito es un error del
    # usuario (422) y debe decirselo aunque el esquema todavia no este aplicado.
    normalizado = normalizar_telefono(telefono)
    cliente = _require_supabase()
    _require_esquema(cliente)
    respuesta = (
        cliente.table("contactos_whatsapp")
        .select("telefono, consentimiento, recibe_alertas, niveles, consentimiento_otorgado_en")
        .eq("telefono", normalizado)
        .execute()
    )
    filas = respuesta.data or []
    if not filas:
        return None
    return filas[0]
