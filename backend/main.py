import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Importaciones locales del proyecto
from supabase_client import supabase
from clima import obtener_clima
from crud import (
    obtener_datos_satelitales_recientes, 
    obtener_ultima_lectura,
    obtener_historial_lecturas,
    obtener_todas_las_alertas
)

load_dotenv(Path(__file__).with_name(".env"))

# Inicialización única de FastAPI con configuración de CORS
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

# Coordenadas de la zona (Medellín/Icolven)
LATITUD = 6.25
LONGITUD = -75.56

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "SAT Backend API funcionando correctamente",
        "supabase_connected": supabase is not None
    }

# --- ENDPOINTS REQUERIDOS POR LA TAREA ---

@app.get("/ultima-lectura")
def get_ultima_lectura():
    """Retorna la lectura limpia más reciente registrada por el sistema."""
    lectura = obtener_ultima_lectura()
    if not lectura:
        raise HTTPException(status_code=404, detail="No se encontraron lecturas registradas.")
    return {"status": "success", "data": lectura}

@app.get("/historial")
def get_historial():
    """Retorna el historial completo de lecturas limpias."""
    historial = obtener_historial_lecturas(limite=20)
    return {"status": "success", "total": len(historial), "data": historial}

@app.get("/alertas")
def get_alertas():
    """Retorna el registro de alertas del sistema."""
    alertas = obtener_todas_las_alertas(limite=20)
    return {"status": "success", "total": len(alertas), "data": alertas}


# --- ENDPOINTS DE CLIMA Y DATOS SATELITALES ---

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