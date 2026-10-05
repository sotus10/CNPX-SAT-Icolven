"""Fusión conservadora de mediciones del río y precipitación satelital."""

from datetime import datetime, timedelta, timezone
from math import isfinite
from statistics import median
from typing import Any, Mapping, Sequence


NIVELES = ("VERDE", "AMARILLO", "NARANJA", "ROJO")
_RANGO_NIVEL = {nivel: indice for indice, nivel in enumerate(NIVELES)}

# Límites de respaldo alineados con el firmware actual. Si cambian allí,
# deben actualizarse también aquí o, idealmente, leerse de configuracion_nodos.
_DISTANCIA_ROJO_CM = 30.0
_DISTANCIA_NARANJA_CM = 50.0
_DISTANCIA_AMARILLO_CM = 80.0
_VELOCIDAD_ALERTA_CM_MIN = 5.0

# Umbrales meteorológicos PROVISIONALES, no calibrados hidrológicamente para
# el río. Se usan solo para corroborar una subida medida por el sensor.
_LLUVIA_HORARIA_ALTA_MM = 10.0
_LLUVIA_24H_ALTA_MM = 30.0
_SUBIDA_MINIMA_CM_MIN = 1.0
_CAMBIO_MINIMO_DISTANCIA_CM = 2.0
_ANTIGUEDAD_SATELITE_MAX = timedelta(hours=2)
_ANTIGUEDAD_LECTURA_MAX = timedelta(hours=1)
_DESFASE_FUTURO_MAX = timedelta(minutes=5)


def _numero(valor: Any) -> float | None:
    if isinstance(valor, bool):
        return None
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return None
    return numero if isfinite(numero) else None


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


def _fresco(fecha: datetime | None, ahora: datetime, antiguedad_maxima: timedelta) -> bool:
    if fecha is None:
        return False
    edad = ahora - fecha
    return -_DESFASE_FUTURO_MAX <= edad <= antiguedad_maxima


def decidir_alerta(nivel: str) -> bool:
    """Compatibilidad: decide usando solo el nivel validado del firmware."""
    nivel_normalizado = nivel.strip().upper() if isinstance(nivel, str) else ""
    if nivel_normalizado not in _RANGO_NIVEL:
        raise ValueError(f"nivel inválido para decidir alerta: {nivel}")
    return nivel_normalizado != "VERDE"


def evaluar_alerta_fusionada(
    lectura_actual: Mapping[str, Any],
    lecturas_recientes: Sequence[Mapping[str, Any]] = (),
    datos_satelitales: Sequence[Mapping[str, Any]] = (),
    *,
    ahora: datetime | None = None,
) -> dict[str, Any]:
    """Evalúa lectura, tendencia reciente del río y precipitación reciente.

    La lluvia nunca cancela una alerta del sensor. Solo puede confirmar y subir
    un nivel cuando también hay evidencia independiente de que el río sube.
    Una medición satelital ausente/vieja no se interpreta como lluvia cero.
    """
    nivel_sensor = lectura_actual.get("nivel")
    if not isinstance(nivel_sensor, str):
        raise ValueError("La lectura actual no contiene un nivel válido")
    nivel_sensor = nivel_sensor.strip().upper()
    if nivel_sensor not in _RANGO_NIVEL:
        raise ValueError(f"nivel inválido para decidir alerta: {nivel_sensor}")

    instante = ahora or datetime.now(timezone.utc)
    if instante.tzinfo is None:
        instante = instante.replace(tzinfo=timezone.utc)
    instante = instante.astimezone(timezone.utc)

    motivos: list[str] = [f"Nivel informado por sensor: {nivel_sensor}."]
    distancia = _numero(lectura_actual.get("distancia_cm"))
    velocidad = _numero(lectura_actual.get("velocidad_cm_min"))

    # Si el nivel textual contradice una distancia crítica, prevalece el riesgo.
    nivel_por_distancia: str | None = None
    if distancia is not None:
        if distancia <= _DISTANCIA_ROJO_CM:
            nivel_por_distancia = "ROJO"
        elif distancia <= _DISTANCIA_NARANJA_CM:
            nivel_por_distancia = "NARANJA"
        elif distancia <= _DISTANCIA_AMARILLO_CM:
            nivel_por_distancia = "AMARILLO"

    rango_sensor = _RANGO_NIVEL[nivel_sensor]
    if nivel_por_distancia and _RANGO_NIVEL[nivel_por_distancia] > rango_sensor:
        motivos.append(
            f"Distancia de {distancia:.1f} cm contradice el nivel recibido; "
            f"se eleva al menos a {nivel_por_distancia}."
        )
        rango_sensor = _RANGO_NIVEL[nivel_por_distancia]
    if velocidad is not None and velocidad >= _VELOCIDAD_ALERTA_CM_MIN:
        if rango_sensor < _RANGO_NIVEL["AMARILLO"]:
            rango_sensor = _RANGO_NIVEL["AMARILLO"]
        motivos.append(f"Velocidad ascendente alta: {velocidad:.2f} cm/min.")

    # La tendencia requiere una lectura anterior reciente y descenso de distancia.
    distancias_previas: list[float] = []
    id_actual = lectura_actual.get("id")
    for lectura in lecturas_recientes:
        if id_actual is not None and lectura.get("id") == id_actual:
            continue
        fecha = _fecha_utc(lectura.get("timestamp"))
        distancia_previa = _numero(lectura.get("distancia_cm"))
        if _fresco(fecha, instante, _ANTIGUEDAD_LECTURA_MAX) and distancia_previa is not None:
            distancias_previas.append(distancia_previa)

    tendencia_subida = False
    if distancia is not None and distancias_previas:
        referencia = median(distancias_previas[-3:])
        descenso_distancia = referencia - distancia
        tendencia_subida = (
            descenso_distancia >= _CAMBIO_MINIMO_DISTANCIA_CM
            and velocidad is not None
            and velocidad >= _SUBIDA_MINIMA_CM_MIN
        )
        if tendencia_subida:
            motivos.append(
                f"Tendencia de subida corroborada: distancia bajó "
                f"{descenso_distancia:.1f} cm y velocidad es positiva."
            )

    # Se selecciona el registro meteorológico vigente más reciente.
    satelite_vigente: Mapping[str, Any] | None = None
    fecha_satelite_mas_nueva: datetime | None = None
    for registro in datos_satelitales:
        fecha = _fecha_utc(registro.get("timestamp"))
        if not _fresco(fecha, instante, _ANTIGUEDAD_SATELITE_MAX):
            continue
        if fecha_satelite_mas_nueva is None or fecha > fecha_satelite_mas_nueva:
            satelite_vigente = registro
            fecha_satelite_mas_nueva = fecha

    lluvia_horaria = _numero(
        satelite_vigente.get("precipitacion") if satelite_vigente else None
    )
    lluvia_24h = _numero(
        satelite_vigente.get("lluvia_acumulada_24h") if satelite_vigente else None
    )
    lluvia_intensa = bool(
        (lluvia_horaria is not None and lluvia_horaria >= _LLUVIA_HORARIA_ALTA_MM)
        or (lluvia_24h is not None and lluvia_24h >= _LLUVIA_24H_ALTA_MM)
    )
    if satelite_vigente is None:
        motivos.append("No hay dato satelital vigente; no se interpreta como ausencia de lluvia.")
    elif lluvia_intensa:
        motivos.append(
            "Lluvia alta en dato satelital vigente "
            f"(última hora={lluvia_horaria}, acumulado 24 h={lluvia_24h} mm)."
        )
    else:
        motivos.append("El dato satelital vigente no supera los umbrales provisionales de lluvia.")

    confirmada_por_satelite = lluvia_intensa and tendencia_subida
    nivel_final = NIVELES[rango_sensor]
    if confirmada_por_satelite:
        # La lluvia sola no crea una alerta: se exige también tendencia del río.
        rango_final = min(rango_sensor + 1, _RANGO_NIVEL["ROJO"])
        nivel_final = NIVELES[rango_final]
        motivos.append(f"Lluvia y subida del río coinciden; nivel elevado a {nivel_final}.")
    elif lluvia_intensa and not tendencia_subida:
        motivos.append("Lluvia alta sin subida medida: contexto preventivo, no alerta fluvial.")

    return {
        "crear_alerta": nivel_final != "VERDE",
        "nivel_sensor": nivel_sensor,
        "nivel_final": nivel_final,
        "confirmada_por_satelite": confirmada_por_satelite,
        "lluvia_intensa": lluvia_intensa,
        "tendencia_subida": tendencia_subida,
        "timestamp_satelital": (
            fecha_satelite_mas_nueva.isoformat() if fecha_satelite_mas_nueva else None
        ),
        "motivos": motivos,
    }