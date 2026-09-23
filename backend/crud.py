import os
from supabase_client import supabase

def asegurar_nodo_existe(nodo_id: str):
    """Verifica si el nodo existe; si no, lo inserta para evitar errores de llave foránea."""
    if not supabase:
        return
    try:
        # Verificar si ya existe
        res = supabase.table("nodos").select("id").eq("id", nodo_id).execute()
        if not res.data:
            # Si no existe, lo creamos
            nodo_data = {
                "id": nodo_id,
                "nombre": "Nodo de Prueba Automatizada",
                "ubicacion": "Medellin / Icolven",
                "estado": "Activo"
            }
            supabase.table("nodos").insert(nodo_data).execute()
            print(f"[OK] Nodo {nodo_id} creado automáticamente.")
    except Exception as e:
        print(f"[AVISO] No se pudo verificar/crear el nodo: {e}")

def insertar_lectura(nodo_id: str, distancia_cm: float, velocidad_cm_min: float, nivel: str):
    if not supabase:
        print("[ERROR] Supabase no está disponible.")
        return None
    
    # Asegurar que el nodo exista antes de insertar la lectura
    asegurar_nodo_existe(nodo_id)

    registro = {
        "nodo_id": nodo_id,
        "distancia_cm": distancia_cm,
        "velocidad_cm_min": velocidad_cm_min,
        "nivel": nivel
    }
    try:
        respuesta = supabase.table("lecturas").insert(registro).execute()
        print("[OK] Lectura insertada:", respuesta.data)
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Falló la inserción de lectura: {e}")
        return None

def obtener_ultimas_lecturas(limite: int = 5):
    if not supabase:
        return []
    try:
        respuesta = supabase.table("lecturas").select("*").order("timestamp", desc=True).limit(limite).execute()
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Error al consultar lecturas: {e}")
        return []

def insertar_alerta(lectura_id: str, nivel_final: str, confirmada_por_satelite: bool):
    if not supabase:
        return None
    alerta = {
        "lectura_id": lectura_id,
        "nivel_final": nivel_final,
        "confirmada_por_satelite": confirmada_por_satelite
    }
    try:
        respuesta = supabase.table("alertas").insert(alerta).execute()
        print("[OK] Alerta registrada:", respuesta.data)
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Error al insertar alerta: {e}")
        return None

def obtener_datos_satelitales_recientes():
    if not supabase:
        return []
    try:
        respuesta = supabase.table("datos_satelitales").select("*").order("timestamp", desc=True).limit(5).execute()
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Error al consultar datos satelitales: {e}")
        return []


def obtener_ultima_lectura():
    """Devuelve únicamente el registro más reciente de la tabla lecturas."""
    if not supabase:
        return None
    try:
        respuesta = supabase.table("lecturas").select("*").order("timestamp", desc=True).limit(1).execute()
        return respuesta.data[0] if respuesta.data else None
    except Exception as e:
        print(f"[ERROR] Error al consultar la última lectura: {e}")
        return None

def obtener_alertas(limite: int = 10):
    """Devuelve una lista con las alertas registradas en el sistema."""
    if not supabase:
        return []
    try:
        respuesta = supabase.table("alertas").select("*").order("timestamp", desc=True).limit(limite).execute()
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Error al consultar alertas: {e}")
        return []