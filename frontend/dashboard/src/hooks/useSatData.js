import { useCallback, useEffect, useState } from 'react';
import { fetchAlerts, fetchSatelliteData, fetchSensorHistory } from '../services/api';

/**
 * `limit` debe cubrir el periodo más largo que la página pueda seleccionar: los
 * selectores de "últimas 24/48 horas" recortan en cliente, así que pedir menos
 * que el máximo dejaría la opción larga con menos datos de los que promete.
 */
const MAX_PERIODO = 48;

const useSatData = (limit = MAX_PERIODO) => {
  const [satellite, setSatellite] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [satelliteResult, readingsResult, alertsResult] = await Promise.allSettled([
      fetchSatelliteData(),
      fetchSensorHistory(limit),
      fetchAlerts(),
    ]);

    const nextErrors = {};
    if (satelliteResult.status === 'fulfilled') {
      setSatellite(satelliteResult.value);
    } else {
      nextErrors.satellite = satelliteResult.reason?.message ?? 'Error consultando Open-Meteo';
    }
    if (readingsResult.status === 'fulfilled') {
      setReadings(Array.isArray(readingsResult.value) ? readingsResult.value : []);
    } else {
      nextErrors.readings = readingsResult.reason?.message ?? 'Error consultando lecturas';
    }
    if (alertsResult.status === 'fulfilled') {
      setAlerts(Array.isArray(alertsResult.value) ? alertsResult.value : []);
    } else {
      nextErrors.alerts = alertsResult.reason?.message ?? 'Error consultando alertas';
    }

    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 15 * 1000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return { satellite, readings, alerts, errors, loading, lastUpdated, refresh };
};

export default useSatData;