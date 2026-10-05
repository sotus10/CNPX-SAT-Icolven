# Plantillas de alerta de inundación para WhatsApp Business

Meta exige que los mensajes iniciados por el negocio usen **plantillas
preaprobadas**. Un texto libre solo se permite dentro de la ventana de atención
de 24 horas, y un aviso de crecida se manda a personas que no te escribieron
antes: siempre cae fuera de esa ventana. Por eso no hay ningún camino de texto
libre en el código.

## Cómo crearlas

WhatsApp Manager → Plantillas de mensajes → Crear.

- **Categoría:** `UTILITY` (es una alerta operativa, no publicidad)
- **Idioma:** `es`
- **Revisión:** puede tardar hasta 24 horas; el estado debe quedar `APPROVED`

Después de aprobarlas, márcalas en `backend/.env`:

```
WHATSAPP_PLANTILLA_APROBADA_ROJO=1
WHATSAPP_PLANTILLA_APROBADA_NARANJA=1
WHATSAPP_PLANTILLA_APROBADA_AMARILLO=1
```

## Variables

El orden de las variables debe coincidir con `backend/whatsapp.py::_payload`:

| # | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | nivel final | `ROJO` |
| `{{2}}` | distancia en cm | `25` |
| `{{3}}` | velocidad en cm/min | `7.50` |
| `{{4}}` | confirmada por satélite | `sí` / `no` |

---

## 1. `alerta_inundacion_rojo` — evacuación

```
🚨 ALERTA ROJA de inundación. El río en Icolven subió a nivel ROJO: distancia {{2}} cm, velocidad {{3}} cm/min. Confirmada por satélite: {{4}}. Evacúe de inmediato las zonas ribereñas y siga las indicaciones del comando de emergencias.
```

## 2. `alerta_inundacion_naranja` — prevención

```
⚠️ ALERTA NARANJA de inundación. El río en Icolven subió a nivel NARANJA: distancia {{2}} cm, velocidad {{3}} cm/min. Confirmada por satélite: {{4}}. Manténgase alerteado y prepare la evacuación de la rivera baja.
```

## 3. `alerta_inundacion_amarillo` — vigilancia

```
ℹ️ ALERTA AMARILLA de inundación. El río en Icolven subió a nivel AMARILLO: distancia {{2}} cm, velocidad {{3}} cm/min. Confirmada por satélite: {{4}}. No hay acción urgente; evite la rivera y siga las actualizaciones.
```

---

## Notas de redacción

Para que Meta no devuelva las plantillas:

- **Sin URLs ni enlaces.** En categoría `UTILITY` se rechazan.
- **Emojis permitidos** en el cuerpo, no en el nombre de la plantilla.
- **Sin `solicitation`.** No pidas respuestas ni confirmaciones dentro de estas.
  Si más adelante quieres recabar confirmación de evacuación, eso es una
  plantilla aparte, también `UTILITY`.
- **Sin MAYÚSCULAS sostenidas** tipo `EVACÚE YA`. Reduce la calidad de cuenta.
- Cambia "comando de emergencias" por el nombre real de la entidad responsable.

## Verificación

```
GET /whatsapp/estado
```

Devuelve el modo, si las credenciales están completas y qué plantillas están
marcadas como aprobadas. Con `modo: simulacion` nada sale a internet aunque
las plantillas estén aprobadas.
