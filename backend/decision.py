def decidir_alerta(nivel: str) -> bool:
    """Indica si el nivel informado por el firmware requiere registrar alerta."""
    if nivel not in {"VERDE", "AMARILLO", "NARANJA", "ROJO"}:
        raise ValueError(f"nivel inválido para decidir alerta: {nivel}")
    return nivel != "VERDE"