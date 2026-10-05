"""Verifica los codigos de respuesta de los endpoints de contacto sin depender
del proceso de uvicorn: usa TestClient, que carga el codigo en memoria."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

CASOS = [
    ("/whatsapp/contacto?telefono=3001234567", "numero ambiguo"),
    ("/whatsapp/contacto?telefono=%2B573000000000", "numero valido, tabla ausente"),
    ("/whatsapp/estado", "diagnostico del canal"),
    ("/notificaciones/vapid", "vapid, tabla dispositivos ausente"),
]


def main_() -> int:
    cliente = TestClient(main.app, raise_server_exceptions=False)
    esperado = {
        "numero ambiguo": 422,
        "numero valido, tabla ausente": 503,
        "diagnostico del canal": 200,
        "vapid, tabla dispositivos ausente": 503,
    }

    fallos = 0
    for ruta, etiqueta in CASOS:
        respuesta = cliente.get(ruta)
        codigo = respuesta.status_code
        detalle = respuesta.json().get("detail") or respuesta.json().get("modo")
        marca = "OK" if codigo == esperado[etiqueta] else "MAL"
        if marca == "MAL":
            fallos += 1
        print(f"[{marca}] {etiqueta:34} {codigo}  {str(detalle)[:70]}")

    # El POST debe distinguir dato invalido (422) de esquema ausente (503).
    respuesta = cliente.post("/whatsapp/contactos", json={"telefono": "3001234567", "nombre": "Ana"})
    marca = "OK" if respuesta.status_code == 422 else "MAL"
    if marca == "MAL":
        fallos += 1
    print(f"[{marca}] {'POST numero ambiguo':34} {respuesta.status_code}  {respuesta.json().get('detail')}")

    respuesta = cliente.post(
        "/whatsapp/contactos",
        json={"telefono": "+573000000000", "nombre": "Ana", "consentimiento": "otorgado"},
    )
    marca = "OK" if respuesta.status_code == 422 else "MAL"
    if marca == "MAL":
        fallos += 1
    print(f"[{marca}] {'POST sin metodo (consent)':34} {respuesta.status_code}  {respuesta.json().get('detail')}")

    print()
    print("Todo correcto" if fallos == 0 else f"{fallos} discrepancias")
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main_())
