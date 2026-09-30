# Instrucciones detalladas — `limpieza.py`

Este documento es tu guía para construir `limpieza.py`. Igual que con las instrucciones de Elías: te explico el proceso paso a paso, con ejemplos de la **técnica** a usar (no el archivo final), para que lo armes tú mismo entendiendo el porqué de cada parte.

---

## Por qué existe este archivo (y por qué va ANTES de `crud.py`, no después)

`clima.py` está bien resuelto y `crud.py` guarda lo que le des — pero ninguno de los dos verifica que el dato que le llega **tenga sentido físico**. Si el sensor manda un dato corrupto (por ruido eléctrico, un cable flojo, o una interferencia en la transmisión LoRa), sin este filtro ese dato corrupto se guardaría en Supabase igual que uno real, y podría hasta disparar una alarma falsa en el pueblo.

`limpieza.py` es el **filtro que se para entre lo que llega del nodo receptor y lo que se guarda en la base de datos**. Nada debería llegar a `crud.insertar_lectura()` sin pasar primero por aquí.

---

## Paso 1: Definir las reglas exactas, ANTES de escribir código

Antes de programar nada, escribe en un comentario o en un papel cuáles son los límites válidos para cada campo. Estas son las reglas que ya quedaron definidas en otras partes del proyecto — tu trabajo es traerlas a este archivo, no inventar unas nuevas:

| Campo | Regla | De dónde sale este límite |
|---|---|---|
| `distancia_cm` | Debe estar entre 2 y 450 | Es el mismo rango físico que ya usa el firmware del transmisor (`DISTANCIA_MIN_VALIDA_CM` / `DISTANCIA_MAX_VALIDA_CM`) |
| `nivel` | Debe ser exactamente uno de: `VERDE`, `AMARILLO`, `NARANJA`, `ROJO` | Son los únicos 4 valores que el firmware puede enviar |
| `velocidad_cm_min` | Debe estar en un rango razonable, ej. entre -50 y 50 | Una velocidad de subida/bajada más extrema que eso es más probable que sea un error de cálculo que una creciente real — número a ajustar con el equipo si hace falta |
| `nodo` | No puede venir vacío ni ser solo espacios | Evita que un mensaje corrupto cree un "nodo fantasma" con nombre vacío |

**Antes de seguir al paso 2:** si no estás seguro de algún límite, pregúntale al equipo — mejor confirmarlo ahora que corregirlo después de que todos ya estén usando el archivo.

---

## Paso 2: Escribir una función de validación POR CADA campo (no todo junto)

Es más fácil de leer, probar y corregir si cada regla vive en su propia función pequeña, en vez de un solo bloque gigante con muchos `if`.

**Técnica a usar (ejemplo genérico, no tu código final):**
```python
def validar_rango(valor: float, minimo: float, maximo: float, nombre_campo: str) -> None:
    """
    No devuelve nada si todo está bien. Si el valor está fuera de rango,
    lanza un error con un mensaje claro de qué campo falló y por qué.
    """
    if valor < minimo or valor > maximo:
        raise ValueError(f"{nombre_campo} fuera de rango: {valor} (debe estar entre {minimo} y {maximo})")
```
Fíjate en dos decisiones de diseño en este ejemplo, que debes replicar en las tuyas:
- **Lanza una excepción (`raise ValueError`) en vez de devolver `True`/`False` o `None`.** Esto es importante: así, quien use tu función se ENTERA de inmediato de qué falló y por qué (el mensaje viaja con el error), en vez de tener que adivinar por qué recibió un `False` sin contexto.
- **El mensaje de error incluye el valor recibido y el rango esperado.** Esto ahorra tiempo de depuración — sin esto, alguien viendo el log solo sabría "algo falló", no qué ni por qué.

Repite este mismo patrón para escribir:
- `validar_nivel(nivel: str) -> None` (revisa que esté en la lista de 4 valores válidos — pista: usa el operador `in` contra una lista o tupla)
- `validar_texto_no_vacio(texto: str, nombre_campo: str) -> None` (revisa que no sea `""` ni solo espacios — pista: el método `.strip()` de los strings te sirve para detectar "solo espacios")

---

## Paso 3: Decidir qué se "limpia" además de lo que se "valida"

Validar es rechazar lo que está mal. Limpiar es además **corregir lo que se puede corregir sin perder información real**. Dos ejemplos de cosas que sí vale la pena normalizar antes de guardar:

- Si el firmware manda `"naranja"` en minúscula por algún motivo, en vez de rechazarlo de una, conviértelo a mayúscula (`"naranja".upper()` → `"NARANJA"`) ANTES de validarlo contra la lista de niveles válidos. Así un detalle de formato no tumba un dato real.
- Redondea `distancia_cm` y `velocidad_cm_min` a 1-2 decimales antes de guardar (`round(valor, 1)`), para que la base de datos no se llene de números con precisión falsa que el sensor ni siquiera tiene.

**Pregunta para decidir tú mismo:** ¿qué otros campos del mensaje valdría la pena normalizar así antes de guardarlos? (Piensa en el nombre del nodo, por ejemplo — ¿debería ir siempre en mayúsculas?)

---

## Paso 4: Juntar todo en una única función central

Esta es la función que el resto del sistema (el endpoint POST de `main.py`) va a llamar — las funciones del Paso 2 son piezas internas que esta función va a usar, no algo que otros archivos deban llamar directamente.

**Técnica a usar (ejemplo genérico, no tu código final):**
```python
def limpiar_algo(datos: dict) -> dict:
    """
    Recibe un diccionario con los datos crudos. Si todo es válido,
    devuelve un diccionario limpio y normalizado. Si algo está mal,
    lanza ValueError con un mensaje describiendo el problema.
    """
    # 1. Normalizar primero (Paso 3)
    datos["campo_texto"] = datos["campo_texto"].strip().upper()

    # 2. Validar cada campo (Paso 2) — si alguna falla, aquí se detiene
    #    todo automáticamente porque raise interrumpe la ejecución.
    validar_rango(datos["campo_numero"], 0, 100, "campo_numero")
    validar_texto_no_vacio(datos["campo_texto"], "campo_texto")

    return datos
```
Fíjate que no necesitas juntar los errores en una lista ni nada complejo — en Python, en cuanto una validación lanza `raise`, la ejecución se detiene ahí mismo y ninguna línea después corre. Eso es justamente lo que quieres: no seguir "limpiando" algo que ya sabes que está mal.

Tu función real se va a llamar algo como `limpiar_lectura(datos: dict) -> dict`, y va a validar los 4 campos de la tabla del Paso 1, en el orden que prefieras.

---

## Paso 5: Escribir tus propios casos de prueba (como `test_crud.py`)

Antes de darlo por terminado, crea un `test_limpieza.py` que pruebe la función con casos reales, a mano — igual que ya existe `test_crud.py` para las funciones de base de datos.

**Casos mínimos que debes probar (esto sí te lo doy completo, porque es la lista de qué probar, no el código):**
1. Un caso 100% válido → no debe lanzar ningún error.
2. Una `distancia_cm` fuera de rango (ej. `500`) → debe lanzar `ValueError` mencionando "distancia_cm".
3. Un `nivel` inválido (ej. `"AZUL"`) → debe lanzar `ValueError` mencionando "nivel".
4. Una `velocidad_cm_min` absurda (ej. `9999`) → debe lanzar `ValueError`.
5. Un `nodo` vacío (`""`) → debe lanzar `ValueError`.
6. Un `nivel` en minúscula (ej. `"naranja"`) → NO debe lanzar error (porque el Paso 3 lo normaliza a mayúscula antes de validar) — este caso confirma que la normalización funciona, no solo la validación.

**Técnica para probar que SÍ lanza el error esperado (ejemplo genérico):**
```python
try:
    limpiar_algo({"campo_numero": 500, "campo_texto": "ok"})
    print("[FALLO] Debió lanzar un error y no lo hizo")
except ValueError as e:
    print(f"[OK] Lanzó el error esperado: {e}")
```

---

## Paso 6: Cómo se va a conectar esto con `main.py` (para que lo tengas en mente, sin escribirlo todavía)

Cuando llegue el momento de armar el endpoint `POST /api/lecturas`, el orden de llamadas va a ser:

```
datos del ESP32 → limpieza.limpiar_lectura(datos)  → si falla, responder error 422 al instante
                        ↓ (si todo bien)
                  crud.insertar_lectura(...)
                        ↓
                  decision.decidir_alerta(...)
                        ↓
                  crud.insertar_alerta(...)
```

No necesitas escribir esa parte todavía — solo tenla en mente mientras diseñas `limpiar_lectura()`, para que su forma de entrada y salida (qué recibe, qué devuelve, qué lanza) encaje bien cuando llegue ese momento.

---

## Requisitos de finalización

- [ ] Las 4 validaciones (`distancia_cm`, `nivel`, `velocidad_cm_min`, `nodo`) están escritas como funciones separadas y pequeñas.
- [ ] Al menos una normalización (mayúsculas, redondeo, o `.strip()`) está aplicada antes de validar.
- [ ] Existe una función central `limpiar_lectura()` que combina todo y lanza `ValueError` con un mensaje claro cuando algo falla.
- [ ] `test_limpieza.py` existe y prueba los 6 casos del Paso 5, todos con el resultado esperado confirmado a mano.
- [ ] Le avisaste al equipo (o a quien conecte `main.py`) que `limpieza.py` ya está listo para usarse antes de `crud.insertar_lectura()`.
