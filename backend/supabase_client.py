import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.getenv("SUPABASE_URL", "").strip()
key: str = os.getenv("SUPABASE_KEY", "").strip()

supabase: Client | None = None

if url and key:
    try:
        supabase = create_client(url, key)
    except Exception as e:
        print(f"Error al conectar con Supabase: {e}")
else:
    print("[ADVERTENCIA] SUPABASE_URL o SUPABASE_KEY no están definidas en el archivo .env")