"""Verifica el cifrado Web Push real contra un push service local.

No envía nada a internet: levanta un servidor HTTP que imita al push service,
registra una suscripción válida y comprueba que pywebpush cifra y entrega.
"""

import base64
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cryptography.hazmat.primitives import serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
from pywebpush import webpush  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

recibidos: list[dict] = []


class PushService(BaseHTTPRequestHandler):
    def do_POST(self):
        largo = int(self.headers.get("Content-Length", 0))
        cuerpo = self.rfile.read(largo)
        recibidos.append({
            "path": self.path,
            "len": len(cuerpo),
            "content_encoding": self.headers.get("Content-Encoding"),
            "ttl": self.headers.get("TTL"),
            "authorization": (self.headers.get("Authorization") or "")[:24],
            "cuerpo": cuerpo,
        })
        self.send_response(201)
        self.end_headers()

    def log_message(self, *_args):
        pass


def suscripcion_valida() -> dict:
    """Genera un par de claves como el que el navegador entrega al suscribirse."""
    clave = ec.generate_private_key(ec.SECP256R1())
    publica = clave.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    auth = os.urandom(16)
    return {
        "endpoint": "https://push.service.local/enviar/abc123",
        "keys": {
            "p256dh": base64.urlsafe_b64encode(publica).decode().rstrip("="),
            "auth": base64.urlsafe_b64encode(auth).decode().rstrip("="),
        },
    }


def main() -> int:
    servidor = HTTPServer(("127.0.0.1", 0), PushService)
    puerto = servidor.server_address[1]
    threading.Thread(target=servidor.serve_forever, daemon=True).start()

    suscripcion = suscripcion_valida()
    # Se apunta al servidor local conservando la forma https que exige el protocolo.
    suscripcion["endpoint"] = suscripcion["endpoint"].replace(
        "https://push.service.local", f"http://127.0.0.1:{puerto}"
    )
    # pywebpush exige https; para la prueba se relaja la validación del esquema.
    os.environ["PYWEBPUSH_ALLOW_HTTP"] = "1"

    payload = {
        "titulo": "Alerta de inundación ROJO",
        "cuerpo": "El nivel del río subió a ROJO (distancia 25 cm, subida 7.50 cm/min). Confirmada con datos satelitales.",
        "data": {"alerta_id": "test-1", "nivel": "ROJO", "url": "/#/alerts"},
    }

    try:
        webpush(
            subscription_info=suscripcion,
            data=json.dumps(payload).encode("utf-8"),
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
            vapid_claims={"sub": "mailto:soporte@sat.local"},
            ttl=3600,
        )
    except Exception as error:
        print(f"FALLO el envio real: {type(error).__name__}: {error}")
        servidor.shutdown()
        return 1

    servidor.shutdown()
    if not recibidos:
        print("FALLO: el push service no recibio nada")
        return 1

    peticion = recibidos[0]
    print(f"push service recibio POST {peticion['path']}")
    print(f"  cuerpo cifrado      : {peticion['len']} bytes")
    print(f"  Content-Encoding    : {peticion['content_encoding']}")
    print(f"  TTL                 : {peticion['ttl']}")
    print(f"  cabecera VAPID      : {peticion['authorization']}...")
    cuerpo = peticion["cuerpo"]
    # El cuerpo debe ir cifrado: no puede contener el texto en claro.
    if b"inundaci" in cuerpo or b"ROJO" in cuerpo:
        print("FALLO: el payload viaja sin cifrar")
        return 1
    print("  payload cifrado     : si (no se lee el texto en claro)")
    print("\nCifrado y entrega push verificados de punta a punta")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
