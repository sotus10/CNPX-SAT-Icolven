import unittest
from unittest.mock import patch

import requests

from clima import obtener_datos_satelitales


class FakeResponse:
    def raise_for_status(self):
        pass

    def json(self):
        times = [f"2026-01-01T{hour:02d}:00" for hour in range(24)]
        times.extend(f"2026-01-02T{hour:02d}:00" for hour in range(3))
        return {
            "latitude": 6.25,
            "longitude": -75.56,
            "timezone": "America/Bogota",
            "current": {"time": "2026-01-01T23:15", "precipitation": 0.4},
            "hourly": {"time": times, "precipitation": [1.0] * len(times)},
        }


class SatelliteWeatherTests(unittest.TestCase):
    @patch("clima.requests.get", return_value=FakeResponse())
    def test_returns_current_rain_history_and_forecast(self, mock_get):
        result = obtener_datos_satelitales(6.25, -75.56)

        self.assertEqual(result["source"], "Open-Meteo")
        self.assertEqual(result["current"]["precipitation_mm"], 0.4)
        self.assertEqual(result["accumulated_24h_mm"], 24.0)
        self.assertFalse(result["hourly"][23]["is_forecast"])
        self.assertTrue(result["hourly"][24]["is_forecast"])
        mock_get.assert_called_once()

    @patch("clima.requests.get", side_effect=requests.exceptions.Timeout("offline"))
    def test_returns_none_when_weather_provider_fails(self, mock_get):
        self.assertIsNone(obtener_datos_satelitales(6.25, -75.56))
        mock_get.assert_called_once()


if __name__ == "__main__":
    unittest.main()
