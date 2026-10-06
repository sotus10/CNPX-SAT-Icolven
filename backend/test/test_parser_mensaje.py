"""Tests de parser_mensaje.

El formato de la trama esta definido por el firmware
(firmware/transmisor_rio/transmisor_rio.ino:121):
    NODO_ID + "," + nivel + "," + distancia(1 dec) + "," + velocidad(2 dec)
"""

import unittest

from limpieza import limpiar_lectura
from parser_mensaje import parsear_mensaje


class TramaDelFirmwareTests(unittest.TestCase):
    def test_trama_real_del_transmisor(self):
        # Exactamente lo que arma transmisor_rio.ino con NODO_ID="RIO_01".
        datos = parsear_mensaje("RIO_01,ROJO,25.0,7.50")
        self.assertEqual(datos["nodo_id"], "RIO_01")
        self.assertEqual(datos["nivel"], "ROJO")
        self.assertEqual(datos["distancia_cm"], 25.0)
        self.assertEqual(datos["velocidad_cm_min"], 7.5)

    def test_espacios_around_de_comas(self):
        datos = parsear_mensaje(" RIO_01 , NARANJA , 40.0 , 6.00 ")
        self.assertEqual(datos["nodo_id"], "RIO_01")
        self.assertEqual(datos["nivel"], "NARANJA")

    def test_saltos_de_linea_de_LoRa(self):
        datos = parsear_mensaje("RIO_01,AMARILLO,98.0,2.00\r\n")
        self.assertEqual(datos["nivel"], "AMARILLO")

    def test_velocidad_negativa_se_interpreta(self):
        """El sensor puede reportar una retirada; el signo es informacion real."""
        datos = parsear_mensaje("RIO_01,VERDE,120.0,-1.25")
        self.assertEqual(datos["velocidad_cm_min"], -1.25)

    def test_entra_directo_a_limpiar_lectura(self):
        """El contrato entre los dos modulos: lo que devuelve el parser es
        justo lo que limpiar_lectura sabe procesar."""
        limpio = limpiar_lectura(parsear_mensaje("RIO_01,NARANJA,40.0,6.00"))
        self.assertEqual(limpio["nodo_id"], "RIO_01")
        self.assertEqual(limpio["nivel"], "NARANJA")
        self.assertEqual(limpio["distancia_cm"], 40.0)


class TramaInvalidaTests(unittest.TestCase):
    def test_campos_de_menos(self):
        with self.assertRaises(ValueError) as contexto:
            parsear_mensaje("RIO_01,ROJO,25.0")
        self.assertIn("4 campos", str(contexto.exception))

    def test_campos_de_mas(self):
        with self.assertRaises(ValueError):
            parsear_mensaje("RIO_01,ROJO,25.0,7.50,EXTRA")

    def test_texto_vacio(self):
        with self.assertRaises(ValueError):
            parsear_mensaje("   \r\n  ")

    def test_no_es_texto(self):
        with self.assertRaises(ValueError):
            parsear_mensaje(None)

    def test_distancia_no_numerica(self):
        with self.assertRaises(ValueError) as contexto:
            parsear_mensaje("RIO_01,ROJO,ERR,7.50")
        self.assertIn("distancia_cm", str(contexto.exception))

    def test_velocidad_no_numerica(self):
        with self.assertRaises(ValueError) as contexto:
            parsear_mensaje("RIO_01,ROJO,25.0,rapido")
        self.assertIn("velocidad_cm_min", str(contexto.exception))


class ElParserNoValidaTests(unittest.TestCase):
    """El parser solo interpreta el formato. Los rangos y los niveles validos
    son decision de limpiar_lectura; duplicar esa validacion aqui haria que los
    dos modulos pudieran discrepar."""

    def test_nivel_invalido_llega_a_limpiar_lectura(self):
        datos = parsear_mensaje("RIO_01,MORADO,25.0,7.50")
        self.assertEqual(datos["nivel"], "MORADO")
        with self.assertRaises(ValueError):
            limpiar_lectura(datos)

    def test_distancia_fuera_de_rango_llega_a_limpiar_lectura(self):
        datos = parsear_mensaje("RIO_01,ROJO,9999.0,7.50")
        with self.assertRaises(ValueError):
            limpiar_lectura(datos)


if __name__ == "__main__":
    unittest.main()
