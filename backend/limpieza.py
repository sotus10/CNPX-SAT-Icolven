"""
limpieza.py
 
Filtro entre lo que llega del nodo receptor y lo que se guarda en la base de datos.
Nada debe llegar a crud.insertar_lectura() sin pasar antes por limpiar_lectura().
 
Uso desde main.py:
    from limpieza import limpiar_lectura
 
    try:
        datos = limpiar_lectura(datos_crudos)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
"""
 
import math
 
# --- Reglas (mismos límites que el firmware del transmisor) ---
DISTANCIA_MIN_VALIDA_CM = 2
DISTANCIA_MAX_VALIDA_CM = 450
 
# A ajustar con el equipo si hace falta.
VELOCIDAD_MIN_CM_MIN = -50
VELOCIDAD_MAX_CM_MIN = 50
 
NIVELES_VALIDOS = ("VERDE", "AMARILLO", "NARANJA", "ROJO")
 
CAMPOS_OBLIGATORIOS = ("nodo", "distancia_cm", "velocidad_cm_min", "nivel")
 
 
# --- Validaciones (una por regla) ---
 
def validar_numero(valor, nombre_campo: str) -> None:
    """Revisa que sea un número real: no texto, no None, no bool, no NaN ni infinito."""
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ValueError(
            f"{nombre_campo} debe ser un número, se recibió {valor!r} ({type(valor).__name__})"
        )
    # NaN pasaría cualquier comparación de rango sin error, por eso se revisa aparte.
    if not math.isfinite(valor):
        raise ValueError(f"{nombre_campo} no es un número válido: {valor}")
 
 
def validar_rango(valor: float, minimo: float, maximo: float, nombre_campo: str) -> None:
    """No devuelve nada si todo está bien; si no, lanza ValueError con el detalle."""
    validar_numero(valor, nombre_campo)
    if valor < minimo or valor > maximo:
        raise ValueError(
            f"{nombre_campo} fuera de rango: {valor} (debe estar entre {minimo} y {maximo})"
        )
 
 
def validar_nivel(nivel: str) -> None:
    if nivel not in NIVELES_VALIDOS:
        raise ValueError(
            f"nivel inválido: {nivel!r} (debe ser uno de {', '.join(NIVELES_VALIDOS)})"
        )
 
 
def validar_texto_no_vacio(texto: str, nombre_campo: str) -> None:
    if not isinstance(texto, str):
        raise ValueError(
            f"{nombre_campo} debe ser texto, se recibió {texto!r} ({type(texto).__name__})"
        )
    if not texto.strip():
        raise ValueError(f"{nombre_campo} no puede estar vacío")
 
 
# --- Función central ---
 
def limpiar_lectura(datos: dict) -> dict:
    """
    Recibe el diccionario crudo con las claves:
        nodo, distancia_cm, velocidad_cm_min, nivel
 
    Devuelve un diccionario NUEVO, limpio y normalizado (no modifica el original).
    Lanza ValueError con un mensaje claro si algo está mal.
    """
    if not isinstance(datos, dict):
        raise ValueError(f"Se esperaba un diccionario, se recibió {type(datos).__name__}")
 
    faltantes = [c for c in CAMPOS_OBLIGATORIOS if c not in datos]
    if faltantes:
        raise ValueError(f"Faltan campos obligatorios: {', '.join(faltantes)}")
 
    # 1. Normalizar primero (solo lo que se puede corregir sin perder información)
    nodo = datos["nodo"]
    if isinstance(nodo, str):
        nodo = nodo.strip()
 
    nivel = datos["nivel"]
    if isinstance(nivel, str):
        nivel = nivel.strip().upper()
 
    distancia = datos["distancia_cm"]
    velocidad = datos["velocidad_cm_min"]
 
    # 2. Validar (si una falla, raise detiene todo aquí)
    validar_texto_no_vacio(nodo, "nodo")
    validar_rango(distancia, DISTANCIA_MIN_VALIDA_CM, DISTANCIA_MAX_VALIDA_CM, "distancia_cm")
    validar_rango(velocidad, VELOCIDAD_MIN_CM_MIN, VELOCIDAD_MAX_CM_MIN, "velocidad_cm_min")
    validar_nivel(nivel)
 
    # 3. Redondear después de validar (para no ocultar un valor límite mal redondeado)
    return {
        "nodo": nodo,
        "distancia_cm": round(distancia, 1),
        "velocidad_cm_min": round(velocidad, 2),
        "nivel": nivel,
    }
 