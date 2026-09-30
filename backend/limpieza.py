"""
limpieza.py

Filtro entre lo que llega del nodo receptor y lo que se guarda en la base de datos.
Nada debe llegar a crud.insertar_lectura() sin pasar antes por limpiar_lectura().
"""

import math
from typing import Any

NIVELES_VALIDOS = ("VERDE", "AMARILLO", "NARANJA", "ROJO")

DISTANCIA_MIN_VALIDA_CM = 2
DISTANCIA_MAX_VALIDA_CM = 450
VELOCIDAD_MIN_CM_MIN = -50
VELOCIDAD_MAX_CM_MIN = 50


def validar_nodo(nodo_id: Any) -> str:
    if not isinstance(nodo_id, str) or not nodo_id.strip():
        raise ValueError("nodo_id debe ser texto no vacío")
    return nodo_id.strip()


def validar_numero(valor: Any, minimo: float, maximo: float, nombre_campo: str) -> float:
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError(f"{nombre_campo} debe ser un número")

    if not math.isfinite(valor):
        raise ValueError(f"{nombre_campo} no es un número válido: {valor}")

    if valor < minimo or valor > maximo:
        raise ValueError(
            f"{nombre_campo} fuera de rango: {valor} "
            f"(debe estar entre {minimo} y {maximo})"
        )

    return valor


def validar_nivel(nivel: Any) -> str:
    if not isinstance(nivel, str):
        raise ValueError("nivel debe ser texto")

    nivel_normalizado = nivel.strip().upper()

    if nivel_normalizado not in NIVELES_VALIDOS:
        raise ValueError(f"nivel inválido: {nivel}")

    return nivel_normalizado


def _obtener_nodo_id(datos: dict[str, Any]) -> Any:
    if "nodo_id" in datos:
        return datos["nodo_id"]
    if "nodo" in datos:
        return datos["nodo"]
    return None


def limpiar_lectura(datos: Any) -> dict[str, Any]:
    """Valida y normaliza los campos procesables de un mensaje del receptor."""
    if not isinstance(datos, dict):
        raise ValueError("El cuerpo de la lectura debe ser un objeto JSON")

    nodo_id = _obtener_nodo_id(datos)
    if nodo_id is None:
        raise ValueError("Faltan campos obligatorios: nodo_id")

    distancia = datos.get("distancia_cm")
    velocidad = datos.get("velocidad_cm_min")
    nivel = datos.get("nivel")

    if distancia is None:
        raise ValueError("Faltan campos obligatorios: distancia_cm")
    if velocidad is None:
        raise ValueError("Faltan campos obligatorios: velocidad_cm_min")
    if nivel is None:
        raise ValueError("Faltan campos obligatorios: nivel")

    return {
        "nodo_id": validar_nodo(nodo_id),
        "distancia_cm": round(
            validar_numero(
                distancia,
                DISTANCIA_MIN_VALIDA_CM,
                DISTANCIA_MAX_VALIDA_CM,
                "distancia_cm",
            ),
            1,
        ),
        "velocidad_cm_min": round(
            validar_numero(
                velocidad,
                VELOCIDAD_MIN_CM_MIN,
                VELOCIDAD_MAX_CM_MIN,
                "velocidad_cm_min",
            ),
            2,
        ),
        "nivel": validar_nivel(nivel),
    }
