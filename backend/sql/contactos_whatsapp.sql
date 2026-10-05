-- Contactos autorizados para recibir avisos de alerta por WhatsApp.
--
-- Modelo de opt-in: solo se notifica a quien registró esta fila con
-- consentimiento='otorgado'. La Ley 1581 de 2012 (habeas data en Colombia)
-- exige que ese consentimiento sea previo, informado y revocable, por eso
-- queda registrado con fecha, método y evidencia.

CREATE TABLE IF NOT EXISTS contactos_whatsapp (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- E.164 sin espacios ni guiones: +573001234567. Es la clave natural del contacto.
    telefono text NOT NULL,
    nombre text NOT NULL,
    -- Entidad, comunidad, persona, nodo. Reutiliza el vocabulario que ya usa
    -- notificaciones_alertas.tipo_destinatario.
    tipo_destinatario text NOT NULL DEFAULT 'persona',
    -- Entidad opcional a la que pertenece: cuerpo de bomberos, comunidad, etc.
    entidad text,

    -- Consentimiento. Solo 'otorgado' recibe mensajes.
    consentimiento text NOT NULL DEFAULT 'pendiente',
    -- Cómo se obtuvo: enlace con token, formulario en el sitio, presencia, etc.
    metodo_consentimiento text,
    -- Texto que la persona aceptó, para poder demostrar qué se le informó.
    texto_consentimiento text,
    consentimiento_otorgado_en timestamptz,
    -- Si la persona revoca, se marca la fecha y deja de recibir mensajes.
    consentimiento_revocado_en timestamptz,

    -- Preferencias de aviso. Permite silenciar un canal sin borrar el contacto.
    recibe_alertas boolean NOT NULL DEFAULT true,
    recibe_confirmaciones boolean NOT NULL DEFAULT false,

    -- Niveles que esta persona quiere recibir. Un solo nivel basta para probar.
    niveles text[] NOT NULL DEFAULT ARRAY['AMARILLO','NARANJA','ROJO']::text[],

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Un teléfono es una persona: evita duplicados y dobles avisos.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contactos_whatsapp_telefono
    ON contactos_whatsapp (telefono);

-- Índice parcial de la consulta caliente: solo consentimientos vigentes.
CREATE INDEX IF NOT EXISTS idx_contactos_whatsapp_notificables
    ON contactos_whatsapp (consentimiento, recibe_alertas)
    WHERE consentimiento = 'otorgado';

CREATE INDEX IF NOT EXISTS idx_notificaciones_alertas_contacto
    ON notificaciones_alertas (contacto_id);
