import math
from typing import Any

from supabase_client import supabase


def _require_supabase():
    if supabase is None:
        raise RuntimeError("Supabase no está disponible")
    return supabase


def _valor_numerico_crudo(valor: Any) -> float | None:
    if isinstance(valor, bool):
        return None
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(numero) or abs(numero) > 9999.99:
        return None
    return numero


def insertar_lectura_cruda(datos: Any) -> str:
    """Persiste el mensaje completo antes de validarlo o normalizarlo."""
    cliente = _require_supabase()
    nodo_codigo = datos.get("nodo_id") if isinstance(datos, dict) else None
    if not isinstance(nodo_codigo, str):
        nodo_codigo = None

    respuesta = cliente.table("lecturas_crudas").insert({
        "nodo_id": None,
        "nodo_codigo": nodo_codigo,
        "distancia_cm": _valor_numerico_crudo(
            datos.get("distancia_cm") if isinstance(datos, dict) else None
        ),
        "velocidad_cm_min": _valor_numerico_crudo(
            datos.get("velocidad_cm_min") if isinstance(datos, dict) else None
        ),
        "datos_recibidos": datos,
    }).execute()
    if not respuesta.data:
        raise RuntimeError("Supabase no devolvió la lectura cruda insertada")
    return respuesta.data[0]["id"]


def asociar_lectura_cruda_nodo(lectura_cruda_id: str, nodo_id: str) -> None:
    cliente = _require_supabase()
    (
        cliente.table("lecturas_crudas")
        .update({"nodo_id": nodo_id})
        .eq("id", lectura_cruda_id)
        .execute()
    )


def obtener_nodo_id(nodo_codigo: str) -> str | None:
    """Busca el UUID del nodo ya registrado usando el identificador del firmware."""
    cliente = _require_supabase()
    respuesta = (
        cliente.table("nodos")
        .select("id")
        .eq("nombre", nodo_codigo)
        .limit(1)
        .execute()
    )
    return respuesta.data[0]["id"] if respuesta.data else None


def insertar_lectura(
    nodo_id: str,
    distancia_cm: float,
    velocidad_cm_min: float,
    nivel: str,
    lectura_cruda_id: str,
):
    """Inserta la lectura validada y la vincula a su registro crudo."""
    cliente = _require_supabase()
    respuesta = cliente.table("lecturas_limpias").insert({
        "lectura_cruda_id": lectura_cruda_id,
        "nodo_id": nodo_id,
        "distancia_cm": distancia_cm,
        "velocidad_cm_min": velocidad_cm_min,
        "nivel": nivel,
    }).execute()
    if not respuesta.data:
        raise RuntimeError("Supabase no devolvió la lectura limpia insertada")
    return respuesta.data


def obtener_ultimas_lecturas(limite: int = 5, nodo_id: str | None = None):
    cliente = _require_supabase()
    consulta = cliente.table("lecturas_limpias").select("*")
    if nodo_id is not None:
        consulta = consulta.eq("nodo_id", nodo_id)
    respuesta = consulta.order("timestamp", desc=True).limit(limite).execute()
    return respuesta.data


def obtener_ultima_lectura():
    """Retorna la lectura limpia más reciente."""
    cliente = _require_supabase()
    respuesta = (
        cliente.table("lecturas_limpias")
        .select("*")
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )
    return respuesta.data[0] if respuesta.data else None


def obtener_historial_lecturas(limite: int = 20):
    """Retorna hasta `limite` lecturas limpias, de la más reciente a la más antigua."""
    cliente = _require_supabase()
    respuesta = (
        cliente.table("lecturas_limpias")
        .select("*")
        .order("timestamp", desc=True)
        .limit(limite)
        .execute()
    )
    return respuesta.data


def insertar_alerta(lectura_id: str, nivel_final: str, confirmada_por_satelite: bool):
    cliente = _require_supabase()
    respuesta = cliente.table("alertas").insert({
        "lectura_id": lectura_id,
        "nivel_final": nivel_final,
        "confirmada_por_satelite": confirmada_por_satelite,
    }).execute()
    if not respuesta.data:
        raise RuntimeError("Supabase no devolvió la alerta insertada")
    return respuesta.data


def obtener_todas_las_alertas(limite: int = 20):
    cliente = _require_supabase()
    respuesta = (
        cliente.table("alertas")
        .select("*")
        .order("timestamp", desc=True)
        .limit(limite)
        .execute()
    )
    return respuesta.data


def obtener_datos_satelitales_recientes():
    cliente = _require_supabase()
    respuesta = (
        cliente.table("datos_satelitales")
        .select("*")
        .order("timestamp", desc=True)
        .limit(5)
        .execute()
    )
    return respuesta.data


def obtener_nodos():
    """Retorna los nodos registrados con su estado administrativo."""
    cliente = _require_supabase()
    respuesta = (
        cliente.table("nodos")
        .select("id, nombre, ubicacion, estado, created_at")
        .order("nombre")
        .execute()
    )
    return respuesta.data


def obtener_lecturas_limpias_por_nodo(limite: int = 500):
    """Retorna lecturas limpias recientes para resolver la última de cada nodo.

    Se consulta en orden descendente para que la primera aparición de cada `nodo_id`
    sea su lectura más reciente, sin depender de un join en PostgREST.
    """
    cliente = _require_supabase()
    respuesta = (
        cliente.table("lecturas_limpias")
        .select("nodo_id, timestamp, distancia_cm, velocidad_cm_min, nivel")
        .order("timestamp", desc=True)
        .limit(limite)
        .execute()
    )
    return respuesta.data


def obtener_configuracion_nodos():
    """Retorna los umbrales de alerta y el límite de velocidad de cada nodo."""
    cliente = _require_supabase()
    respuesta = (
        cliente.table("configuracion_nodos")
        .select(
            "id, nodo_id, umbral_amarillo_cm, umbral_naranja_cm, "
            "umbral_rojo_cm, limite_velocidad_cm_min, updated_at"
        )
        .order("updated_at", desc=True)
        .execute()
    )
    return respuesta.data


def obtener_lecturas_crudas(limite: int = 100, nodo_id: str | None = None):
    """Retorna las lecturas crudas (sin filtrar) para auditar el filtro de ruido."""
    cliente = _require_supabase()
    consulta = cliente.table("lecturas_crudas").select(
        "id, nodo_id, nodo_codigo, distancia_cm, velocidad_cm_min, timestamp"
    )
    if nodo_id is not None:
        consulta = consulta.eq("nodo_id", nodo_id)
    respuesta = consulta.order("timestamp", desc=True).limit(limite).execute()
    return respuesta.data


def obtener_notificaciones_alertas(limite: int = 500):
    """Retorna los envíos a la comunidad por canal y estado de envío."""
    cliente = _require_supabase()
    respuesta = (
        cliente.table("notificaciones_alertas")
        .select("id, alerta_id, canal, estado_envio, tipo_destinatario, timestamp")
        .order("timestamp", desc=True)
        .limit(limite)
        .execute()
    )
    return respuesta.data
