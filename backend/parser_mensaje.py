def parsear_mensaje(texto: str) -> dict:
    """
    Parsea un texto plano separado por comas con el formato:
    NODO_ID,NIVEL,DISTANCIA_CM,VELOCIDAD_CM_MIN
    Ejemplo: "NODO_01,AMARILLO,145.2,6.5"
    """
    if not texto or not isinstance(texto, str):
        raise ValueError("El mensaje recibido está vacío o no es una cadena de texto.")

    partes = [p.strip() for p in texto.split(",")]
    if len(partes) != 4:
        raise ValueError(
            f"Formato por comas inválido. Se esperaban 4 campos (NODO_ID,NIVEL,DISTANCIA_CM,VELOCIDAD_CM_MIN) "
            f"pero se recibieron {len(partes)}: '{texto}'"
        )

    return {
        "nodo_id": partes[0],
        "nivel": partes[1],
        "distancia_cm": partes[2],
        "velocidad_cm_min": partes[3],
    }