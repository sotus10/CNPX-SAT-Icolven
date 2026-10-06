import math
from typing import Any
import os
VELOCIDAD_MAX_CM_MIN = float(os.getenv("VELOCIDAD_MAX_CM_MIN", "50"))

NIVELES_VALIDOS = ("VERDE", "AMARILLO", "NARANJA", "ROJO")


def validar_nodo(nodo_id: Any) -> str:
    if not isinstance(nodo_id, str) or not nodo_id.strip():
        raise ValueError("nodo_id debe ser texto no vacío")
    return nodo_id.strip()


def validar_numero(valor: Any, minimo: float, maximo: float, nombre_campo: str) -> float:
    if isinstance(valor, bool):
        raise ValueError(f"{nombre_campo} debe ser numérico")
    try:
        numero = float(valor)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{nombre_campo} debe ser numérico") from error
    if not math.isfinite(numero) or not minimo <= numero <= maximo:
        raise ValueError(
            f"{nombre_campo} fuera de rango: {valor} "
            f"(debe estar entre {minimo} y {maximo})"
        )
    return numero


def validar_nivel(nivel: Any) -> str:
    if not isinstance(nivel, str):
        raise ValueError("nivel debe ser texto")
    nivel_normalizado = nivel.strip().upper()
    if nivel_normalizado not in NIVELES_VALIDOS:
        raise ValueError(f"nivel inválido: {nivel}")
    return nivel_normalizado


def limpiar_lectura(datos: Any) -> dict[str, Any]:
    """Valida y normaliza los campos procesables de un mensaje del receptor."""
    if not isinstance(datos, dict):
        raise ValueError("El cuerpo de la lectura debe ser un objeto JSON")

    return {
        "nodo_id": validar_nodo(datos.get("nodo_id")),
        "distancia_cm": round(validar_numero(
            datos.get("distancia_cm"), 2, 450, "distancia_cm"
        ), 1),
        "velocidad_cm_min": round(validar_numero(
            datos.get("velocidad_cm_min"), -50, 50, "velocidad_cm_min"
        ), 2),
        "nivel": validar_nivel(datos.get("nivel")),
    }