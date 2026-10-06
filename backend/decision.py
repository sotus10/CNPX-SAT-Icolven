"""
decision.py — Motor de decisión del SAT (sensor + satélite).

Combina el nivel que reporta el sensor del río con la lluvia que reporta el
satélite (Open-Meteo) para producir el nivel FINAL que se guarda en la tabla
`alertas` y que muestran el dashboard y la página pública.

REGLAS (en orden de importancia)
  1. NUNCA se baja un nivel ni se descarta una alerta del sensor. Si el sensor
     dice ROJO, el resultado es ROJO aunque no haya lluvia: preferimos una
     falsa alarma a ignorar una creciente real.
  2. Sensor en alerta (AMARILLO/NARANJA/ROJO) + lluvia satelital que lo
     respalda  -> confirmada_por_satelite = True.
  3. Sensor en alerta SIN lluvia que lo respalde (o sin datos del satélite)
     -> confirmada_por_satelite = False. En la práctica es una alerta
        "sospechosa": se conserva y se muestra, pero marcada como no confirmada
        (puede ser un sensor defectuoso, o lluvia lejana en la cuenca alta).
  4. Escalamiento preventivo: AMARILLO o NARANJA + lluvia FUERTE confirmada +
     el río subiendo rápido -> se sube UN nivel (AMARILLO->NARANJA,
     NARANJA->ROJO). Se desactiva con ESCALAR_CON_LLUVIA_FUERTE = False.
  5. VERDE: no hay alerta; confirmada_por_satelite siempre False.

IMPORTANTE: la sirena y el buzzer del nodo receptor obedecen al nivel que manda
el firmware por LoRa, NO a este módulo. Así la alarma física funciona aunque el
backend o internet fallen. Este módulo solo decide el nivel "oficial" que se
registra y se publica.

Este archivo no hace entrada/salida (ni red ni base de datos): recibe datos y
devuelve un resultado, por eso es fácil de probar (ver test_decision.py).
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

NIVELES = ("VERDE", "AMARILLO", "NARANJA", "ROJO")

# --- Umbrales de lluvia (ajustables con el equipo) --------------------------
UMBRAL_LLUVIA_HORA_MM = 0.5     # mm en la última hora que ya cuentan como lluvia
UMBRAL_LLUVIA_24H_MM = 5.0      # mm acumulados en 24 h que ya cuentan como lluvia
LLUVIA_FUERTE_HORA_MM = 5.0     # mm/h considerada lluvia fuerte
LLUVIA_FUERTE_24H_MM = 20.0     # mm en 24 h considerada lluvia fuerte

# --- Escalamiento preventivo -------------------------------------------------
ESCALAR_CON_LLUVIA_FUERTE = True
VELOCIDAD_ESCALAMIENTO_CM_MIN = 5.0   # igual a VELOCIDAD_PELIGROSA_CM_MIN del firmware

# --- Vigencia del dato satelital ---------------------------------------------
MAX_EDAD_SATELITE_MIN = 90


def _numero(valor: Any) -> Optional[float]:
    """Convierte a float; devuelve None si es None, vacío o no numérico."""
    if valor is None or isinstance(valor, bool):
        return None
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return None
    return numero if numero == numero and abs(numero) != float("inf") else None


def _lluvia(datos_satelite: Optional[dict]) -> tuple[Optional[float], Optional[float]]:
    """Devuelve (mm última hora, mm acumulados 24 h). Acepta las claves de la
    tabla datos_satelitales y las de clima.obtener_clima()."""
    if not isinstance(datos_satelite, dict):
        return None, None
    hora = _numero(datos_satelite.get("precipitacion", datos_satelite.get("lluvia_ultima_hora")))
    dia = _numero(datos_satelite.get("lluvia_acumulada_24h"))
    return hora, dia


def hay_datos_satelitales(datos_satelite: Optional[dict]) -> bool:
    hora, dia = _lluvia(datos_satelite)
    return hora is not None or dia is not None


def lluvia_confirma(datos_satelite: Optional[dict]) -> bool:
    """True si el satélite reporta lluvia suficiente para respaldar una alerta."""
    hora, dia = _lluvia(datos_satelite)
    return (hora or 0.0) >= UMBRAL_LLUVIA_HORA_MM or (dia or 0.0) >= UMBRAL_LLUVIA_24H_MM


def lluvia_fuerte(datos_satelite: Optional[dict]) -> bool:
    hora, dia = _lluvia(datos_satelite)
    return (hora or 0.0) >= LLUVIA_FUERTE_HORA_MM or (dia or 0.0) >= LLUVIA_FUERTE_24H_MM


def requiere_alerta(nivel: str) -> bool:
    """True si el nivel reportado por el sensor debe generar un registro en `alertas`."""
    if nivel not in NIVELES:
        raise ValueError(f"nivel inválido: {nivel}")
    return nivel != "VERDE"


def satelite_vigente(
    datos_satelite: Optional[dict],
    ahora: Optional[datetime] = None,
    max_edad_min: int = MAX_EDAD_SATELITE_MIN,
) -> bool:
    """True si el dato satelital existe, tiene lluvia y no es más viejo que max_edad_min.
    Si no trae `timestamp` se considera vigente (acabamos de consultarlo)."""
    if not hay_datos_satelitales(datos_satelite):
        return False
    marca = datos_satelite.get("timestamp")
    if marca is None:
        return True
    # Python 3.10 (el del Dockerfile) solo acepta 3 o 6 decimales en los segundos,
    # y Postgres a veces devuelve 5; se rellenan a 6 para que no falle.
    texto = re.sub(r"\.(\d{1,6})\d*", lambda m: "." + m.group(1).ljust(6, "0"), str(marca).replace("Z", "+00:00"))
    try:
        momento = datetime.fromisoformat(texto)
    except ValueError:
        return False
    if momento.tzinfo is None:
        momento = momento.replace(tzinfo=timezone.utc)
    ahora = ahora or datetime.now(timezone.utc)
    return ahora - momento <= timedelta(minutes=max_edad_min)


def decidir_alerta(lectura: dict, datos_satelite: Optional[dict] = None) -> tuple[str, bool]:
    """
    Devuelve (nivel_final, confirmada_por_satelite).

    lectura        dict ya limpio (salida de limpiar_lectura): requiere "nivel";
                   usa "velocidad_cm_min" si viene.
    datos_satelite dict con "precipitacion" (mm/h) y/o "lluvia_acumulada_24h" (mm),
                   o None si no hay datos (el satélite falló o no hay registro).
    """
    nivel = lectura.get("nivel") if isinstance(lectura, dict) else None
    if nivel not in NIVELES:
        raise ValueError(f"nivel inválido para decidir alerta: {nivel}")

    if nivel == "VERDE":
        return "VERDE", False

    confirmada = lluvia_confirma(datos_satelite)
    nivel_final = nivel

    velocidad = _numero(lectura.get("velocidad_cm_min")) or 0.0
    if (
        ESCALAR_CON_LLUVIA_FUERTE
        and nivel in ("AMARILLO", "NARANJA")
        and lluvia_fuerte(datos_satelite)
        and velocidad >= VELOCIDAD_ESCALAMIENTO_CM_MIN
    ):
        nivel_final = NIVELES[NIVELES.index(nivel) + 1]

    return nivel_final, confirmada