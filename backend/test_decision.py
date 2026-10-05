import unittest
from datetime import datetime, timedelta, timezone

from decision import evaluar_alerta_fusionada


AHORA = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)


def evaluar(nivel="VERDE", distancia=100, velocidad=0, *, distancia_anterior=None, lluvia=None, minutos_satelite=0):
    lectura = {
        "id": "actual",
        "nivel": nivel,
        "distancia_cm": distancia,
        "velocidad_cm_min": velocidad,
        "timestamp": AHORA.isoformat(),
    }
    anteriores = []
    if distancia_anterior is not None:
        anteriores.append({
            "id": "anterior",
            "distancia_cm": distancia_anterior,
            "timestamp": (AHORA - timedelta(minutes=10)).isoformat(),
        })
    satelitales = []
    if lluvia is not None:
        satelitales.append({
            "timestamp": (AHORA - timedelta(minutes=minutos_satelite)).isoformat(),
            "precipitacion": lluvia,
            "lluvia_acumulada_24h": 0,
        })
    return evaluar_alerta_fusionada(
        lectura,
        lecturas_recientes=anteriores,
        datos_satelitales=satelitales,
        ahora=AHORA,
    )


class DecisionFusionadaTests(unittest.TestCase):
    def test_lluvia_sola_no_crea_alerta(self):
        decision = evaluar(lluvia=20)
        self.assertFalse(decision["crear_alerta"])
        self.assertFalse(decision["confirmada_por_satelite"])

    def test_sensor_verde_lluvia_y_subida_crean_amarilla(self):
        decision = evaluar(
            distancia=98,
            velocidad=2,
            distancia_anterior=101,
            lluvia=12,
        )
        self.assertTrue(decision["crear_alerta"])
        self.assertEqual(decision["nivel_final"], "AMARILLO")
        self.assertTrue(decision["confirmada_por_satelite"])

    def test_sensor_amarillo_mantiene_alerta_aunque_no_haya_satellite(self):
        decision = evaluar(nivel="AMARILLO")
        self.assertTrue(decision["crear_alerta"])
        self.assertEqual(decision["nivel_final"], "AMARILLO")
        self.assertFalse(decision["confirmada_por_satelite"])

    def test_lluvia_y_subida_elevan_un_nivel(self):
        decision = evaluar(
            nivel="AMARILLO",
            distancia=98,
            velocidad=2,
            distancia_anterior=101,
            lluvia=12,
        )
        self.assertEqual(decision["nivel_final"], "NARANJA")
        self.assertTrue(decision["confirmada_por_satelite"])

    def test_satelite_viejo_no_confirma_ni_cancela_sensor(self):
        decision = evaluar(
            nivel="AMARILLO",
            distancia=98,
            velocidad=2,
            distancia_anterior=101,
            lluvia=20,
            minutos_satelite=180,
        )
        self.assertEqual(decision["nivel_final"], "AMARILLO")
        self.assertFalse(decision["confirmada_por_satelite"])

    def test_distancia_critica_corrige_nivel_textual_inconsistente(self):
        decision = evaluar(nivel="VERDE", distancia=25)
        self.assertTrue(decision["crear_alerta"])
        self.assertEqual(decision["nivel_final"], "ROJO")

    def test_sin_historial_no_infiere_tendencia(self):
        decision = evaluar(distancia=98, velocidad=2, lluvia=12)
        self.assertFalse(decision["tendencia_subida"])
        self.assertFalse(decision["crear_alerta"])


if __name__ == "__main__":
    unittest.main()