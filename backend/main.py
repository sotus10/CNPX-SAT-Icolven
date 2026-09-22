from clima import obtener_clima
# Coordenadas de tu zona (Medellín/Icolven)
from supabase_client import supabase  # Importas el cliente configurado
LATITUD = 6.25
LONGITUD = -75.56

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
            respuesta = supabase.table("mediciones").insert(registro).execute()
            print("[OK] Guardado en Supabase:", respuesta.data)
        except Exception as e:
            print(f"[ERROR] No se pudo guardar en Supabase: {e}")

        return registro
    else:
        return None


if __name__ == "__main__":
    obtener_datos_sensor_y_clima()
import os
from pathlib import Path

from fastapi import FastAPI
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(title="SAT Backend API")

url: str = os.getenv("SUPABASE_URL", "").strip()
key: str = os.getenv("SUPABASE_KEY", "").strip()

supabase: Client | None = None
if url and key:
    try:
        supabase = create_client(url, key)
    except Exception as e:
        print(f"Error al conectar con Supabase: {e}")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "SAT Backend API funcionando correctamente",
        "supabase_connected": supabase is not None
    }
