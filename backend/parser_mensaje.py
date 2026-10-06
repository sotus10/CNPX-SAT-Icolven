def parsear_mensaje(texto: str) -> dict:
    """
    Interpreta la trama CSV del transmisor en el dict que espera `limpiar_lectura`.

    Formato esperado: NODO_ID,NIVEL,DISTANCIA_CM,VELOCIDAD_CM_MIN
    """
    if not isinstance(texto, str):
        raise ValueError("La trama debe ser texto")

    linea = texto.strip().replace("\r", "").replace("\n", "")
    if not linea:
        raise ValueError("La trama está vacía")

    partes = [parte.strip() for parte in linea.split(",")]
    if len(partes) != 4:
        raise ValueError(
            f"La trama debe tener 4 campos separados por comas (NODO_ID,NIVEL,DISTANCIA_CM,VELOCIDAD_CM_MIN) y recibió {len(partes)}"
        )

    try:
        distancia = float(partes[2])
    except ValueError as error:
        raise ValueError(f"distancia_cm no es numérico: {partes[2]!r}") from error
    try:
        velocidad = float(partes[3])
    except ValueError as error:
        raise ValueError(f"velocidad_cm_min no es numérico: {partes[3]!r}") from error

    return {
        "nodo_id": partes[0],
        "nivel": partes[1],
        "distancia_cm": distancia,
        "velocidad_cm_min": velocidad,
    }
