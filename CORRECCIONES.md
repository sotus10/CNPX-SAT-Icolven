# Correcciones y verificaciones realizadas

Resumen del trabajo aplicado al backend del Sistema de Alerta Temprana de
Icolven, sus tablas de Supabase y el firmware receptor.

## Bugs y flujo del backend

- Se eliminó la definición duplicada de `obtener_ultima_lectura()` que
  consultaba una tabla incorrecta. La función restante consulta
  `lecturas_limpias`.
- Se eliminó `obtener_alertas()`, duplicada por
  `obtener_todas_las_alertas()`.
- Se corrigió el manejo de lluvia nula para que `float(None)` no produzca un
  error.
- Se movió `load_dotenv()` antes de importar el cliente de Supabase y se
  configuraron las coordenadas mediante `LATITUD_RIO` y `LONGITUD_RIO`.
- Se añadieron `limpieza.py` y `decision.py` y se conectaron al flujo de
  recepción.
- Se añadió `POST /api/lecturas`, protegido por `X-API-Key`. La API guarda
  primero el mensaje crudo, luego valida los datos, busca el nodo existente y
  guarda la lectura limpia. Para niveles distintos de `VERDE`, registra una
  alerta.
- Los nodos ya no se crean automáticamente. El identificador recibido del
  firmware, por ejemplo `RIO_01`, debe corresponder al nombre de un nodo
  registrado en Supabase.
- Las lecturas inválidas se conservan en `lecturas_crudas`, pero no se insertan
  en `lecturas_limpias`. Los fallos de persistencia se reportan como HTTP 500
  y los datos inválidos como HTTP 422.
- `/historial` admite `?limite=`, con valor por defecto 20 y mínimo 1.
- `/clima/actualizar` es `POST`; responde 503 cuando falla Open-Meteo y 500
  cuando falla Supabase. `/clima/historial` también comunica los errores de
  consulta a Supabase.
- Se incorporó la persistencia de lluvia acumulada durante 24 horas.

## Tablas y esquema de Supabase

- Se mantuvieron las relaciones necesarias entre `lecturas_limpias`,
  `lecturas_crudas`, `nodos` y `alertas`.
- Se alineó el CRUD con las columnas observadas en la tabla existente
  `lecturas_crudas`: `nodo_id`, `distancia_cm`, `velocidad_cm_min` y
  `timestamp`. Se añadieron `nodo_codigo` y `datos_recibidos` para identificar
  el nodo del firmware y conservar el JSON original. El `nodo_id` crudo se
  completa cuando se reconoce un nodo registrado.
- Se añadió `lluvia_acumulada_24h` a `datos_satelitales`.
- Se creó la migración
  `database/migrations/20260930_align_live_supabase.sql` para actualizar una
  base ya existente sin recrear las tablas ni borrar sus registros.
- El esquema inicial actualizado está documentado en
  `database/schema.sql`. Para una base existente se debe usar la migración, no
  volver a ejecutar todo el esquema como si fuera una base vacía.

## Configuración y firmware

- Se añadieron variables de entorno de ejemplo para `NODE_API_KEY` y las
  coordenadas del sitio.
- El backend carga la clave local desde `backend/.env`. La clave configurada
  para Supabase debe tener permisos de escritura compatibles con las políticas
  RLS; `service_role` es la usada para el backend y nunca debe publicarse.
- El firmware receptor envía `X-API-Key` desde `BACKEND_API_KEY`.
- Se retiró del código fuente una `BACKEND_API_KEY` que había quedado embebida.
  El receptor usa ahora el marcador de configuración dentro del bloque Wi-Fi;
  configura allí la nueva clave local antes de habilitar el envío.
- `backend/README.md` explica configuración, aplicación de la migración y uso
  de los endpoints.
- El aviso de formato de dotenv se rastreó a una línea sobrante de cita
  Markdown en el `.env` raíz. Se quitó y se verificó que ese archivo parsea.

## Verificaciones

- Se confirmó que `backend/.env` parsea, apunta al proyecto esperado y contiene
  una clave JWT `service_role` cuyo identificador de proyecto coincide con la
  URL configurada. Los secretos no se muestran aquí.
- `GET /` ejecuta una consulta de solo lectura a `nodos`. Con la configuración
  local verificada respondió `online` y `supabase_connected: true`.
- Se consultaron en modo de solo lectura las columnas requeridas de
  `nodos`, `lecturas_crudas`, `lecturas_limpias`, `alertas` y
  `datos_satelitales`; todas respondieron correctamente después de aplicar los
  cambios de esquema.
- `python -m unittest discover -v` desde `backend`: **19 pruebas correctas**.
  También se ejecutó `compileall` para los módulos y pruebas.
- No se hizo una inserción de prueba en la base de producción; por tanto, el
  flujo completo de escritura debe comprobarse con una lectura real controlada.

## Pendiente para completar el despliegue

1. En la captura del firmware aparecieron errores de IntelliSense porque no se
   encontraban `SPI.h` y `LoRa.h`. Instala/selecciona el soporte ESP32 y la
   biblioteca LoRa correspondiente; después compila y carga el firmware.
2. Una clave `NODE_API_KEY` apareció en capturas. Debe considerarse expuesta:
   genera una nueva y actualízala tanto en `backend/.env` como en
   `BACKEND_API_KEY` del firmware, sin compartirla ni fotografiarla.
3. Con el firmware cargado y conectado, manda una lectura controlada a
   `POST /api/lecturas` y confirma que aparecen las filas relacionadas en
   `lecturas_crudas`, `lecturas_limpias` y, para niveles no verdes, `alertas`.
4. El resultado `supabase_connected: true` confirma una consulta de lectura,
   no una inserción. La clave `service_role` habilita operaciones de escritura
   según la configuración actual, pero la inserción real todavía no ha sido
   probada.
