import unittest
from decision import decidir_alerta


class DecisionTests(unittest.TestCase):
    def test_sensor_alerta_sin_lluvia_no_confirmada(self):
        lectura = {"nivel": "AMARILLO", "velocidad_cm_min": 1.0}
        satelite = {"precipitacion": 0.0, "lluvia_acumulada_24h": 0.0}
        nivel_final, confirmada = decidir_alerta(lectura, satelite)
        self.assertEqual(nivel_final, "AMARILLO")
        self.assertFalse(confirmada)

    def test_escalamiento_preventivo(self):
        lectura = {"nivel": "AMARILLO", "velocidad_cm_min": 6.0}
        satelite = {"precipitacion": 6.0, "lluvia_acumulada_24h": 20.0}
        nivel_final, confirmada = decidir_alerta(lectura, satelite)
        self.assertEqual(nivel_final, "NARANJA")
        self.assertTrue(confirmada)

    def test_rojo_no_cambia(self):
        lectura = {"nivel": "ROJO", "velocidad_cm_min": 10.0}
        satelite = {"precipitacion": 0.0, "lluvia_acumulada_24h": 0.0}
        nivel_final, confirmada = decidir_alerta(lectura, satelite)
        self.assertEqual(nivel_final, "ROJO")
        self.assertFalse(confirmada)

    def test_verde(self):
        lectura = {"nivel": "VERDE", "velocidad_cm_min": 0.0}
        satelite = {"precipitacion": 5.0, "lluvia_acumulada_24h": 10.0}
        nivel_final, confirmada = decidir_alerta(lectura, satelite)
        self.assertEqual(nivel_final, "VERDE")
        self.assertFalse(confirmada)


if __name__ == "__main__":
    unittest.main()
