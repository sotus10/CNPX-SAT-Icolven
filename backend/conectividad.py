"""Regla de disponibilidad de los nodos transmisores.

El estado se deriva del silencio del nodo: una lectura limpia reciente significa
que el enlace LoRa/WiFi sigue entregando datos. No se infiere salud de la batería
ni del RSSI porque el backend no los recibe.
"""

from datetime import datetime, timezone
from typing import Any, Mapping

ONLINE = "online"
RETRASO = "retraso"
OFFLINE = "offline"

ESTADOS = (ONLINE, RETRASO, OFFLINE)

# Ventanas de la regla de negocio definida en la especificación de gráficas.
MINUTOS_ONLINE = 10.0
MINUTOS_RETRASO = 20.0

# Un desfase hacia el futuro se trata como reloj desincronizado, no como
# "recién leído": se penaliza igual que un silencio prolongado.
DESFASE_FUTURO_TOLERADO_MIN = 5.0


def _fecha_utc(valor: Any) -> datetime | None:
    if isinstance(valor, datetime):
        fecha = valor
    elif isinstance(valor, str):
        try:
            fecha = datetime.fromisoformat(valor.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(timezone.utc)


def estado_conectividad(
    ultima_lectura: Any,
    *,
    ahora: datetime | None = None,
) -> dict[str, Any]:
    """Clasifica un nodo según los minutos transcurridos desde su última lectura."""
    instante = ahora or datetime.now(timezone.utc)
    if instante.tzinfo is None:
        instante = instante.replace(tzinfo=timezone.utc)
    instante = instante.astimezone(timezone.utc)

    fecha = _fecha_utc(ultima_lectura)
    if fecha is None:
        return {
            "estado": OFFLINE,
            "minutos_sin_lectura": None,
            "ultima_lectura": None,
            "detalle": "El nodo nunca ha enviado una lectura válida.",
        }

    minutos = (instante - fecha).total_seconds() / 60.0
    if minutos < -DESFASE_FUTURO_TOLERADO_MIN:
        estado = OFFLINE
        detalle = "La última lectura tiene una fecha futura: reloj desincronizado."
    elif minutos <= MINUTOS_ONLINE:
        estado = ONLINE
        detalle = "Enlace LoRa/WiFi entregado datos dentro de la ventana esperada."
    elif minutos <= MINUTOS_RETRASO:
        estado = RETRASO
        detalle = "El nodo se pasó del intervalo normal de medición."
    else:
        estado = OFFLINE
        detalle = "No hay lecturas recientes: el enlace se considera caído."

    return {
        "estado": estado,
        "minutos_sin_lectura": round(minutos, 1),
        "ultima_lectura": fecha.isoformat(),
        "detalle": detalle,
    }


def evaluar_nodos(
    nodos: list[Mapping[str, Any]],
    lecturas_recientes: list[Mapping[str, Any]],
    *,
    ahora: datetime | None = None,
) -> list[dict[str, Any]]:
    """Cruza el padrón de nodos con su última lectura y devuelve el estado de cada uno."""
    ultima_por_nodo: dict[str, Mapping[str, Any]] = {}
    for lectura in lecturas_recientes:
        nodo_id = lectura.get("nodo_id")
        if isinstance(nodo_id, str) and nodo_id not in ultima_por_nodo:
            ultima_por_nodo[nodo_id] = lectura

    evaluados: list[dict[str, Any]] = []
    for nodo in nodos:
        nodo_id = nodo.get("id")
        ultima = ultima_por_nodo.get(nodo_id) if isinstance(nodo_id, str) else None
        conectividad = estado_conectividad(
            ultima.get("timestamp") if ultima else None, ahora=ahora
        )
        evaluados.append(
            {
                "id": nodo_id,
                "nombre": nodo.get("nombre"),
                "ubicacion": nodo.get("ubicacion"),
                "estado_operativo": nodo.get("estado"),
                "conectividad": conectividad["estado"],
                "minutos_sin_lectura": conectividad["minutos_sin_lectura"],
                "ultima_lectura": conectividad["ultima_lectura"],
                "detalle": conectividad["detalle"],
                "distancia_cm": ultima.get("distancia_cm") if ultima else None,
                "velocidad_cm_min": ultima.get("velocidad_cm_min") if ultima else None,
                "nivel": ultima.get("nivel") if ultima else None,
            }
        )
    return evaluados