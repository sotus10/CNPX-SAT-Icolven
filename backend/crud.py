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
            # Si no existe, lo creamos (estado en minúscula por el CHECK de la BD)
            nodo_data = {
                "id": nodo_id,
                "nombre": "Nodo de Prueba Automatizada",
                "ubicacion": "Medellin / Icolven",
                "estado": "activo"
            }
            supabase.table("nodos").insert(nodo_data).execute()
            print(f"[OK] Nodo {nodo_id} creado automáticamente.")
    except Exception as e:
        print(f"[AVISO] No se pudo verificar/crear el nodo: {e}")

def insertar_lectura(nodo_id: str, distancia_cm: float, velocidad_cm_min: float, nivel: str):
    if not supabase:
        print("[ERROR] Supabase no está disponible.")
        return None
    
    # Asegurar que el nodo exista antes de insertar
    asegurar_nodo_existe(nodo_id)

    try:
        # 1. Insertar el dato crudo en lecturas_crudas
        registro_crudo = {
            "nodo_id": nodo_id,
            "distancia_cm": distancia_cm,
            "velocidad_cm_min": velocidad_cm_min
        }
        res_cruda = supabase.table("lecturas_crudas").insert(registro_crudo).execute()
        
        cruda_id = None
        if res_cruda.data and len(res_cruda.data) > 0:
            cruda_id = res_cruda.data[0].get("id")

        # 2. Insertar el dato procesado en lecturas_limpias vinculado al crudo
        registro_limpio = {
            "lectura_cruda_id": cruda_id,
            "nodo_id": nodo_id,
            "distancia_cm": distancia_cm,
            "velocidad_cm_min": velocidad_cm_min,
            "nivel": nivel
        }
        respuesta_limpia = supabase.table("lecturas_limpias").insert(registro_limpio).execute()
        print("[OK] Lectura limpia registrada:", respuesta_limpia.data)
        return respuesta_limpia.data
    except Exception as e:
        print(f"[ERROR] Falló la inserción de lectura: {e}")
        return None

def obtener_ultimas_lecturas(limite: int = 5):
    if not supabase:
        return []
    try:
        # Se consulta de lecturas_limpias ya que contiene el nivel evaluado
        respuesta = supabase.table("lecturas_limpias").select("*").order("timestamp", desc=True).limit(limite).execute()
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Error al consultar lecturas limpias: {e}")
        return []

def obtener_ultima_lectura():
    """Retorna únicamente la lectura limpia más reciente (para el endpoint /ultima-lectura)."""
    if not supabase:
        return None
    try:
        respuesta = supabase.table("lecturas_limpias").select("*").order("timestamp", desc=True).limit(1).execute()
        return respuesta.data[0] if respuesta.data else None
    except Exception as e:
        print(f"[ERROR] Error al obtener última lectura: {e}")
        return None

def obtener_historial_lecturas(limite: int = 20):
    """Retorna una lista con el historial de lecturas limpias (para el endpoint /historial)."""
    if not supabase:
        return []
    try:
        respuesta = supabase.table("lecturas_limpias").select("*").order("timestamp", desc=True).limit(limite).execute()
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Error al obtener historial de lecturas: {e}")
        return []

def insertar_alerta(lectura_id: str, nivel_final: str, confirmada_por_satelite: bool):
    if not supabase:
        return None
    alerta = {
        "lectura_id": lectura_id,  # Referencia al ID de lecturas_limpias
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

def obtener_todas_las_alertas(limite: int = 20):
    """Retorna el registro de alertas del sistema (para el endpoint /alertas)."""
    if not supabase:
        return []
    try:
        respuesta = supabase.table("alertas").select("*").order("timestamp", desc=True).limit(limite).execute()
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Error al consultar alertas: {e}")
        return []

def obtener_datos_satelitales_recientes():
    if not supabase:
        return []
    try:
        respuesta = supabase.table("datos_satelitales").select("*").order("timestamp", desc=True).limit(5).execute()
        return respuesta.data
    except Exception as e:
        print(f"[ERROR] Error al consultar datos satelitales: {e}")
        return []