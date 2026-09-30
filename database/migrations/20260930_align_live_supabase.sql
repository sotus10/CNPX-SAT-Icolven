BEGIN;

ALTER TABLE public.lecturas_crudas
    ADD COLUMN IF NOT EXISTS nodo_codigo TEXT,
    ADD COLUMN IF NOT EXISTS datos_recibidos JSONB;

ALTER TABLE public.lecturas_crudas
    ALTER COLUMN nodo_id DROP NOT NULL,
    ALTER COLUMN distancia_cm DROP NOT NULL,
    ALTER COLUMN velocidad_cm_min DROP NOT NULL;

UPDATE public.lecturas_crudas
SET datos_recibidos = jsonb_build_object(
    'nodo_id', nodo_id,
    'distancia_cm', distancia_cm,
    'velocidad_cm_min', velocidad_cm_min
)
WHERE datos_recibidos IS NULL;

ALTER TABLE public.lecturas_crudas
    ALTER COLUMN datos_recibidos SET DEFAULT '{}'::jsonb,
    ALTER COLUMN datos_recibidos SET NOT NULL;

ALTER TABLE public.datos_satelitales
    ADD COLUMN IF NOT EXISTS lluvia_acumulada_24h NUMERIC(6,2);

COMMIT;
