import unittest
from datetime import datetime, timedelta, timezone

from conectividad import OFFLINE, ONLINE, RETRASO, estado_conectividad, evaluar_nodos

AHORA = datetime(2026, 9, 23, 15, 0, tzinfo=timezone.utc)


def hace(minutos):
    return (AHORA - timedelta(minutes=minutos)).isoformat()


class EstadoConectividadTests(unittest.TestCase):
    def test_lectura_reciente_es_online(self):
        resultado = estado_conectividad(hace(4), ahora=AHORA)
        self.assertEqual(resultado["estado"], ONLINE)
        self.assertEqual(resultado["minutos_sin_lectura"], 4.0)

    def test_diez_minutos_exactos_siguen_siendo_online(self):
        resultado = estado_conectividad(hace(10), ahora=AHORA)
        self.assertEqual(resultado["estado"], ONLINE)

    def test_ventana_de_retraso_entre_diez_y_veinte_minutos(self):
        resultado = estado_conectividad(hace(14), ahora=AHORA)
        self.assertEqual(resultado["estado"], RETRASO)

    def test_veinte_minutos_exactos_siguen_en_retraso(self):
        resultado = estado_conectividad(hace(20), ahora=AHORA)
        self.assertEqual(resultado["estado"], RETRASO)

    def test_mas_de_veinte_minutos_es_offline(self):
        resultado = estado_conectividad(hace(21), ahora=AHORA)
        self.assertEqual(resultado["estado"], OFFLINE)

    def test_nodo_sin_lecturas_no_se_presume_online(self):
        resultado = estado_conectividad(None, ahora=AHORA)
        self.assertEqual(resultado["estado"], OFFLINE)
        self.assertIsNone(resultado["minutos_sin_lectura"])

    def test_fecha_invalida_no_se_interpreta_como_lectura(self):
        self.assertEqual(estado_conectividad("no-es-fecha", ahora=AHORA)["estado"], OFFLINE)

    def test_reloj_desincronizado_se_penaliza_como_offline(self):
        futuro = (AHORA + timedelta(minutes=30)).isoformat()
        resultado = estado_conectividad(futuro, ahora=AHORA)
        self.assertEqual(resultado["estado"], OFFLINE)

    def test_sin_zona_horaria_se_interpreta_en_utc(self):
        naive = (AHORA - timedelta(minutes=3)).replace(tzinfo=None)
        self.assertEqual(estado_conectividad(naive, ahora=AHORA)["estado"], ONLINE)


class EvaluarNodosTests(unittest.TestCase):
    def test_toma_la_lectura_mas_reciente_de_cada_nodo(self):
        nodos = [{"id": "a", "nombre": "RIO_01", "estado": "activo"}]
        lecturas = [
            {"nodo_id": "a", "timestamp": hace(2), "distancia_cm": 42.5, "nivel": "VERDE"},
            {"nodo_id": "a", "timestamp": hace(90), "distancia_cm": 99.0, "nivel": "ROJO"},
        ]
        evaluados = evaluar_nodos(nodos, lecturas, ahora=AHORA)
        self.assertEqual(evaluados[0]["conectividad"], ONLINE)
        self.assertEqual(evaluados[0]["distancia_cm"], 42.5)
        self.assertEqual(evaluados[0]["nivel"], "VERDE")

    def test_conserva_datos_del_patron_cuando_el_nodo_calla(self):
        nodos = [{"id": "a", "nombre": "RIO_01", "ubicacion": "Puente Viejo", "estado": "activo"}]
        evaluados = evaluar_nodos(nodos, [], ahora=AHORA)
        self.assertEqual(evaluados[0]["nombre"], "RIO_01")
        self.assertEqual(evaluados[0]["ubicacion"], "Puente Viejo")
        self.assertEqual(evaluados[0]["conectividad"], OFFLINE)
        self.assertIsNone(evaluados[0]["distancia_cm"])

    def test_lecturas_de_otros_nodos_no_se_atribuyen(self):
        nodos = [{"id": "a", "nombre": "RIO_01"}]
        lecturas = [{"nodo_id": "b", "timestamp": hace(1), "distancia_cm": 10.0}]
        evaluados = evaluar_nodos(nodos, lecturas, ahora=AHORA)
        self.assertEqual(evaluados[0]["conectividad"], OFFLINE)


if __name__ == "__main__":
    unittest.main()