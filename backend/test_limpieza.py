import unittest

from limpieza import limpiar_lectura


class LimpiarLecturaTests(unittest.TestCase):
    def setUp(self):
        self.datos = {
            "nodo_id": " RIO_01 ",
            "distancia_cm": 45.26,
            "velocidad_cm_min": 3.141,
            "nivel": "amarillo",
        }

    def test_normaliza_y_redondea_lectura_valida(self):
        self.assertEqual(
            limpiar_lectura(self.datos),
            {
                "nodo_id": "RIO_01",
                "distancia_cm": 45.3,
                "velocidad_cm_min": 3.14,
                "nivel": "AMARILLO",
            },
        )

    def test_rechaza_distancia_fuera_de_rango(self):
        self.datos["distancia_cm"] = 500
        with self.assertRaisesRegex(ValueError, "distancia_cm"):
            limpiar_lectura(self.datos)

    def test_rechaza_nivel_invalido(self):
        self.datos["nivel"] = "AZUL"
        with self.assertRaisesRegex(ValueError, "nivel"):
            limpiar_lectura(self.datos)

    def test_rechaza_velocidad_fuera_de_rango(self):
        self.datos["velocidad_cm_min"] = 9999
        with self.assertRaisesRegex(ValueError, "velocidad_cm_min"):
            limpiar_lectura(self.datos)

    def test_rechaza_nodo_vacio(self):
        self.datos["nodo_id"] = "  "
        with self.assertRaisesRegex(ValueError, "nodo_id"):
            limpiar_lectura(self.datos)

    def test_rechaza_valores_no_finitos(self):
        self.datos["distancia_cm"] = float("nan")
        with self.assertRaisesRegex(ValueError, "distancia_cm"):
            limpiar_lectura(self.datos)


if __name__ == "__main__":
    unittest.main()
