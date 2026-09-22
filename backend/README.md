SAT Backend - Configuración Docker y API

Este módulo contiene la API principal en FastAPI para el Sistema de Alerta Temprana (SAT) y su configuración de ejecución containerizada con Docker Compose.

-Requisitos Previos

Docker Desktop instalado y con el motor activo (Engine running).

Un proyecto configurado en Supabase.

-Configuración Inicial

Variables de Entorno:
Copia el archivo de plantilla .env.example dentro de la carpeta backend para crear tu archivo .env:

cp .env.example .env


Asignar Credenciales:
Abre el archivo .env recien creado e ingresa tus claves de proyecto de Supabase:

SUPABASE_URL=https://hnadrkkzucilttlpergc.supabase.co
SUPABASE_KEY=tu_clave_anonima_publica

La biblioteca Python usada por este backend (`supabase==2.3.0`) requiere una
clave JWT `anon` (la clave pública heredada), no una clave con formato
`sb_publishable_...`. Obtén la clave `anon` desde Supabase en
**Settings > API > Legacy API Keys** y guárdala únicamente en `backend/.env`.


-Ejecución con Docker Compose

Desde la carpeta `backend`, para construir e iniciar la aplicación junto con sus dependencias dentro de un contenedor aislado, ejecuta:

docker compose up --build


El servidor estará disponible y escuchando peticiones en:
👉 http://localhost:8000

-Verificación del API

Puedes realizar una petición GET a la raíz http://localhost:8000 para comprobar el estado de conexión del servicio y con la base de datos Supabase:

{
  "status": "online",
  "message": "SAT Backend API funcionando correctamente",
  "supabase_connected": true
}
