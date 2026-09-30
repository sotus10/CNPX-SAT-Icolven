import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const getDataEndpointError = (error, resource) => {
  if (!error.response) {
    return `No se pudo conectar con la API (${API_URL}). Verifica que el backend esté activo.`;
  }
  if (error.response.status >= 500) {
    return `La API responde, pero no pudo consultar ${resource}. Verifica SUPABASE_URL y SUPABASE_KEY en backend/.env.`;
  }
  return error.response.data?.detail ?? error.message;
};

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const fetchMetrics = async (params = {}) => {
  const { data } = await apiClient.get('/basins/status', { params });
  return data;
};

export const fetchSatelliteData = async (params = {}) => {
  const { data } = await apiClient.get('/satelital', { params });
  return data;
};

export const fetchSensorHistory = async (limit = 48) => {
  let data;
  try {
    ({ data } = await apiClient.get('/historial', { params: { limite: limit } }));
  } catch (error) {
    throw new Error(getDataEndpointError(error, 'las lecturas'));
  }
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

export const fetchLatestSensorReading = async () => {
  const { data } = await apiClient.get('/ultima-lectura');
  return data;
};

export const fetchBasinStatus = async (basinId) => {
  const { data } = await apiClient.get(`/stations/${basinId}`);
  return data;
};

export const fetchHydrologyCurrent = async (basinId) => {
  const { data } = await apiClient.get('/hydrology/current', { params: { basin_id: basinId } });
  return data;
};

export const fetchReservoirs = async (basinId) => {
  const { data } = await apiClient.get('/reservoirs', { params: { basin_id: basinId } });
  return data;
};

export const fetchForecastHydrology = async (params = {}) => {
  const { data } = await apiClient.get('/forecast/hydrology', { params });
  return data;
};

export const fetchSoilStatus = async () => {
  const { data } = await apiClient.get('/geotech/soil-status');
  return data;
};

export const notifyDispatch = async ({ alert_id, orgs }) => {
  const { data } = await apiClient.post('/dispatch/notify', { alert_id, orgs });
  return data;
};

export const fetchCommsStatus = async () => {
  const { data } = await apiClient.get('/comms/status');
  return data;
};

export const fetchAlerts = async () => {
  let data;
  try {
    ({ data } = await apiClient.get('/alertas', { params: { limite: 100 } }));
  } catch (error) {
    throw new Error(getDataEndpointError(error, 'las alertas'));
  }
  const alerts = Array.isArray(data) ? data : data?.data;
  if (!Array.isArray(alerts)) {
    throw new Error('La API devolvió un formato de alertas no válido.');
  }

  return alerts.map((alert) => {
    const level = String(alert.nivel_final ?? 'VERDE').toUpperCase();
    const severity = {
      ROJO: 'critical',
      NARANJA: 'high',
      AMARILLO: 'medium',
      VERDE: 'low',
    }[level] ?? 'low';

    return {
      ...alert,
      id: alert.id ?? alert.lectura_id,
      title: `Alerta ${level}`,
      description: alert.confirmada_por_satelite
        ? 'Alerta registrada y confirmada con datos satelitales.'
        : 'Alerta registrada; no figura confirmación satelital.',
      severity,
      status: 'recorded',
      timestamp: Date.parse(alert.timestamp) || Date.now(),
      metric: 'nivel_final',
      code: level,
    };
  });
};

export const updateAlertRule = async (id, payload) => {
  const { data } = await apiClient.put(`/alert-rules/${id}`, payload);
  return data;
};

export const generateReport = async (payload) => {
  const { data } = await apiClient.post('/reports/generate', payload, {
    responseType: 'blob',
  });
  return data;
};

export const login = async (credentials) => {
  const { data } = await apiClient.post('/auth/login', credentials);
  return data;
};

export default apiClient;