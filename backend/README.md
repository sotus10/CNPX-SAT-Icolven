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

El backend necesita una clave JWT `service_role` de Supabase para insertar
lecturas y datos de clima; una clave `anon` no tiene permisos de escritura con
las políticas de este esquema. Obtén la clave heredada desde **Settings > API >
Legacy API Keys** y guárdala únicamente en `backend/.env`. Nunca la incluyas en
el frontend.

Configura también `NODE_API_KEY` con una clave larga y aleatoria. El receptor
debe enviar exactamente ese valor en el encabezado `X-API-Key`; configura el
mismo valor en `BACKEND_API_KEY` del firmware antes de habilitar Wi-Fi.
Define `LATITUD_RIO` y `LONGITUD_RIO` para ajustar el punto consultado por
Open-Meteo.

Para una base Supabase existente, ejecuta primero
`database/migrations/20260930_align_live_supabase.sql` en el SQL Editor. En una
instalación nueva, aplica `database/schema.sql`.
Los nodos se registran manualmente en `nodos`; el campo `nombre` debe coincidir
con el identificador enviado por el firmware (por ejemplo, `RIO_01`). Las
lecturas inválidas también se conservan en `lecturas_crudas`; solo las válidas
se copian a `lecturas_limpias`.


-Ejecución con Docker Compose

Desde la carpeta `backend`, para construir e iniciar la aplicación junto con sus dependencias dentro de un contenedor aislado, ejecuta:

docker compose up --build


El servidor estará disponible y escuchando peticiones en:
👉 http://localhost:8000

-Verificación del API

Puedes realizar una petición GET a la raíz http://localhost:8000. Comprueba
mediante una consulta de solo lectura a `nodos` si Supabase responde; si falla,
devuelve `supabase_connected: false` y `status: "degraded"`:

{
  "status": "online",
  "message": "SAT Backend API funcionando correctamente",
  "supabase_connected": true
}

El receptor publica lecturas mediante `POST /api/lecturas`. Para revisar un
número configurable de registros, usa `GET /historial?limite=100`. La
actualización de lluvia se ejecuta con `POST /clima/actualizar`.
