"""Pruebas del canal de WhatsApp sin red real ni Supabase.

Cubre las tres barreras que hacen que esto no se dispare por accidente:
consentimiento vigente, plantilla aprobada y modo simulación.
"""

import json
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import contactos as cts  # noqa: E402
import whatsapp as wa  # noqa: E402

ROJO = {"crear_alerta": True, "nivel_final": "ROJO", "confirmada_por_satelite": True}


class TelefonoTests(unittest.TestCase):
    def test_acepta_e164_limpio(self):
        self.assertEqual(cts.normalizar_telefono("+573001234567"), "+573001234567")

    def test_normaliza_espacios_guiones_y_parentesis(self):
        self.assertEqual(cts.normalizar_telefono("+57 300-123-45-67"), "+573001234567")
        self.assertEqual(cts.normalizar_telefono("+57 (300) 123 45 67"), "+573001234567")

    def test_agrega_prefijo_57_a_celulares_colombianos(self):
        self.assertEqual(cts.normalizar_telefono("573001234567"), "+573001234567")

    def test_rechaza_local_sin_pais_en_vez_de_adivinar(self):
        # Adivinar el prefijo podría mandar la alerta a otro país.
        with self.assertRaises(cts.ErrorContactos):
            cts.normalizar_telefono("3001234567")

    def test_rechaza_vacios_y_no_texto(self):
        for valor in ("", "   ", None, 573001234567):
            with self.subTest(valor=valor):
                with self.assertRaises(cts.ErrorContactos):
                    cts.normalizar_telefono(valor)

    def test_rechaza_demasiados_digitos(self):
        with self.assertRaises(cts.ErrorContactos):
            cts.normalizar_telefono("+5730012345678901")

    def test_rechaza_signo_mal_puesto(self):
        with self.assertRaises(cts.ErrorContactos):
            cts.normalizar_telefono("+0573001234567")


class ConsentimientoTests(unittest.TestCase):
    def cliente(self):
        import unittest.mock

        c = unittest.mock.MagicMock()
        c.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        c.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "contacto-1"}
        ]
        c.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            {"id": "contacto-1"}
        ]
        return c

    def test_otorgar_consentimiento_exige_metodo(self):
        with patch.object(cts, "_require_supabase", return_value=self.cliente()):
            with self.assertRaises(cts.ErrorConsentimiento):
                cts.registrar_contacto("+573001234567", "Ana", consentimiento="otorgado")

    def test_registra_con_evidencia_de_consentimiento(self):
        cliente = self.cliente()
        with patch.object(cts, "_require_supabase", return_value=cliente):
            cts.registrar_contacto(
                "+573001234567",
                "Ana",
                consentimiento="otorgado",
                metodo_consentimiento="formulario-web",
                texto_consentimiento="Acepto recibir alertas de inundación.",
            )
        enviado = cliente.table.return_value.insert.call_args[0][0]
        self.assertEqual(enviado["telefono"], "+573001234567")
        self.assertEqual(enviado["consentimiento"], "otorgado")
        self.assertIsNotNone(enviado["consentimiento_otorgado_en"])
        self.assertEqual(enviado["metodo_consentimiento"], "formulario-web")

    def test_rechaza_estado_desconocido(self):
        with patch.object(cts, "_require_supabase", return_value=self.cliente()):
            with self.assertRaises(cts.ErrorContactos):
                cts.registrar_contacto("+573001234567", "Ana", consentimiento="quiza")

    def test_rechaza_niveles_fuera_de_rango(self):
        with patch.object(cts, "_require_supabase", return_value=self.cliente()):
            with self.assertRaises(cts.ErrorContactos):
                cts.registrar_contacto("+573001234567", "Ana", niveles=["ROJO", "VIOLETA"])

    def test_exige_nombre(self):
        with patch.object(cts, "_require_supabase", return_value=self.cliente()):
            with self.assertRaises(cts.ErrorContactos):
                cts.registrar_contacto("+573001234567", "   ")

    def test_revocacion_deja_de_recibir(self):
        cliente = self.cliente()
        with patch.object(cts, "_require_supabase", return_value=cliente):
            revocado = cts.revocar_consentimiento("+573001234567")
        self.assertTrue(revocado)
        # La revocación debe apagar la preferencia, no solo cambiar el estado:
        # si solo cambiara el estado, un contacto con recibe_alertas=true
        # seguiría saliendo en las consultas de la ventana de 24 h.
        actualizado = cliente.table.return_value.update.call_args[0][0]
        self.assertEqual(actualizado["consentimiento"], "revocado")
        self.assertFalse(actualizado["recibe_alertas"])
        self.assertIsNotNone(actualizado["consentimiento_revocado_en"])


class NotificablesTests(unittest.TestCase):
    def filas(self, data):
        import unittest.mock

        c = unittest.mock.MagicMock()
        c.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = data
        return c

    def test_filtra_por_nivel_suscrito(self):
        data = [
            {"id": "1", "niveles": ["ROJO", "NARANJA"]},
            {"id": "2", "niveles": ["AMARILLO"]},
        ]
        with patch.object(cts, "_require_supabase", return_value=self.filas(data)):
            self.assertEqual(
                [c["id"] for c in cts.obtener_contactos_notificables("ROJO")], ["1"]
            )
            self.assertEqual(
                [c["id"] for c in cts.obtener_contactos_notificables("AMARILLO")], ["2"]
            )

    def test_verde_nunca_tiene_destinatarios(self):
        with patch.object(cts, "_require_supabase", return_value=self.filas([])):
            self.assertEqual(cts.obtener_contactos_notificables("VERDE"), [])

    def test_excluye_revocacion_posterior(self):
        futuro = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        data = [{"id": "1", "niveles": ["ROJO"], "consentimiento_revocado_en": futuro}]
        with patch.object(cts, "_require_supabase", return_value=self.filas(data)):
            self.assertEqual(cts.obtener_contactos_notificables("ROJO"), [])

    def test_excluye_revocacion_pasada(self):
        """Revocar en el pasado es el caso normal: la revocacion ya surte efecto.

        Antes `_vigente` solo miraba revocaciones futuras, asi que un contacto
        revocado hace un dia seguia recibiendo alertas.
        """
        pasado = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        data = [{"id": "1", "niveles": ["ROJO"], "consentimiento_revocado_en": pasado}]
        with patch.object(cts, "_require_supabase", return_value=self.filas(data)):
            self.assertEqual(cts.obtener_contactos_notificables("ROJO"), [])

    def test_sin_revocar_sigue_notificando(self):
        data = [{"id": "1", "niveles": ["ROJO"], "consentimiento_revocado_en": None}]
        with patch.object(cts, "_require_supabase", return_value=self.filas(data)):
            self.assertEqual(
                [c["id"] for c in cts.obtener_contactos_notificables("ROJO")], ["1"]
            )


class PlantillaTests(unittest.TestCase):
    def test_nombre_por_defecto_por_nivel(self):
        self.assertEqual(wa.nombre_plantilla("ROJO"), "alerta_inundacion_rojo")
        self.assertEqual(wa.nombre_plantilla("naranja"), "alerta_inundacion_naranja")

    def test_nombre_se_puede_sobrescribir_por_entorno(self):
        with patch.dict("os.environ", {"WHATSAPP_PLANTILLA_ROJO": "mi_plantilla"}):
            self.assertEqual(wa.nombre_plantilla("ROJO"), "mi_plantilla")

    def test_sin_aprobacion_no_se_considera_aprobada(self):
        with patch.dict("os.environ", {}, clear=False):
            self.assertFalse(wa.plantilla_aprobada("ROJO"))
        with patch.dict("os.environ", {"WHATSAPP_PLANTILLA_APROBADA_ROJO": "1"}):
            self.assertTrue(wa.plantilla_aprobada("ROJO"))

    def test_payload_conserva_orden_de_variables(self):
        cuerpo = wa._payload("ROJO", ROJO, {"distancia_cm": 25.0, "velocidad_cm_min": 7.5})
        parametros = cuerpo["template"]["components"][0]["parameters"]
        self.assertEqual([p["text"] for p in parametros], ["ROJO", "25", "7.50", "sí"])

    def test_payload_tolera_lectura_sin_mediciones(self):
        cuerpo = wa._payload("AMARILLO", {"nivel_final": "AMARILLO"}, None)
        parametros = cuerpo["template"]["components"][0]["parameters"]
        self.assertEqual(parametros[1]["text"], "sin dato")
        self.assertEqual(parametros[3]["text"], "no")


class DespachoWhatsappTests(unittest.TestCase):
    def test_no_envia_sin_plantilla_aprobada(self):
        with patch.dict("os.environ", {}, clear=False):
            resumen = wa.notificar_alerta_whatsapp({"id": "A1"}, ROJO)
        self.assertFalse(resumen["notificado"])
        self.assertIn("no está marcada como aprobada", resumen["motivo"])

    def test_no_envia_si_la_decision_no_amerita(self):
        with patch.dict("os.environ", {"WHATSAPP_PLANTILLA_APROBADA_ROJO": "1"}):
            resumen = wa.notificar_alerta_whatsapp(
                {"id": "A1"}, {"crear_alerta": False, "nivel_final": "VERDE"}
            )
        self.assertFalse(resumen["notificado"])
        self.assertIn("decision.py", resumen["motivo"])

    def test_simula_sin_tocar_la_red(self):
        entorno = {
            "WHATSAPP_PLANTILLA_APROBADA_ROJO": "1",
            "WHATSAPP_MODO": "simulacion",
        }
        with (
            patch.dict("os.environ", entorno),
            patch.object(wa, "obtener_contactos_notificables", return_value=[
                {"id": "c1", "telefono": "+573001234567"},
                {"id": "c2", "telefono": "+573009999999"},
            ]),
            patch.object(wa, "_auditar") as auditar,
            patch.object(wa, "_enviar_real") as enviar,
        ):
            resumen = wa.notificar_alerta_whatsapp({"id": "A1"}, ROJO, {"distancia_cm": 25.0})

        enviar.assert_not_called()
        self.assertEqual(resumen["simulados"], 2)
        self.assertEqual(resumen["enviados"], 0)
        self.assertEqual(auditar.call_count, 2)
        self.assertEqual(auditar.call_args_list[0][0][2], wa.ESTADO_SIMULADO)

    def test_produccion_envia_y_audita(self):
        entorno = {
            "WHATSAPP_PLANTILLA_APROBADA_ROJO": "1",
            "WHATSAPP_MODO": "produccion",
        }
        with (
            patch.dict("os.environ", entorno),
            patch.object(wa, "obtener_contactos_notificables", return_value=[
                {"id": "c1", "telefono": "+573001234567"}
            ]),
            patch.object(wa, "_enviar_real", return_value=(True, None)) as enviar,
            patch.object(wa, "_auditar") as auditar,
        ):
            resumen = wa.notificar_alerta_whatsapp({"id": "A1"}, ROJO)

        enviar.assert_called_once()
        self.assertEqual(resumen["enviados"], 1)
        auditar.assert_called_once_with("A1", "c1", wa.ESTADO_ENVIADO, None)

    def test_fallo_de_meta_no_propaga_excepcion(self):
        entorno = {
            "WHATSAPP_PLANTILLA_APROBADA_ROJO": "1",
            "WHATSAPP_MODO": "produccion",
        }
        with (
            patch.dict("os.environ", entorno),
            patch.object(wa, "obtener_contactos_notificables", return_value=[
                {"id": "c1", "telefono": "+573001234567"}
            ]),
            patch.object(wa, "_enviar_real", return_value=(False, "HTTP 400 code=131047")),
            patch.object(wa, "_auditar") as auditar,
        ):
            resumen = wa.notificar_alerta_whatsapp({"id": "A1"}, ROJO)

        self.assertEqual(resumen["fallidos"], 1)
        self.assertEqual(auditar.call_args[0][2], wa.ESTADO_FALLIDO)
        self.assertIn("131047", auditar.call_args[0][3])

    def test_envio_real_arma_una_llamada_a_meta(self):
        entorno = {
            "WHATSAPP_TOKEN": "tok",
            "WHATSAPP_PHONE_NUMBER_ID": "123456",
            "WHATSAPP_WABA_ID": "999",
        }
        cuerpo = wa._payload("ROJO", ROJO, {"distancia_cm": 25.0})

        class Respuesta:
            status_code = 200

            @staticmethod
            def json():
                return {"messages": [{"id": "wamid.ABC"}]}

        with (
            patch.dict("os.environ", entorno),
            patch.object(wa.requests, "post", return_value=Respuesta()) as post,
        ):
            enviado, error = wa._enviar_real("+573001234567", cuerpo)

        self.assertTrue(enviado)
        self.assertIsNone(error)
        url = post.call_args[0][0]
        self.assertIn("123456/messages", url)
        self.assertIn("graph.facebook.com", url)
        self.assertEqual(post.call_args[1]["json"]["to"], "+573001234567")
        self.assertEqual(post.call_args[1]["headers"]["Authorization"], "Bearer tok")

    def test_error_de_meta_se_reporta_legible(self):
        entorno = {
            "WHATSAPP_TOKEN": "tok",
            "WHATSAPP_PHONE_NUMBER_ID": "123456",
            "WHATSAPP_WABA_ID": "999",
        }

        class Respuesta:
            status_code = 400

            @staticmethod
            def json():
                return {
                    "error": {
                        "code": 131047,
                        "message": "Re-engagement message",
                        "error_data": {"details": "plantilla no aprobada"},
                    }
                }

        with (
            patch.dict("os.environ", entorno),
            patch.object(wa.requests, "post", return_value=Respuesta()),
        ):
            enviado, error = wa._enviar_real("+573001234567", wa._payload("ROJO", ROJO, None))

        self.assertFalse(enviado)
        self.assertIn("131047", error)
        self.assertIn("Re-engagement", error)


class EsquemaAusenteTests(unittest.TestCase):
    """Sin la tabla aplicada, el error debe ser accionable y no un 500 genérico."""

    def cliente_roto(self):
        import unittest.mock

        c = unittest.mock.MagicMock()
        c.table.return_value.select.return_value.limit.return_value.execute.side_effect = Exception(
            "{'code': 'PGRST205', 'message': \"Could not find the table 'public.contactos_whatsapp'\"}"
        )
        return c

    def test_detecta_tabla_inexistente(self):
        with patch.object(cts, "_require_supabase", return_value=self.cliente_roto()):
            with self.assertRaises(cts.ErrorEsquemaAusente) as contexto:
                cts.consultar_contacto("+573001234567")
        self.assertIn("contactos_whatsapp.sql", str(contexto.exception))

    def test_no_confunde_otros_errores_con_esquema(self):
        import unittest.mock

        c = unittest.mock.MagicMock()
        c.table.return_value.select.return_value.limit.return_value.execute.side_effect = Exception(
            "connection reset by peer"
        )
        with patch.object(cts, "_require_supabase", return_value=c):
            with self.assertRaises(Exception) as contexto:
                cts.consultar_contacto("+573001234567")
        self.assertNotIsInstance(contexto.exception, cts.ErrorEsquemaAusente)

    def test_es_error_de_contactos(self):
        self.assertTrue(issubclass(cts.ErrorEsquemaAusente, cts.ErrorContactos))

    def test_no_se_confunde_con_error_de_consentimiento(self):
        """Si heredara de ErrorConsentimiento, el endpoint reportaría 422 en vez
        de 503, y el usuario creería que su número está mal en vez de que falta
        aplicar el esquema."""
        self.assertFalse(issubclass(cts.ErrorEsquemaAusente, cts.ErrorConsentimiento))


class ConsultarContactoTests(unittest.TestCase):
    def cliente(self, data):
        import unittest.mock

        c = unittest.mock.MagicMock()
        c.table.return_value.select.return_value.limit.return_value.execute.return_value.data = []
        c.table.return_value.select.return_value.eq.return_value.execute.return_value.data = data
        return c

    def test_devuelve_null_si_no_existe(self):
        with patch.object(cts, "_require_supabase", return_value=self.cliente([])):
            self.assertIsNone(cts.consultar_contacto("+573001234567"))

    def test_normaliza_antes_de_consultar(self):
        cliente = self.cliente([])
        with patch.object(cts, "_require_supabase", return_value=cliente):
            cts.consultar_contacto("+57 300 123 45 67")
        cliente.table.return_value.select.return_value.eq.assert_called_once_with(
            "telefono", "+573001234567"
        )

    def test_rechaza_numero_ambiguo(self):
        with patch.object(cts, "_require_supabase", return_value=self.cliente([])):
            with self.assertRaises(cts.ErrorContactos):
                cts.consultar_contacto("3001234567")

    def test_no_selecciona_nombre_ni_entidad(self):
        """El endpoint se llama sin autenticación, así que no debe devolver PII."""
        cliente = self.cliente([])
        with patch.object(cts, "_require_supabase", return_value=cliente):
            cts.consultar_contacto("+573001234567")
        seleccion = cliente.table.return_value.select.call_args[0][0]
        self.assertNotIn("nombre", seleccion)
        self.assertNotIn("entidad", seleccion)
        self.assertIn("consentimiento", seleccion)


class DiagnosticoDelCanalTests(unittest.TestCase):
    """El diagnostico debe separar "no puedo guardar" de "guardo pero no llega"."""

    def test_esquema_ausente_gana_sobre_credenciales(self):
        with patch.object(wa, "esquema_disponible", return_value=False):
            estado = wa.estado_modo()
        self.assertFalse(estado["puede_guardar_numero"])
        self.assertFalse(estado["listo_para_enviar"])
        self.assertIn("contactos_whatsapp.sql", estado["detalle"])

    def test_esquema_ausente_no_reporta_credenciales(self):
        """Si el esquema falta, las credenciales son irrelevante: mencionarlas
        distrae del bloqueo real."""
        with patch.object(wa, "esquema_disponible", return_value=False):
            estado = wa.estado_modo()
        self.assertEqual(estado["faltan_credenciales"], [])

    def test_esquema_listo_permite_guardar_aunque_no_haya_credenciales(self):
        with patch.object(wa, "esquema_disponible", return_value=True):
            with patch.dict("os.environ", {}, clear=True):
                estado = wa.estado_modo()
        self.assertTrue(estado["puede_guardar_numero"])
        self.assertFalse(estado["listo_para_enviar"])
        self.assertIn("Faltan variables", estado["detalle"])


class EstadoModoTests(unittest.TestCase):
    """Estos casos fijan el esquema como disponible: lo que prueban es el
    diagnostico de credenciales y plantillas, no el de la tabla."""

    def test_reporta_credenciales_faltantes(self):
        with patch.object(wa, "esquema_disponible", return_value=True):
            with patch.dict("os.environ", {}, clear=True):
                estado = wa.estado_modo()
        self.assertFalse(estado["listo_para_enviar"])
        self.assertEqual(estado["modo"], "simulacion")
        self.assertIn("WHATSAPP_TOKEN", estado["faltan_credenciales"])

    def test_reporta_plantillas_pendientes(self):
        entorno = {
            "WHATSAPP_TOKEN": "t",
            "WHATSAPP_PHONE_NUMBER_ID": "1",
            "WHATSAPP_WABA_ID": "2",
            "WHATSAPP_MODO": "produccion",
        }
        with patch.object(wa, "esquema_disponible", return_value=True):
            with patch.dict("os.environ", entorno, clear=True):
                estado = wa.estado_modo()
        self.assertFalse(estado["listo_para_enviar"])
        self.assertIn("ROJO", estado["detalle"])

    def test_listo_cuando_todo_esta(self):
        entorno = {
            "WHATSAPP_TOKEN": "t",
            "WHATSAPP_PHONE_NUMBER_ID": "1",
            "WHATSAPP_WABA_ID": "2",
            "WHATSAPP_MODO": "produccion",
            "WHATSAPP_PLANTILLA_APROBADA_ROJO": "1",
            "WHATSAPP_PLANTILLA_APROBADA_NARANJA": "1",
            "WHATSAPP_PLANTILLA_APROBADA_AMARILLO": "1",
        }
        with patch.object(wa, "esquema_disponible", return_value=True):
            with patch.dict("os.environ", entorno, clear=True):
                estado = wa.estado_modo()
        self.assertTrue(estado["listo_para_enviar"])
        self.assertEqual(estado["modo"], "produccion")
        self.assertIsNone(estado["detalle"])


if __name__ == "__main__":
    unittest.main()
