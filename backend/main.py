import hmac
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).with_name(".env"))

from supabase_client import supabase
from clima import obtener_clima, obtener_datos_satelitales
from crud import (
    asociar_lectura_cruda_nodo,
    insertar_alerta,
    insertar_lectura,
    insertar_lectura_cruda,
    obtener_datos_satelitales_recientes,
    obtener_historial_lecturas,
    obtener_nodo_id,
    obtener_todas_las_alertas,
    obtener_ultima_lectura,
)
from decision import decidir_alerta
from limpieza import limpiar_lectura


app = FastAPI(
    title="SAT Backend API - Sistema de Alerta Temprana",
    description="API REST del Sistema de Alerta Temprana (SAT) para Icolven.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LATITUD = float(os.getenv("LATITUD_RIO", os.getenv("SATELLITE_LATITUDE", "6.244")))
LONGITUD = float(os.getenv("LONGITUD_RIO", os.getenv("SATELLITE_LONGITUDE", "-75.581")))


def verificar_api_key(api_key: str | None) -> None:
    clave_configurada = os.getenv("NODE_API_KEY")
    if not clave_configurada:
        raise HTTPException(status_code=503, detail="La API key del nodo no está configurada")
    if api_key is None or not hmac.compare_digest(api_key, clave_configurada):
        raise HTTPException(status_code=401, detail="API key inválida")


@app.get("/")
def read_root():
    if supabase is None:
        return {
            "status": "degraded",
            "message": "Supabase no está configurado",
            "supabase_connected": False,
        }
    try:
        supabase.table("nodos").select("id").limit(0).execute()
    except Exception as error:
        print(f"[ERROR] La verificación de Supabase falló: {error}")
        return {
            "status": "degraded",
            "message": "No se pudo verificar la conexión con Supabase",
            "supabase_connected": False,
        }
    return {
        "status": "online",
        "message": "SAT Backend API funcionando correctamente",
        "supabase_connected": True,
    }


@app.get("/satelital")
def get_datos_satelitales(
    latitud: float = Query(LATITUD, ge=-90, le=90),
    longitud: float = Query(LONGITUD, ge=-180, le=180),
):
    """Devuelve precipitación horaria histórica, actual y pronosticada de Open-Meteo."""
    datos = obtener_datos_satelitales(latitud, longitud)
    if datos is None:
        raise HTTPException(status_code=502, detail="No fue posible consultar Open-Meteo.")
    return datos


@app.get("/ultima-lectura")
def get_ultima_lectura():
    lectura = obtener_ultima_lectura()
    if not lectura:
        raise HTTPException(status_code=404, detail="No se encontraron lecturas registradas.")
    return {"status": "success", "data": lectura}


@app.get("/historial")
def get_historial(limite: int = Query(default=20, ge=1, le=500)):
    historial = obtener_historial_lecturas(limite=limite)
    return {"status": "success", "total": len(historial), "data": historial}


@app.get("/alertas")
def get_alertas(limite: int = Query(default=20, ge=1, le=500)):
    alertas = obtener_todas_las_alertas(limite=limite)
    return {"status": "success", "total": len(alertas), "data": alertas}


@app.post("/api/lecturas", status_code=201)
async def recibir_lectura(
    request: Request,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    verificar_api_key(x_api_key)
    try:
        datos_recibidos = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=422, detail="El cuerpo debe ser JSON válido") from error

    try:
        lectura_cruda_id = insertar_lectura_cruda(datos_recibidos)
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudo guardar la lectura cruda") from error

    try:
        datos_limpios = limpiar_lectura(datos_recibidos)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    try:
        nodo_uuid = obtener_nodo_id(datos_limpios["nodo_id"])
        if nodo_uuid is None:
            raise HTTPException(
                status_code=422,
                detail=f"El nodo '{datos_limpios['nodo_id']}' no está registrado",
            )

        asociar_lectura_cruda_nodo(lectura_cruda_id, nodo_uuid)
        lectura = insertar_lectura(
            nodo_uuid,
            datos_limpios["distancia_cm"],
            datos_limpios["velocidad_cm_min"],
            datos_limpios["nivel"],
            lectura_cruda_id,
        )
        alerta = None
        if decidir_alerta(datos_limpios["nivel"]):
            alerta = insertar_alerta(
                lectura[0]["id"],
                datos_limpios["nivel"],
                confirmada_por_satelite=False,
            )
        return {
            "status": "success",
            "lectura": lectura[0],
            "alerta": alerta[0] if alerta else None,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudo procesar la lectura") from error


@app.post("/clima/actualizar")
def registrar_datos_clima_automatico():
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase no está disponible")

    datos_clima = obtener_clima(LATITUD, LONGITUD)
    if datos_clima is None:
        raise HTTPException(status_code=503, detail="No se pudieron obtener datos de Open-Meteo")

    registro = {
        "precipitacion": float(datos_clima.get("lluvia_ultima_hora") or 0.0),
        "lluvia_acumulada_24h": float(datos_clima.get("lluvia_acumulada_24h") or 0.0),
        "fuente": "open-meteo",
    }
    try:
        respuesta = supabase.table("datos_satelitales").insert(registro).execute()
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudieron guardar los datos en Supabase") from error
    return {
        "status": "success",
        "message": "Datos de clima registrados correctamente",
        "data": respuesta.data,
    }


@app.get("/clima/historial")
def ver_historial_clima():
    try:
        historial = obtener_datos_satelitales_recientes()
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudo consultar el historial en Supabase") from error
    return {"datos_satelitales": historial}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
