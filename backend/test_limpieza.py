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

    def test_acepta_alias_legacy_nodo_y_normaliza_nivel(self):
        datos = {
            "nodo": "  nodo-7  ",
            "distancia_cm": 120.456,
            "velocidad_cm_min": 1.2345,
            "nivel": " naranja ",
        }
        self.assertEqual(
            limpiar_lectura(datos),
            {
                "nodo_id": "nodo-7",
                "distancia_cm": 120.5,
                "velocidad_cm_min": 1.23,
                "nivel": "NARANJA",
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

    def test_rechaza_falta_un_campo(self):
        del self.datos["velocidad_cm_min"]
        with self.assertRaisesRegex(ValueError, "velocidad_cm_min"):
            limpiar_lectura(self.datos)

    def test_rechaza_entrada_no_dict(self):
        with self.assertRaisesRegex(ValueError, "objeto JSON"):
            limpiar_lectura("hola")

    def test_no_modifica_el_diccionario_original(self):
        original = {"nodo_id": " RIO_01 ", "distancia_cm": 120.0, "velocidad_cm_min": 1.5, "nivel": "naranja"}
        limpiado = limpiar_lectura(original)
        self.assertEqual(limpiado["nivel"], "NARANJA")
        self.assertEqual(original["nivel"], "naranja")


if __name__ == "__main__":
    unittest.main()

