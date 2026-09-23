import requests

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
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "precipitation",
        "hourly": "precipitation",
        "past_days": 1,
        "forecast_days": 1,
        "timezone": "GMT",
    }

    try:
        # Petición a la API con timeout
        r = requests.get(url, params=params, timeout=10)
        
        # Verifica si hubo algún error HTTP (4xx o 5xx)
        r.raise_for_status()
        
        data = r.json()

        horas = data["hourly"]["time"]
        lluvia = data["hourly"]["precipitation"]
        hora_actual = data["current"]["time"][:13] + ":00"
        
        i = horas.index(hora_actual)

        lluvia_ultima_hora = lluvia[i]
        lluvia_acumulada_24h = sum(x for x in lluvia[max(0, i - 23): i + 1] if x is not None)

        return {
            "lluvia_ultima_hora": lluvia_ultima_hora,
            "lluvia_acumulada_24h": round(lluvia_acumulada_24h, 2),
        }

    except requests.exceptions.Timeout:
        print("[ERROR] La solicitud a la API del clima agotó el tiempo de espera (Timeout).")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Error de red o comunicación con la API: {e}")
    except (KeyError, ValueError) as e:
        print(f"[ERROR] Error al procesar los datos recibidos de la API: {e}")

    # Retorno por defecto en caso de que ocurra cualquier error
    return None
if __name__ == "__main__":
    # Prueba rápida que solo se ejecuta al correr 'python clima.py'
    resultado = obtener_clima(6.25, -75.56)
    print("Resultado de prueba:", resultado)
