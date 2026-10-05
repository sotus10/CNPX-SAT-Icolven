-- DispositivosSUScritos a notificaciones push (Web Push / PWA).
-- El token es la suscripción opaca que entrega el navegador; nunca es un secreto
-- del usuario, pero sí permite enviarle mensajes, por eso se trata como dato sensible.

CREATE TABLE IF NOT EXISTS dispositivos_push (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identificador de la suscripción (endpoint + claves), no del dispositivo.
    suscripcion_json jsonb NOT NULL,
    -- Clave pública de la aplicación (VAPID) con la que se aceptó la suscripción.
    vapid_public_key text NOT NULL,
    -- Canal de entrega. Solo web_push por ahora; sms queda en notificaciones_alertas.
    canal text NOT NULL DEFAULT 'web_push',
    -- Estado del último envío a este dispositivo: activo, fallido, cancelado, desuscrito.
    estado text NOT NULL DEFAULT 'activo',
    -- Motivo del fallo más reciente, útil para depurar 404/410 de los push services.
    ultimo_error text,
    -- Contadores de auditoría de entrega.
    envios_exitosos integer NOT NULL DEFAULT 0,
    envios_fallidos integer NOT NULL DEFAULT 0,
    -- Contexto opcional para saber a quién se avisó (puesto, comunidad, teléfono).
    etiqueta text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Un endpoint de suscripción es único: evita duplicados al re-registrar el mismo
-- dispositivo desde otra pestaña.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dispositivos_push_suscripcion
    ON dispositivos_push ((suscripcion_json->>'endpoint'));

CREATE INDEX IF NOT EXISTS idx_dispositivos_push_estado
    ON dispositivos_push (estado);

-- Sólo se consultan suscripciones vigentes para despachar.
CREATE INDEX IF NOT EXISTS idx_dispositivos_push_vapid
    ON dispositivos_push (vapid_public_key)
    WHERE estado = 'activo';

-- Las notificaciones_alertas existentes registran envíos por canal a entidades.
-- Esta columna opcional enlaza un envío push con el dispositivo exacto.
ALTER TABLE notificaciones_alertas
    ADD COLUMN IF NOT EXISTS dispositivo_id uuid
        REFERENCES dispositivos_push (id) ON DELETE SET NULL;

ALTER TABLE notificaciones_alertas
    ADD COLUMN IF NOT EXISTS error_envio text;

CREATE INDEX IF NOT EXISTS idx_notificaciones_alertas_dispositivo
    ON notificaciones_alertas (dispositivo_id);
