- Extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CREACIÓN DE TABLAS

-- 1. nodos
CREATE TABLE IF NOT EXISTS nodos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    ubicacion TEXT,
    estado TEXT NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo', 'mantenimiento')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. configuracion_nodos (NUEVA: Umbrales y límites por nodo)
CREATE TABLE IF NOT EXISTS configuracion_nodos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nodo_id UUID NOT NULL UNIQUE REFERENCES nodos(id) ON DELETE CASCADE,
    umbral_amarillo_cm NUMERIC(6,2) NOT NULL,
    umbral_naranja_cm NUMERIC(6,2) NOT NULL,
    umbral_rojo_cm NUMERIC(6,2) NOT NULL,
    limite_velocidad_cm_min NUMERIC(6,2),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_configuracion_nodo_id ON configuracion_nodos(nodo_id);

-- 3. lecturas
CREATE TABLE IF NOT EXISTS lecturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nodo_id UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
    distancia_cm NUMERIC(6,2) NOT NULL CHECK (distancia_cm BETWEEN 0 AND 450),
    velocidad_cm_min NUMERIC(6,2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lecturas_nodo_id ON lecturas(nodo_id);
CREATE INDEX IF NOT EXISTS idx_lecturas_timestamp ON lecturas(timestamp DESC);

-- 4. datos_satelitales
CREATE TABLE IF NOT EXISTS datos_satelitales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    precipitacion NUMERIC(6,2),
    fuente TEXT NOT NULL DEFAULT 'open-meteo'
);

CREATE INDEX IF NOT EXISTS idx_datos_satelitales_timestamp ON datos_satelitales(timestamp DESC);

-- 5. alertas
CREATE TABLE IF NOT EXISTS alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lectura_id UUID NOT NULL REFERENCES lecturas(id) ON DELETE CASCADE,
    nivel_final TEXT NOT NULL
        CHECK (nivel_final IN ('VERDE', 'AMARILLO', 'NARANJA', 'ROJO')),
    confirmada_por_satelite BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_lectura_id ON alertas(lectura_id);

-- 6. notificaciones_alertas (NUEVA: Registro de envíos a entidades y ciudadanos)
CREATE TABLE IF NOT EXISTS notificaciones_alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alerta_id UUID NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
    destinatario TEXT NOT NULL,
    tipo_destinatario TEXT NOT NULL
        CHECK (tipo_destinatario IN ('entidad', 'comunidad', 'ciudadano', 'administrador')),
    canal TEXT NOT NULL
        CHECK (canal IN ('sms', 'email', 'whatsapp', 'push', 'sirena')),
    estado_envio TEXT NOT NULL DEFAULT 'enviado'
        CHECK (estado_envio IN ('pendiente', 'enviado', 'fallido')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_alerta_id ON notificaciones_alertas(alerta_id);

-- 7. administradores - acceso al dashboard interno
CREATE TABLE IF NOT EXISTS administradores (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'admin'
        CHECK (rol IN ('admin', 'lector')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 2. SEGURIDAD (Row Level Security - RLS)


ALTER TABLE nodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_nodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE datos_satelitales ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas
DROP POLICY IF EXISTS "lectura publica nodos" ON nodos;
DROP POLICY IF EXISTS "lectura publica configuracion_nodos" ON configuracion_nodos;
DROP POLICY IF EXISTS "lectura publica lecturas" ON lecturas;
DROP POLICY IF EXISTS "lectura publica datos_satelitales" ON datos_satelitales;
DROP POLICY IF EXISTS "lectura publica alertas" ON alertas;
DROP POLICY IF EXISTS "lectura publica notificaciones" ON notificaciones_alertas;
DROP POLICY IF EXISTS "admin ve su propio registro" ON administradores;

-- Políticas de lectura pública
CREATE POLICY "lectura publica nodos" ON nodos FOR SELECT USING (true);
CREATE POLICY "lectura publica configuracion_nodos" ON configuracion_nodos FOR SELECT USING (true);
CREATE POLICY "lectura publica lecturas" ON lecturas FOR SELECT USING (true);
CREATE POLICY "lectura publica datos_satelitales" ON datos_satelitales FOR SELECT USING (true);
CREATE POLICY "lectura publica alertas" ON alertas FOR SELECT USING (true);
CREATE POLICY "lectura publica notificaciones" ON notificaciones_alertas FOR SELECT USING (true);

-- Política para administradores
CREATE POLICY "admin ve su propio registro" ON administradores
    FOR SELECT USING (auth.uid() = id);


-- 3. DATOS DE PRUEBA Y VERIFICACIÓN


-- Insertar nodo
INSERT INTO nodos (nombre, ubicacion, estado)
VALUES ('RIO_01', 'Punto de monitoreo principal', 'activo')
ON CONFLICT DO NOTHING;

-- Configurar umbrales para RIO_01
INSERT INTO configuracion_nodos (nodo_id, umbral_amarillo_cm, umbral_naranja_cm, umbral_rojo_cm, limite_velocidad_cm_min)
SELECT id, 200.00, 100.00, 50.00, 15.00
FROM nodos WHERE nombre = 'RIO_01'
ON CONFLICT (nodo_id) DO NOTHING;

-- Insertar lectura de prueba
INSERT INTO lecturas (nodo_id, distancia_cm, velocidad_cm_min)
SELECT id, 45.2, 3.1 FROM nodos WHERE nombre = 'RIO_01';

-- Insertar alerta
INSERT INTO alertas (lectura_id, nivel_final, confirmada_por_satelite)
SELECT id, 'ROJO', TRUE FROM lecturas ORDER BY timestamp DESC LIMIT 1;

-- Registrar envío de notificación
INSERT INTO notificaciones_alertas (alerta_id, destinatario, tipo_destinatario, canal, estado_envio)
SELECT id, 'Cuerpo de Bomberos Voluntarios', 'entidad', 'sms', 'enviado'
FROM alertas ORDER BY timestamp DESC LIMIT 1;