import requests

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def obtener_datos_satelitales(lat, lon, past_days=2, forecast_days=7):
    """Obtiene precipitación horaria pasada, actual y pronosticada de Open-Meteo."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "precipitation",
        "hourly": "precipitation",
        "past_days": past_days,
        "forecast_days": forecast_days,
        "timezone": "America/Bogota",
    }

    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        current = data["current"]
        hourly = data["hourly"]
        current_hour = current["time"][:13] + ":00"
        times = hourly["time"]
        precipitation = hourly["precipitation"]
        current_index = next(
            (index for index, time in enumerate(times) if time == current_hour),
            None,
        )
        if current_index is None:
            current_index = max(
                (index for index, time in enumerate(times) if time <= current_hour),
                default=len(times) - 1,
            )

        series = [
            {
                "time": time,
                "precipitation_mm": amount,
                "is_forecast": time > current_hour,
            }
            for time, amount in zip(times, precipitation)
            if amount is not None
        ]
        accumulated_24h = sum(
            amount
            for amount in precipitation[max(0, current_index - 23) : current_index + 1]
            if amount is not None
        )

        return {
            "source": "Open-Meteo",
            "latitude": data.get("latitude", lat),
            "longitude": data.get("longitude", lon),
            "timezone": data.get("timezone", "America/Bogota"),
            "current": {
                "time": current["time"],
                "precipitation_mm": current["precipitation"],
            },
            "accumulated_24h_mm": round(accumulated_24h, 2),
            "hourly": series,
        }
    except (requests.exceptions.RequestException, KeyError, TypeError, ValueError) as error:
        print(f"[ERROR] No se pudieron obtener datos de Open-Meteo: {error}")
        return None


def obtener_clima(lat, lon):
    """
    Consulta la lluvia reciente en un punto usando Open-Meteo.

    Parámetros:
        lat (float): latitud del punto a consultar.
        lon (float): longitud del punto a consultar.

    Devuelve:
        dict con "lluvia_ultima_hora" (mm) y "lluvia_acumulada_24h" (mm)
        si la consulta fue exitosa.
        None si hubo cualquier error (timeout, sin conexión, o respuesta
        inesperada de la API). El error se imprime en consola, pero la
        función NO lanza una excepción: quien la llame debe revisar
        "if resultado:" antes de usar los datos.
    """
    datos = obtener_datos_satelitales(lat, lon, past_days=1, forecast_days=1)
    if datos is None:
        return None

    return {
        "lluvia_ultima_hora": datos["current"]["precipitation_mm"],
        "lluvia_acumulada_24h": datos["accumulated_24h_mm"],
    }
if __name__ == "__main__":
    # Prueba rápida que solo se ejecuta al correr 'python clima.py'
    resultado = obtener_clima(6.25, -75.56)
    print("Resultado de prueba:", resultado)
