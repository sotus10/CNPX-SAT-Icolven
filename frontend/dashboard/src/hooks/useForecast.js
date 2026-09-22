import { useMemo } from 'react';

/**
 * Pronóstico simple para el dashboard (suavizado exponencial).
 * En producción el backend estadístico (ARIMA/Prophet, especificado en el SDD
 * sección 6) alimenta esta serie vía `REACT_APP_STATS_API`.
 */
const useForecast = (series = [], horizon = 7, alpha = 0.3) =>
  useMemo(() => {
    if (!series || series.length === 0) {
      return { forecast: [], forecastPoints: [], currentValue: null, error: null };
    }

    const values = series.map((p) => Number(p.value));
    let smoothed = values[0];
    for (let i = 1; i < values.length; i += 1) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    const lastTimestamp = series[series.length - 1]?.timestamp ?? Date.now();
    const stepMs = series.length > 1
      ? (series[series.length - 1].timestamp - series[series.length - 2].timestamp)
      : 24 * 60 * 60 * 1000;

    const forecast = Array.from({ length: horizon }, (_, i) => ({
      timestamp: lastTimestamp + stepMs * (i + 1),
      value: Math.round(smoothed * 100) / 100,
    }));

    const forecastPoints = series.concat(forecast).map((p) => ({
      ...p,
      isForecast: p.timestamp > lastTimestamp,
    }));

    return { forecast, forecastPoints, currentValue: smoothed, error: null };
  }, [series, horizon, alpha]);

export default useForecast;