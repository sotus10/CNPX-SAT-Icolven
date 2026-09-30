import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client

# Importaciones existentes del clima y cliente
from clima import obtener_clima, obtener_datos_satelitales
from supabase_client import supabase

# Importamos las funciones CRUD que ya probamos y funcionan
from crud import obtener_ultima_lectura, obtener_ultimas_lecturas, obtener_alertas

load_dotenv(Path(__file__).with_name(".env"))

LATITUD = float(os.getenv("SATELLITE_LATITUDE", "6.25"))
LONGITUD = float(os.getenv("SATELLITE_LONGITUDE", "-75.56"))

def obtener_datos_sensor_y_clima():
    # Consulta de los datos del clima
    datos_clima = obtener_clima(LATITUD, LONGITUD)

    if datos_clima:
        lluvia_1h = datos_clima["lluvia_ultima_hora"]
        lluvia_24h = datos_clima["lluvia_acumulada_24h"]

        registro = {
            "lluvia_ultima_hora": lluvia_1h,
            "lluvia_acumulada_24h": lluvia_24h
        }

        try:
            # Guarda la información directamente en la tabla 'mediciones' de Supabase
            if supabase:
                respuesta = supabase.table("mediciones").insert(registro).execute()
                print("[OK] Guardado en Supabase:", respuesta.data)
        except Exception as e:
            print(f"[ERROR] No se pudo guardar en Supabase: {e}")

        return registro
    else:
        return None

if __name__ == "__main__":
    obtener_datos_sensor_y_clima()

# Inicialización de FastAPI (Mantenemos tu bloque intacto)
app = FastAPI(title="SAT Backend API", description="API para el Sistema de Alerta Temprana")

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

url: str = os.getenv("SUPABASE_URL", "").strip()
key: str = os.getenv("SUPABASE_KEY", "").strip()

# (Nota: supabase ya se importa arriba desde supabase_client, pero mantenemos la lógica segura)
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

# ==========================================
# NUEVOS ENDPOINTS DE LA TAREA 11
# ==========================================

@app.get("/ultima-lectura")
def get_ultima_lectura():
    """Devuelve la medición más reciente registrada por el sensor."""
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase no está configurado para consultar lecturas.")
    resultado = obtener_ultima_lectura()
    if not resultado:
        raise HTTPException(status_code=404, detail="No se encontró ninguna lectura reciente.")
    return resultado

@app.get("/historial")
def get_historial(limite: int = 10):
    """Devuelve el historial de lecturas recientes."""
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase no está configurado para consultar lecturas.")
    resultado = obtener_ultimas_lecturas(limite=limite)
    return resultado

@app.get("/alertas")
def get_alertas(limite: int = 10):
    """Devuelve el registro de alertas generadas en el sistema."""
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase no está configurado para consultar alertas.")
    resultado = obtener_alertas(limite=limite)
    return resultado