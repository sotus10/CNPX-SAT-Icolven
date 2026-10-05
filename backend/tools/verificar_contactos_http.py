"""Comprueba los codigos de respuesta contra el servidor uvicorn ya arrancado.

A diferencia de `verificar_codigos_contacto.py` (que usa TestClient sobre el codigo
en memoria), este script habla por HTTP para confirmar que el proceso que esta
corriendoSirve el behaviour correcto.
"""

import sys

import requests

BASE = "http://127.0.0.1:8000"

CASOS = [
    ("get", "/whatsapp/contacto?telefono=3001234567", 422, "telefono ambiguo"),
    ("get", "/whatsapp/contacto?telefono=%2B573000000000", 503, "telefono valido, sin esquema"),
    ("get", "/whatsapp/estado", 200, "diagnostico del canal"),
    ("get", "/notificaciones/vapid", 503, "vapid, sin esquema"),
]


def main_() -> int:
    fallos = 0
    for metodo, ruta, esperado, etiqueta in CASOS:
        respuesta = requests.request(metodo, BASE + ruta, timeout=15)
        codigo = respuesta.status_code
        cuerpo = respuesta.json()
        detalle = cuerpo.get("detail") or cuerpo.get("modo") or ""
        marca = "OK" if codigo == esperado else "MAL"
        if marca == "MAL":
            fallos += 1
        print("[{}] {:30} {}  {}".format(marca, etiqueta, codigo, str(detalle)[:62]))

    print()
    print("Todo correcto" if fallos == 0 else "{} discrepancias".format(fallos))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main_())
