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

-- 3. lecturas_crudas conserva el mensaje íntegro recibido del receptor.
CREATE TABLE IF NOT EXISTS lecturas_crudas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nodo_id UUID REFERENCES nodos(id) ON DELETE SET NULL,
    nodo_codigo TEXT,
    distancia_cm NUMERIC(6,2),
    velocidad_cm_min NUMERIC(6,2),
    datos_recibidos JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lecturas_crudas
    ADD COLUMN IF NOT EXISTS nodo_codigo TEXT,
    ADD COLUMN IF NOT EXISTS datos_recibidos JSONB;

ALTER TABLE lecturas_crudas
    ALTER COLUMN nodo_id DROP NOT NULL,
    ALTER COLUMN distancia_cm DROP NOT NULL,
    ALTER COLUMN velocidad_cm_min DROP NOT NULL;

UPDATE lecturas_crudas
SET datos_recibidos = jsonb_build_object(
    'nodo_id', nodo_id,
    'distancia_cm', distancia_cm,
    'velocidad_cm_min', velocidad_cm_min
)
WHERE datos_recibidos IS NULL;

ALTER TABLE lecturas_crudas
    ALTER COLUMN datos_recibidos SET DEFAULT '{}'::jsonb,
    ALTER COLUMN datos_recibidos SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lecturas_crudas_timestamp ON lecturas_crudas(timestamp DESC);

-- 4. lecturas_limpias solo contiene mediciones validadas.
CREATE TABLE IF NOT EXISTS lecturas_limpias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lectura_cruda_id UUID NOT NULL REFERENCES lecturas_crudas(id) ON DELETE CASCADE,
    nodo_id UUID NOT NULL REFERENCES nodos(id) ON DELETE CASCADE,
    distancia_cm NUMERIC(6,2) NOT NULL CHECK (distancia_cm BETWEEN 2 AND 450),
    velocidad_cm_min NUMERIC(6,2),
    nivel TEXT NOT NULL CHECK (nivel IN ('VERDE', 'AMARILLO', 'NARANJA', 'ROJO')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lecturas_limpias_nodo_id ON lecturas_limpias(nodo_id);
CREATE INDEX IF NOT EXISTS idx_lecturas_limpias_timestamp ON lecturas_limpias(timestamp DESC);

-- 5. datos_satelitales
CREATE TABLE IF NOT EXISTS datos_satelitales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    precipitacion NUMERIC(6,2),
    lluvia_acumulada_24h NUMERIC(6,2),
    fuente TEXT NOT NULL DEFAULT 'open-meteo'
);

ALTER TABLE datos_satelitales
    ADD COLUMN IF NOT EXISTS lluvia_acumulada_24h NUMERIC(6,2);

CREATE INDEX IF NOT EXISTS idx_datos_satelitales_timestamp ON datos_satelitales(timestamp DESC);

-- 6. alertas
CREATE TABLE IF NOT EXISTS alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lectura_id UUID NOT NULL REFERENCES lecturas_limpias(id) ON DELETE CASCADE,
    nivel_final TEXT NOT NULL
        CHECK (nivel_final IN ('VERDE', 'AMARILLO', 'NARANJA', 'ROJO')),
    confirmada_por_satelite BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_lectura_id ON alertas(lectura_id);

ALTER TABLE alertas DROP CONSTRAINT IF EXISTS alertas_lectura_id_fkey;
ALTER TABLE alertas
    ADD CONSTRAINT alertas_lectura_id_fkey
    FOREIGN KEY (lectura_id) REFERENCES lecturas_limpias(id) ON DELETE CASCADE
    NOT VALID;

-- 7. notificaciones_alertas (Registro de envíos a entidades y ciudadanos)
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

-- 8. administradores - acceso al dashboard interno
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
ALTER TABLE lecturas_crudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturas_limpias ENABLE ROW LEVEL SECURITY;
ALTER TABLE datos_satelitales ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas
DROP POLICY IF EXISTS "lectura publica nodos" ON nodos;
DROP POLICY IF EXISTS "lectura publica configuracion_nodos" ON configuracion_nodos;
DROP POLICY IF EXISTS "lectura publica lecturas crudas" ON lecturas_crudas;
DROP POLICY IF EXISTS "lectura publica lecturas limpias" ON lecturas_limpias;
DROP POLICY IF EXISTS "lectura publica datos_satelitales" ON datos_satelitales;
DROP POLICY IF EXISTS "lectura publica alertas" ON alertas;
DROP POLICY IF EXISTS "lectura publica notificaciones" ON notificaciones_alertas;
DROP POLICY IF EXISTS "admin ve su propio registro" ON administradores;

-- Políticas de lectura pública
CREATE POLICY "lectura publica nodos" ON nodos FOR SELECT USING (true);
CREATE POLICY "lectura publica configuracion_nodos" ON configuracion_nodos FOR SELECT USING (true);
CREATE POLICY "lectura publica lecturas crudas" ON lecturas_crudas FOR SELECT USING (true);
CREATE POLICY "lectura publica lecturas limpias" ON lecturas_limpias FOR SELECT USING (true);
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
