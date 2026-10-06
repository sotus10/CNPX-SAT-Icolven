"""Pruebas del despacho push sin red ni Supabase.

Se aísla la lógica que decide y arma el mensaje; el envío real se comprueba en
la prueba de integración, contra un push service local.
"""

import json
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import contactos as cts
import main
import notificaciones as noti  # noqa: E402

SUBSCRIPCION_VALIDA = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/abc123",
    "expirationTime": None,
    "keys": {"p256dh": "clave-publica", "auth": "clave-autenticacion"},
}


class NormalizarSuscripcionTests(unittest.TestCase):
    def test_acepta_objeto_y_cadena(self):
        desde_objeto = noti._normalizar_suscripcion(SUBSCRIPCION_VALIDA)
        desde_cadena = noti._normalizar_suscripcion(json.dumps(SUBSCRIPCION_VALIDA))
        self.assertEqual(desde_objeto, desde_cadena)

    def test_rechaza_endpoint_no_https(self):
        with self.assertRaises(noti.ErrorNotificaciones):
            noti._normalizar_suscripcion({**SUBSCRIPCION_VALIDA, "endpoint": "http://inseguro"})

    def test_rechaza_claves_incompletas(self):
        sin_auth = {**SUBSCRIPCION_VALIDA, "keys": {"p256dh": "k"}}
        with self.assertRaises(noti.ErrorNotificaciones):
            noti._normalizar_suscripcion(sin_auth)

    def test_rechaza_json_invalido(self):
        with self.assertRaises(noti.ErrorNotificaciones):
            noti._normalizar_suscripcion("{no es json")


class DebeNotificarTests(unittest.TestCase):
    """La regla se apoya en decision.py, no en un criterio duplicado aquí."""

    def test_verde_nunca_notifica(self):
        self.assertFalse(noti.debe_notificar({"crear_alerta": False, "nivel_final": "VERDE"}))

    def test_niveles_alternos_si_notifican(self):
        for nivel in ("AMARILLO", "NARANJA", "ROJO"):
            with self.subTest(nivel=nivel):
                self.assertTrue(
                    noti.debe_notificar({"crear_alerta": True, "nivel_final": nivel})
                )

    def test_conserva_la_decision_de_decision_py(self):
        from decision import decidir_alerta

        ahora = datetime.now(timezone.utc)
        # Lluvia intensa y subida concordantes: la decisión real activa la alerta.
        # decision.py ahora expone decidir_alerta(lectura, satelite) -> (nivel, confirmada).
        nivel, confirmada = decidir_alerta(
            {
                "id": "L1",
                "nivel": "NARANJA",
                "distancia_cm": 40.0,
                "velocidad_cm_min": 6.0,
            },
            {
                "timestamp": ahora.isoformat(),
                "precipitacion": 15.0,
                "lluvia_acumulada_24h": 40.0,
            },
        )
        decision = {
            "crear_alerta": nivel != "VERDE",
            "nivel_final": nivel,
            "confirmada_por_satelite": confirmada,
        }
        self.assertTrue(decision["crear_alerta"])
        self.assertTrue(noti.debe_notificar(decision))

    def test_requiere_la_clave_crear_alerta(self):
        """`debe_notificar` corta con decision.get("crear_alerta"). Si main.py
        entrega un dict sin esa clave, los canales quedan mudos aunque haya
        alerta, y ningun otro test lo detecta porque todos los fixtures la
        incluyen."""
        self.assertFalse(noti.debe_notificar({"nivel_final": "ROJO"}))

    def test_contrato_de_la_decision_de_main(self):
        """La forma que main.py construye tras insertar la alerta."""
        decision_creada = {
            "crear_alerta": True,
            "nivel_sensor": "NARANJA",
            "nivel_final": "ROJO",
            "confirmada_por_satelite": True,
        }
        self.assertTrue(noti.debe_notificar(decision_creada))

        decision_sin_alerta = {
            "crear_alerta": False,
            "nivel_sensor": "VERDE",
            "nivel_final": "VERDE",
            "confirmada_por_satelite": False,
        }
        self.assertFalse(noti.debe_notificar(decision_sin_alerta))


class MensajeTests(unittest.TestCase):
    def test_incluye_nivel_y_confirmacion_satelital(self):
        mensaje = noti._mensaje(
            {"id": "A1"},
            {"nivel_final": "ROJO", "confirmada_por_satelite": True},
            {"distancia_cm": 25.0, "velocidad_cm_min": 7.5},
        )
        self.assertIn("ROJO", mensaje["titulo"])
        self.assertIn("25 cm", mensaje["cuerpo"])
        self.assertIn("7.50 cm/min", mensaje["cuerpo"])
        self.assertIn("Confirmada con datos satelitales", mensaje["cuerpo"])
        self.assertEqual(mensaje["data"]["url"], "/#/alerts")

    def test_texto_distingue_alerta_sin_confirmacion(self):
        mensaje = noti._mensaje(
            {"id": "A2"},
            {"nivel_final": "AMARILLO", "confirmada_por_satelite": False},
            {"distancia_cm": 70.0},
        )
        self.assertIn("Detectada por el sensor", mensaje["cuerpo"])
        self.assertNotIn("Confirmada", mensaje["cuerpo"])

    def test_tolera_lectura_vacia(self):
        mensaje = noti._mensaje({"id": "A3"}, {"nivel_final": "NARANJA"}, None)
        self.assertIn("sin mediciones", mensaje["cuerpo"])


class DespachoTests(unittest.TestCase):
    def test_no_envia_si_la_decision_no_amerita(self):
        with patch.object(noti, "obtener_dispositivos_activos") as dispositivos:
            resumen = noti.notificar_alerta(
                {"id": "A1"}, {"crear_alerta": False, "nivel_final": "VERDE"}
            )
        self.assertFalse(resumen["notificado"])
        dispositivos.assert_not_called()

    def test_omite_si_no_hay_suscriptores(self):
        with patch.object(noti, "obtener_dispositivos_activos", return_value=[]):
            resumen = noti.notificar_alerta(
                {"id": "A1"}, {"crear_alerta": True, "nivel_final": "ROJO"}
            )
        self.assertFalse(resumen["notificado"])
        self.assertIn("No hay dispositivos", resumen["motivo"])

    def test_envia_a_dispositivo_activo(self):
        decision = {"crear_alerta": True, "nivel_final": "ROJO", "confirmada_por_satelite": True}
        dispositivos = [{"id": "D1", "suscripcion_json": SUBSCRIPCION_VALIDA}]

        with (
            patch.object(noti, "obtener_dispositivos_activos", return_value=dispositivos),
            patch.object(noti, "_enviar_uno", return_value=(True, None)) as enviar,
            patch.object(noti, "_ya_notificado", return_value=False),
            patch.object(noti, "_acumular_envio"),
            patch.object(noti, "_auditar_envio") as auditar,
        ):
            resumen = noti.notificar_alerta({"id": "A1"}, decision)

        self.assertTrue(resumen["notificado"])
        self.assertEqual(resumen["enviados"], 1)
        self.assertEqual(resumen["fallidos"], 0)
        enviar.assert_called_once()
        auditar.assert_called_once_with("A1", "D1", "enviado")

    def test_no_reenvia_la_misma_alerta_al_mismo_dispositivo(self):
        decision = {"crear_alerta": True, "nivel_final": "ROJO"}
        dispositivos = [{"id": "D1", "suscripcion_json": SUBSCRIPCION_VALIDA}]

        with (
            patch.object(noti, "obtener_dispositivos_activos", return_value=dispositivos),
            patch.object(noti, "_enviar_uno", return_value=(True, None)) as enviar,
            patch.object(noti, "_ya_notificado", return_value=True),
            patch.object(noti, "_acumular_envio"),
            patch.object(noti, "_auditar_envio"),
        ):
            resumen = noti.notificar_alerta({"id": "A1"}, decision)

        self.assertEqual(resumen["omitidos"], 1)
        enviar.assert_not_called()

    def test_elimina_suscripcion_caducada(self):
        class Respuesta:
            status_code = 410

        class Error:
            response = Respuesta()

        dispositivos = [{"id": "D1", "suscripcion_json": SUBSCRIPCION_VALIDA}]
        cliente = unittest.mock.MagicMock()

        with (
            patch.object(noti, "obtener_dispositivos_activos", return_value=dispositivos),
            patch.object(noti, "_enviar_uno", return_value=(False, "410: subscription_gone")),
            patch.object(noti, "_ya_notificado", return_value=False),
            patch.object(noti, "_auditar_envio"),
            patch.object(noti, "_require_supabase", return_value=cliente),
        ):
            resumen = noti.notificar_alerta(
                {"id": "A1"}, {"crear_alerta": True, "nivel_final": "ROJO"}
            )

        self.assertEqual(resumen["fallidos"], 1)
        self.assertEqual(cliente.table.return_value.delete.return_value.eq.return_value.execute.call_count, 1)

    def test_un_fallo_de_red_no_propaga_excepcion(self):
        dispositivos = [{"id": "D1", "suscripcion_json": SUBSCRIPCION_VALIDA}]

        with (
            patch.object(noti, "obtener_dispositivos_activos", return_value=dispositivos),
            patch.object(noti, "_enviar_uno", return_value=(False, "500: push service caido")),
            patch.object(noti, "_ya_notificado", return_value=False),
            patch.object(noti, "_auditar_envio"),
            patch.object(noti, "_acumular_envio"),
            patch.object(noti, "_marcar_dispositivo") as marcar,
        ):
            resumen = noti.notificar_alerta(
                {"id": "A1"}, {"crear_alerta": True, "nivel_final": "NARANJA"}
            )

        self.assertEqual(resumen["fallidos"], 1)
        marcar.assert_called_once()
        self.assertEqual(marcar.call_args[0][1], noti.ESTADO_FALLIDO)


class EsquemaAusenteTests(unittest.TestCase):
    """Sin la tabla aplicada, el error debe ser accionable y no un 500 genérico."""

    def test_detecta_tabla_inexistente(self):
        cliente = unittest.mock.MagicMock()
        cliente.table.return_value.select.return_value.limit.return_value.execute.side_effect = (
            Exception("{'code': 'PGRST205', 'message': \"Could not find the table 'public.dispositivos_push'\"}")
        )
        with self.assertRaises(noti.ErrorEsquemaPush) as contexto:
            noti._require_esquema_push(cliente)
        self.assertIn("dispositivos_push.sql", str(contexto.exception))

    def test_no_confunde_otros_errores_con_esquema(self):
        cliente = unittest.mock.MagicMock()
        cliente.table.return_value.select.return_value.limit.return_value.execute.side_effect = (
            Exception("connection reset by peer")
        )
        with self.assertRaises(Exception) as contexto:
            noti._require_esquema_push(cliente)
        self.assertNotIsInstance(contexto.exception, noti.ErrorEsquemaPush)

    def test_esquema_ausente_es_error_de_notificaciones(self):
        self.assertTrue(
            issubclass(noti.ErrorEsquemaPush, noti.ErrorNotificaciones)
        )


class ColisionDeNombresTests(unittest.TestCase):
    """`main` importa este modulo y `contactos`. Si ambos definen un error de
    esquema con el mismo nombre, el segundo `import` pisa al primero y los
    endpoints devuelven 422 donde deberian devolver 503. Se comprueba que los
    alias que usa `main` apunten a la clase correcta."""

    def test_alias_de_push_apunta_a_notificaciones(self):
        self.assertIs(main.ErrorEsquemaPush, noti.ErrorEsquemaPush)

    def test_alias_de_contactos_apunta_a_contactos(self):
        self.assertIs(main.ErrorEsquemaContactos, cts.ErrorEsquemaAusente)

    def test_las_dos_clases_son_distintas(self):
        self.assertIsNot(noti.ErrorEsquemaPush, cts.ErrorEsquemaAusente)


if __name__ == "__main__":
    unittest.main()
