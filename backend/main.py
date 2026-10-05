import hmac
import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).with_name(".env"))

from supabase_client import supabase
from clima import obtener_clima, obtener_datos_satelitales
from conectividad import evaluar_nodos
from crud import (
    asociar_lectura_cruda_nodo,
    insertar_alerta,
    insertar_lectura,
    insertar_lectura_cruda,
    obtener_configuracion_nodos,
    obtener_datos_satelitales_recientes,
    obtener_historial_lecturas,
    obtener_lecturas_crudas,
    obtener_lecturas_limpias_por_nodo,
    obtener_nodo_id,
    obtener_nodos,
    obtener_notificaciones_alertas,
    obtener_todas_las_alertas,
    obtener_ultima_lectura,
    obtener_ultimas_lecturas,
)
from contactos import (
    ErrorConsentimiento,
    ErrorContactos,
    consultar_contacto,
    normalizar_telefono,
    obtener_contactos_notificables,
    registrar_contacto,
    revocar_consentimiento,
)
from contactos import ErrorEsquemaAusente as ErrorEsquemaContactos
from decision import evaluar_alerta_fusionada
from limpieza import limpiar_lectura
from notificaciones import (
    ErrorEsquemaPush,
    ErrorNotificaciones,
    clave_publica_vapid,
    contar_dispositivos_activos,
    desregistrar_dispositivo,
    notificar_alerta,
    registrar_dispositivo,
    vapid_configurado,
)
from whatsapp import estado_modo as whatsapp_estado_modo
from whatsapp import notificar_alerta_whatsapp


app = FastAPI(
    title="SAT Backend API - Sistema de Alerta Temprana",
    description="API REST del Sistema de Alerta Temprana (SAT) para Icolven.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        # Rangos de Tailscale, necesarios para probar la PWA desde el celular.
        "https://*.ts.net",
        "http://*.ts.net",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LATITUD = float(os.getenv("LATITUD_RIO", os.getenv("SATELLITE_LATITUDE", "6.244")))
LONGITUD = float(os.getenv("LONGITUD_RIO", os.getenv("SATELLITE_LONGITUDE", "-75.581")))


def verificar_api_key(api_key: str | None) -> None:
    clave_configurada = os.getenv("NODE_API_KEY")
    if not clave_configurada:
        raise HTTPException(status_code=503, detail="La API key del nodo no está configurada")
    if api_key is None or not hmac.compare_digest(api_key, clave_configurada):
        raise HTTPException(status_code=401, detail="API key inválida")


@app.get("/")
def read_root():
    if supabase is None:
        return {
            "status": "degraded",
            "message": "Supabase no está configurado",
            "supabase_connected": False,
        }
    try:
        supabase.table("nodos").select("id").limit(0).execute()
    except Exception as error:
        print(f"[ERROR] La verificación de Supabase falló: {error}")
        return {
            "status": "degraded",
            "message": "No se pudo verificar la conexión con Supabase",
            "supabase_connected": False,
        }
    return {
        "status": "online",
        "message": "SAT Backend API funcionando correctamente",
        "supabase_connected": True,
    }


@app.get("/satelital")
def get_datos_satelitales(
    latitud: float = Query(LATITUD, ge=-90, le=90),
    longitud: float = Query(LONGITUD, ge=-180, le=180),
):
    """Devuelve precipitación horaria histórica, actual y pronosticada de Open-Meteo."""
    datos = obtener_datos_satelitales(latitud, longitud)
    if datos is None:
        raise HTTPException(status_code=502, detail="No fue posible consultar Open-Meteo.")
    return datos


@app.get("/ultima-lectura")
def get_ultima_lectura():
    lectura = obtener_ultima_lectura()
    if not lectura:
        raise HTTPException(status_code=404, detail="No se encontraron lecturas registradas.")
    return {"status": "success", "data": lectura}


@app.get("/historial")
def get_historial(limite: int = Query(default=20, ge=1, le=500)):
    historial = obtener_historial_lecturas(limite=limite)
    return {"status": "success", "total": len(historial), "data": historial}


@app.get("/alertas")
def get_alertas(limite: int = Query(default=20, ge=1, le=500)):
    alertas = obtener_todas_las_alertas(limite=limite)
    return {"status": "success", "total": len(alertas), "data": alertas}


@app.get("/lecturas-crudas")
def get_lecturas_crudas(
    limite: int = Query(default=100, ge=1, le=500),
    nodo_id: str | None = Query(default=None),
):
    """Lecturas sin filtrar, para auditar la eficiencia del algoritmo de limpieza."""
    lecturas = obtener_lecturas_crudas(limite=limite, nodo_id=nodo_id)
    return {"status": "success", "total": len(lecturas), "data": lecturas}


@app.get("/configuracion")
def get_configuracion_nodos():
    """Umbrales de peligro y límite de velocidad por nodo."""
    configuracion = obtener_configuracion_nodos()
    return {"status": "success", "total": len(configuracion), "data": configuracion}


@app.get("/nodos")
def get_nodos():
    """Nodos registrados con su conectividad derivada de la última lectura."""
    try:
        nodos = obtener_nodos()
        lecturas_recientes = obtener_lecturas_limpias_por_nodo()
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudo consultar los nodos") from error
    evaluados = evaluar_nodos(nodos, lecturas_recientes)
    return {"status": "success", "total": len(evaluados), "data": evaluados}


@app.get("/notificaciones")
def get_notificaciones(limite: int = Query(default=200, ge=1, le=500)):
    """Envíos a la comunidad por canal, para medir la efectividad de la notificación."""
    notificaciones = obtener_notificaciones_alertas(limite=limite)
    return {"status": "success", "total": len(notificaciones), "data": notificaciones}


@app.get("/notificaciones/vapid")
def get_vapid():
    """Clave pública VAPID para que el navegador construya la suscripción.

    Se expone a propósito sin autenticación: es pública por diseño y sin ella el
    service worker no puede cifrar el mensaje para el dispositivo.
    """
    if not vapid_configurado():
        raise HTTPException(
            status_code=503,
            detail="El servidor no tiene claves VAPID configuradas",
        )
    try:
        dispositivos = contar_dispositivos_activos()
    except ErrorEsquemaPush as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {
        "status": "success",
        "clave_publica": clave_publica_vapid(),
        "dispositivos_activos": dispositivos,
    }


@app.get("/whatsapp/estado")
def get_whatsapp_estado():
    """Diagnóstico del canal: qué falta para poder enviar de verdad."""
    return {"status": "success", **whatsapp_estado_modo()}


@app.post("/whatsapp/contactos", status_code=201)
async def post_contacto_whatsapp(request: Request):
    """Registra un contacto y su consentimiento.

    El consentimiento se guarda con método y texto, porque bajo la Ley 1581
    de 2012 hay que poder demostrar qué se le informó y cómo lo aceptó.
    """
    try:
        cuerpo = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=422, detail="El cuerpo debe ser JSON válido") from error

    if not isinstance(cuerpo, dict):
        raise HTTPException(status_code=422, detail="El cuerpo debe ser un objeto JSON")

    try:
        resultado = registrar_contacto(
            telefono=cuerpo.get("telefono"),
            nombre=cuerpo.get("nombre"),
            consentimiento=cuerpo.get("consentimiento", "pendiente"),
            metodo_consentimiento=cuerpo.get("metodo_consentimiento"),
            texto_consentimiento=cuerpo.get("texto_consentimiento"),
            niveles=cuerpo.get("niveles"),
            tipo_destinatario=cuerpo.get("tipo_destinatario", "persona"),
            entidad=cuerpo.get("entidad"),
        )
    except ErrorConsentimiento as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ErrorEsquemaContactos as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ErrorContactos as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudo registrar el contacto") from error

    return {"status": "success", **resultado}


@app.post("/whatsapp/consentimiento/revocar")
async def post_revocar_consentimiento(request: Request):
    """Revoca el consentimiento. El contacto deja de recibir mensajes de inmediato."""
    try:
        cuerpo = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=422, detail="El cuerpo debe ser JSON válido") from error

    if not isinstance(cuerpo, dict):
        raise HTTPException(status_code=422, detail="El cuerpo debe ser un objeto JSON")

    try:
        revocado = revocar_consentimiento(cuerpo.get("telefono"))
    except ErrorEsquemaContactos as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ErrorContactos as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return {"status": "success", "revocado": revocado}


@app.get("/whatsapp/contacto")
def get_contacto_whatsapp(telefono: str = Query(..., description="Teléfono en E.164")):
    """Estado de un número, para la configuración del perfil.

    Solo devuelve consentimiento y preferencias. No expone la lista de contactos.
    """
    try:
        contacto = consultar_contacto(telefono)
    except ErrorEsquemaContactos as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ErrorConsentimiento as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ErrorContactos as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return {"status": "success", "registrado": contacto is not None, "data": contacto}


@app.get("/whatsapp/contactos/notificables")
def get_contactos_notificables(nivel: str = Query(...)):
    """Dry-run: a quién se avisaría para este nivel, sin enviar nada."""
    try:
        contactos = obtener_contactos_notificables(nivel)
    except ErrorEsquemaContactos as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=500, detail="No se pudieron consultar los contactos"
        ) from error

    return {
        "status": "success",
        "nivel": nivel.upper(),
        "total": len(contactos),
        "data": contactos,
    }


@app.post("/notificaciones/suscripcion", status_code=201)
async def post_suscripcion(request: Request):
    """Registra la suscripción Web Push de un dispositivo.

    Sin API key a propósito: la llamada la hace el navegador de un suscriptor
    anónimo, no el nodo. El único dato que se guarda es la suscripción opaca.
    """
    if not vapid_configurado():
        raise HTTPException(status_code=503, detail="El servidor no tiene claves VAPID configuradas")
    try:
        cuerpo = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=422, detail="El cuerpo debe ser JSON válido") from error

    if not isinstance(cuerpo, dict):
        raise HTTPException(status_code=422, detail="El cuerpo debe ser un objeto JSON")

    try:
        resultado = registrar_dispositivo(
            cuerpo.get("suscripcion"),
            vapid_public_key=cuerpo.get("clave_publica"),
            etiqueta=cuerpo.get("etiqueta"),
        )
    except ErrorEsquemaPush as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ErrorNotificaciones as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=500, detail="No se pudo registrar el dispositivo"
        ) from error

    return {"status": "success", **resultado}


@app.delete("/notificaciones/suscripcion")
async def delete_suscripcion(request: Request):
    """Da de baja un dispositivo. Repetirlo es seguro aunque ya no exista."""
    try:
        cuerpo = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=422, detail="El cuerpo debe ser JSON válido") from error

    if not isinstance(cuerpo, dict):
        raise HTTPException(status_code=422, detail="El cuerpo debe ser un objeto JSON")

    try:
        eliminado = desregistrar_dispositivo(cuerpo.get("suscripcion"))
    except ErrorNotificaciones as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {"status": "success", "eliminado": eliminado}


@app.post("/api/lecturas", status_code=201)
async def recibir_lectura(
    request: Request,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    verificar_api_key(x_api_key)
    try:
        datos_recibidos = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=422, detail="El cuerpo debe ser JSON válido") from error

    try:
        lectura_cruda_id = insertar_lectura_cruda(datos_recibidos)
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudo guardar la lectura cruda") from error

    try:
        datos_limpios = limpiar_lectura(datos_recibidos)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    try:
        nodo_uuid = obtener_nodo_id(datos_limpios["nodo_id"])
        if nodo_uuid is None:
            raise HTTPException(
                status_code=422,
                detail=f"El nodo '{datos_limpios['nodo_id']}' no está registrado",
            )

        asociar_lectura_cruda_nodo(lectura_cruda_id, nodo_uuid)
        lectura = insertar_lectura(
            nodo_uuid,
            datos_limpios["distancia_cm"],
            datos_limpios["velocidad_cm_min"],
            datos_limpios["nivel"],
            lectura_cruda_id,
        )
        try:
            lecturas_recientes = obtener_ultimas_lecturas(limite=6, nodo_id=nodo_uuid)
        except Exception as error:
            # El historial solo aporta corroboración; no debe bloquear la regla
            # de seguridad basada en la medición recién recibida.
            print(f"[WARN] No se pudo consultar tendencia del río: {error}")
            lecturas_recientes = []
        try:
            datos_satelitales = obtener_datos_satelitales_recientes()
        except Exception as error:
            print(f"[WARN] No se pudo consultar contexto satelital: {error}")
            datos_satelitales = []

        decision = evaluar_alerta_fusionada(
            lectura[0],
            lecturas_recientes=lecturas_recientes,
            datos_satelitales=datos_satelitales,
        )
        alerta = None
        if decision["crear_alerta"]:
            alerta = insertar_alerta(
                lectura[0]["id"],
                decision["nivel_final"],
                confirmada_por_satelite=decision["confirmada_por_satelite"],
            )

        # Los avisos a celulares y a WhatsApp reutilizan la decisión ya resuelta
        # arriba. Van best-effort: si un canal falla, la lectura y su alerta
        # quedan igualmente registradas y la API sigue respondiendo 201.
        canales: dict[str, Any] = {
            "motivo": "No se creó alerta para esta lectura"
        }
        if alerta:
            try:
                canales["push"] = notificar_alerta(alerta[0], decision, lectura[0])
            except Exception as error:  # noqa: BLE001
                canales["push"] = {"notificado": False, "motivo": str(error)[:200]}
                print(f"[WARN] Fallo el push: {error}")
            try:
                canales["whatsapp"] = notificar_alerta_whatsapp(alerta[0], decision, lectura[0])
            except Exception as error:  # noqa: BLE001
                canales["whatsapp"] = {"notificado": False, "motivo": str(error)[:200]}
                print(f"[WARN] Fallo el envío por WhatsApp: {error}")

        return {
            "status": "success",
            "lectura": lectura[0],
            "alerta": alerta[0] if alerta else None,
            "decision": decision,
            "notificacion": canales,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudo procesar la lectura") from error


@app.post("/clima/actualizar")
def registrar_datos_clima_automatico():
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase no está disponible")

    datos_clima = obtener_clima(LATITUD, LONGITUD)
    if datos_clima is None:
        raise HTTPException(status_code=503, detail="No se pudieron obtener datos de Open-Meteo")

    registro = {
        "precipitacion": float(datos_clima.get("lluvia_ultima_hora") or 0.0),
        "lluvia_acumulada_24h": float(datos_clima.get("lluvia_acumulada_24h") or 0.0),
        "fuente": "open-meteo",
    }
    try:
        respuesta = supabase.table("datos_satelitales").insert(registro).execute()
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudieron guardar los datos en Supabase") from error
    return {
        "status": "success",
        "message": "Datos de clima registrados correctamente",
        "data": respuesta.data,
    }


@app.get("/clima/historial")
def ver_historial_clima():
    try:
        historial = obtener_datos_satelitales_recientes()
    except Exception as error:
        raise HTTPException(status_code=500, detail="No se pudo consultar el historial en Supabase") from error
    return {"datos_satelitales": historial}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
