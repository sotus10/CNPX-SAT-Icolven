import unittest
from decision import decidir_alerta

class DecisionTests(unittest.TestCase):
    def test_verde_sin_alerta(self):
        lectura = {"nivel": "VERDE", "velocidad_cm_min": 0.0}
        nivel_final, confirmada = decidir_alerta(lectura, None)
        self.assertEqual(nivel_final, "VERDE")
        self.assertFalse(confirmada)

    def test_sensor_alerta_sin_lluvia_no_confirmada(self):
        lectura = {"nivel": "AMARILLO", "velocidad_cm_min": 1.0}
        satelite = {"precipitacion": 0.0, "lluvia_acumulada_24h": 0.0}
        nivel_final, confirmada = decidir_alerta(lectura, satelite)
        self.assertEqual(nivel_final, "AMARILLO")
        self.assertFalse(confirmada)

    def test_sensor_alerta_con_lluvia_confirmada(self):
        lectura = {"nivel": "AMARILLO", "velocidad_cm_min": 1.0}
        satelite = {"precipitacion": 2.5, "lluvia_acumulada_24h": 10.0}
        nivel_final, confirmada = decidir_alerta(lectura, satelite)
        self.assertEqual(nivel_final, "AMARILLO")
        self.assertTrue(confirmada)

    def test_escalamiento_preventivo(self):
        # Lluvia fuerte (>=5mm/h) + velocidad alta (>=5cm/min) escala AMARILLO a NARANJA
        lectura = {"nivel": "AMARILLO", "velocidad_cm_min": 6.0}
        satelite = {"precipitacion": 8.0, "lluvia_acumulada_24h": 25.0}
        nivel_final, confirmada = decidir_alerta(lectura, satelite)
        self.assertEqual(nivel_final, "NARANJA")
        self.assertTrue(confirmada)

if __name__ == "__main__":
    unittest.main()