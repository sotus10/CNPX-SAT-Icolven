"""
Pruebas manuales de limpieza.py (mismo estilo que test_crud.py).
Ejecutar con:  python test_limpieza.py
"""

from limpieza import limpiar_lectura

fallos = 0


def lectura_valida(**cambios) -> dict:
    """Lectura correcta de base; cada prueba cambia solo lo que quiere probar."""
    datos = {
        "nodo": "nodo-1",
        "distancia_cm": 120.0,
        "velocidad_cm_min": 1.5,
        "nivel": "VERDE",
    }
    datos.update(cambios)
    return datos


def debe_pasar(descripcion: str, datos: dict, esperado: dict = None) -> None:
    global fallos
    try:
        resultado = limpiar_lectura(datos)
    except ValueError as e:
        print(f"[FALLO] {descripcion}: lanzó error inesperado: {e}")
        fallos += 1
        return
    if esperado is not None and resultado != esperado:
        print(f"[FALLO] {descripcion}: se esperaba {esperado} y salió {resultado}")
        fallos += 1
        return
    print(f"[OK] {descripcion}")


def debe_fallar(descripcion: str, datos: dict, mencion: str) -> None:
    global fallos
    try:
        limpiar_lectura(datos)
    except ValueError as e:
        if mencion in str(e):
            print(f"[OK] {descripcion}: {e}")
        else:
            print(f"[FALLO] {descripcion}: el error no menciona '{mencion}': {e}")
            fallos += 1
        return
    print(f"[FALLO] {descripcion}: debió lanzar un error y no lo hizo")
    fallos += 1


# --- Los 6 casos mínimos del Paso 5 ---
debe_pasar("1. Lectura 100% válida", lectura_valida())
debe_fallar("2. distancia_cm fuera de rango", lectura_valida(distancia_cm=500), "distancia_cm")
debe_fallar("3. nivel inválido", lectura_valida(nivel="AZUL"), "nivel")
debe_fallar("4. velocidad absurda", lectura_valida(velocidad_cm_min=9999), "velocidad_cm_min")
debe_fallar("5. nodo vacío", lectura_valida(nodo=""), "nodo")
debe_pasar(
    "6. nivel en minúscula se normaliza",
    lectura_valida(nivel="naranja"),
    esperado=lectura_valida(nivel="NARANJA"),
)

# --- Casos extra (bordes y datos corruptos) ---
debe_fallar("7. nodo solo espacios", lectura_valida(nodo="   "), "nodo")
debe_fallar("8. distancia NaN", lectura_valida(distancia_cm=float("nan")), "distancia_cm")
debe_fallar("9. distancia infinita", lectura_valida(distancia_cm=float("inf")), "distancia_cm")
debe_fallar("10. distancia como texto", lectura_valida(distancia_cm="120"), "distancia_cm")
debe_fallar("11. distancia None", lectura_valida(distancia_cm=None), "distancia_cm")
debe_fallar("12. distancia bajo el mínimo", lectura_valida(distancia_cm=1), "distancia_cm")
debe_pasar("13. distancia en el límite inferior", lectura_valida(distancia_cm=2))
debe_pasar("14. distancia en el límite superior", lectura_valida(distancia_cm=450))
debe_fallar("15. falta un campo", {"nodo": "nodo-1", "distancia_cm": 100}, "Faltan campos")
debe_fallar("16. entrada que no es diccionario", "hola", "diccionario")
debe_pasar(
    "17. redondeo",
    lectura_valida(distancia_cm=120.456, velocidad_cm_min=1.2345),
    esperado=lectura_valida(distancia_cm=120.5, velocidad_cm_min=1.23),
)
debe_pasar(
    "18. espacios alrededor del nodo y del nivel",
    lectura_valida(nodo="  nodo-1  ", nivel=" rojo "),
    esperado=lectura_valida(nodo="nodo-1", nivel="ROJO"),
)

# El diccionario original no debe modificarse
original = lectura_valida(nivel="naranja")
limpiar_lectura(original)
if original["nivel"] == "naranja":
    print("[OK] 19. No modifica el diccionario original")
else:
    print("[FALLO] 19. Modificó el diccionario original")
    fallos += 1

print()
print("Todas las pruebas pasaron." if fallos == 0 else f"{fallos} prueba(s) fallaron.")
