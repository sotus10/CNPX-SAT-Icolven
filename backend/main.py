import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from supabase_client import supabase
from clima import obtener_clima, obtener_datos_satelitales
from crud import (
    obtener_datos_satelitales_recientes, 
    obtener_ultima_lectura,
    obtener_historial_lecturas,
    obtener_todas_las_alertas
)

load_dotenv(Path(__file__).with_name(".env"))

LATITUD = float(os.getenv("SATELLITE_LATITUDE", "6.25"))
LONGITUD = float(os.getenv("SATELLITE_LONGITUDE", "-75.56"))
app = FastAPI(
    title="SAT Backend API - Sistema de Alerta Temprana",
    description="API REST del Sistema de Alerta Temprana (SAT) para Icolven."
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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "SAT Backend API funcionando correctamente",
        "supabase_connected": supabase is not None
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
    """Retorna la lectura limpia más reciente registrada por el sistema."""
    lectura = obtener_ultima_lectura()
    if not lectura:
        raise HTTPException(status_code=404, detail="No se encontraron lecturas registradas.")
    return {"status": "success", "data": lectura}

@app.get("/historial")
def get_historial(limite: int = Query(20, ge=1, le=500)):
    """Retorna el historial reciente de lecturas limpias."""
    historial = obtener_historial_lecturas(limite=limite)
    return {"status": "success", "total": len(historial), "data": historial}

@app.get("/alertas")
def get_alertas(limite: int = Query(20, ge=1, le=500)):
    """Retorna el registro reciente de alertas del sistema."""
    alertas = obtener_todas_las_alertas(limite=limite)
    return {"status": "success", "total": len(alertas), "data": alertas}


@app.get("/clima/actualizar")
def registrar_datos_clima_automatico():
    """Obtiene el clima actual de Open-Meteo y lo guarda en la tabla 'datos_satelitales'."""
    if not supabase:
        return {"error": "Supabase no está disponible"}

    datos_clima = obtener_clima(LATITUD, LONGITUD)

    if datos_clima:
        lluvia_1h = datos_clima.get("lluvia_ultima_hora", 0.0)

        registro = {
            "precipitacion": float(lluvia_1h),
            "fuente": "open-meteo"
        }

        try:
            respuesta = supabase.table("datos_satelitales").insert(registro).execute()
            print("[OK] Datos satelitales/clima guardados en Supabase:", respuesta.data)
            return {
                "status": "success",
                "message": "Datos de clima registrados correctamente",
                "data": respuesta.data
            }
        except Exception as e:
            print(f"[ERROR] No se pudo guardar en Supabase: {e}")
            return {"error": str(e)}
    else:
        return {"error": "No se pudieron obtener datos del clima"}

@app.get("/clima/historial")
def ver_historial_clima():
    """Endpoint para consultar los registros satelitales recientes."""
    historial = obtener_datos_satelitales_recientes()
    return {"datos_satelitales": historial}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
