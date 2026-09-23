from crud import (
    insertar_lectura,
    obtener_ultimas_lecturas,
    insertar_alerta,
    obtener_datos_satelitales_recientes
)

if __name__ == "__main__":
    print("--- PROBANDO CRUD DE SUPABASE ---")
    
    # Usamos un ID de nodo real que ya existe en tu base de datos
    nodo_real_id = "02c04a53-220c-4a10-b05e-1e24878eedd4"
    
    # 1. Insertar una lectura de prueba (Nivel cambiado a 'AMARILLO' por el CHECK de la base de datos)
    lectura_resultado = insertar_lectura(nodo_real_id, 45.2, 3.1, "AMARILLO")
    
    print("Últimas lecturas:", obtener_ultimas_lecturas(3))
    
    # 2. Si la lectura se insertó con éxito, usamos su ID real para la alerta
    if lectura_resultado and len(lectura_resultado) > 0:
        lectura_id = lectura_resultado[0].get("id")
        # Nivel de alerta en mayúsculas ('NARANJA') para cumplir con la restricción
        insertar_alerta(lectura_id, "NARANJA", True)
    else:
        print("[AVISO] No se pudo obtener el ID de la lectura para registrar la alerta.")
        
    print("Datos satelitales:", obtener_datos_satelitales_recientes())
    print("--- PRUEBAS TERMINADAS ---")