import os
import unittest
from unittest.mock import patch

os.environ["NODE_API_KEY"] = "test-key"

from fastapi.testclient import TestClient

import main


class LecturasApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.headers = {"X-API-Key": "test-key"}
        self.datos = {
            "nodo_id": "RIO_01",
            "distancia_cm": 45.2,
            "velocidad_cm_min": 3.1,
            "nivel": "AMARILLO",
        }

    def test_estado_verifica_consulta_real_a_supabase(self):
        class SupabaseDisponible:
            def table(self, nombre):
                self.nombre = nombre
                return self

            def select(self, columnas):
                self.columnas = columnas
                return self

            def limit(self, limite):
                self.limite = limite
                return self

            def execute(self):
                return None

        cliente = SupabaseDisponible()
        with patch.object(main, "supabase", cliente):
            respuesta = self.client.get("/")
        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(respuesta.json()["supabase_connected"])
        self.assertEqual(cliente.nombre, "nodos")
        self.assertEqual(cliente.columnas, "id")
        self.assertEqual(cliente.limite, 0)

    def test_estado_reporta_supabase_desconectado_si_falla_consulta(self):
        class SupabaseNoDisponible:
            def table(self, nombre):
                raise RuntimeError("sin conexión")

        with patch.object(main, "supabase", SupabaseNoDisponible()):
            respuesta = self.client.get("/")
        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(respuesta.json()["supabase_connected"])
        self.assertEqual(respuesta.json()["status"], "degraded")

    def test_rechaza_sin_api_key_sin_guardar_crudo(self):
        with patch.object(main, "insertar_lectura_cruda") as insertar_crudo:
            respuesta = self.client.post("/api/lecturas", json=self.datos)
        self.assertEqual(respuesta.status_code, 401)
        insertar_crudo.assert_not_called()

    def test_guarda_crudo_antes_de_rechazar_lectura_invalida(self):
        datos = {**self.datos, "distancia_cm": 900}
        with patch.object(main, "insertar_lectura_cruda", return_value="raw-id") as insertar_crudo:
            with patch.object(main, "insertar_lectura") as insertar_limpia:
                respuesta = self.client.post(
                    "/api/lecturas", json=datos, headers=self.headers
                )
        self.assertEqual(respuesta.status_code, 422)
        insertar_crudo.assert_called_once_with(datos)
        insertar_limpia.assert_not_called()

    def test_falla_con_500_si_no_se_puede_guardar_lectura_cruda(self):
        with patch.object(main, "insertar_lectura_cruda", side_effect=RuntimeError):
            with patch.object(main, "insertar_lectura") as insertar_limpia:
                respuesta = self.client.post(
                    "/api/lecturas", json=self.datos, headers=self.headers
                )
        self.assertEqual(respuesta.status_code, 500)
        insertar_limpia.assert_not_called()

    def test_registra_lectura_y_alerta_para_nivel_no_verde(self):
        lectura_guardada = {"id": "clean-id", "nivel": "AMARILLO"}
        with patch.object(main, "insertar_lectura_cruda", return_value="raw-id"):
            with patch.object(main, "obtener_nodo_id", return_value="node-uuid"):
                with patch.object(main, "asociar_lectura_cruda_nodo") as asociar_cruda:
                    with patch.object(main, "insertar_lectura", return_value=[lectura_guardada]):
                        with patch.object(main, "obtener_ultimas_lecturas", return_value=[]):
                            with patch.object(main, "obtener_datos_satelitales_recientes", return_value=[]):
                                with patch.object(main, "insertar_alerta", return_value=[{"id": "alert-id"}]) as alerta:
                                    respuesta = self.client.post(
                                        "/api/lecturas", json=self.datos, headers=self.headers
                                    )
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.json()["lectura"], lectura_guardada)
        self.assertEqual(respuesta.json()["alerta"]["id"], "alert-id")
        asociar_cruda.assert_called_once_with("raw-id", "node-uuid")
        alerta.assert_called_once_with(
            "clean-id", "AMARILLO", confirmada_por_satelite=False
        )

    def test_clima_nulo_se_guarda_como_cero_y_24_horas(self):
        class FakeTable:
            def __init__(self):
                self.registro = None

            def insert(self, registro):
                self.registro = registro
                return self

            def execute(self):
                return type("Respuesta", (), {"data": [self.registro]})()

        class FakeSupabase:
            def __init__(self):
                self.tabla = FakeTable()

            def table(self, nombre):
                self.nombre = nombre
                return self.tabla

        cliente = FakeSupabase()
        with patch.object(main, "supabase", cliente):
            with patch.object(main, "obtener_clima", return_value={
                "lluvia_ultima_hora": None,
                "lluvia_acumulada_24h": 8.5,
            }):
                respuesta = self.client.post("/clima/actualizar")
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(cliente.tabla.registro["precipitacion"], 0.0)
        self.assertEqual(cliente.tabla.registro["lluvia_acumulada_24h"], 8.5)

    def test_clima_devuelve_503_si_open_meteo_falla(self):
        with patch.object(main, "obtener_clima", return_value=None):
            respuesta = self.client.post("/clima/actualizar")
        self.assertEqual(respuesta.status_code, 503)

    def test_clima_devuelve_500_si_falla_supabase(self):
        class FalloSupabase:
            def table(self, nombre):
                return self

            def insert(self, registro):
                return self

            def execute(self):
                raise RuntimeError("fallo de base de datos")

        with patch.object(main, "supabase", FalloSupabase()):
            with patch.object(main, "obtener_clima", return_value={
                "lluvia_ultima_hora": 1.0,
                "lluvia_acumulada_24h": 2.0,
            }):
                respuesta = self.client.post("/clima/actualizar")
        self.assertEqual(respuesta.status_code, 500)

    def test_historial_acepta_limite_consultado(self):
        with patch.object(main, "obtener_historial_lecturas", return_value=[]) as historial:
            respuesta = self.client.get("/historial?limite=75")
        self.assertEqual(respuesta.status_code, 200)
        historial.assert_called_once_with(limite=75)


if __name__ == "__main__":
    unittest.main()
