import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Se exporta para los endpoints de suscripción push, que son públicos por diseño
// (los llama el navegador del suscriptor, no el nodo con X-API-Key).
export { apiClient as api };

const getDataEndpointError = (error, resource) => {
  if (!error.response) {
    return `No se pudo conectar con la API (${API_URL}). Verifica que el backend esté activo.`;
  }
  if (error.response.status >= 500) {
    return `La API responde, pero no pudo consultar ${resource}. Verifica SUPABASE_URL y SUPABASE_KEY en backend/.env.`;
  }
  return error.response.data?.detail ?? error.message;
};

const unwrapRows = (payload, resource) => {
  const rows = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(rows)) {
    throw new Error(`La API devolvió un formato de ${resource} no válido.`);
  }
  return rows;
};

const fetchRows = async (ruta, params, resource) => {
  let data;
  try {
    ({ data } = await apiClient.get(ruta, { params }));
  } catch (error) {
    throw new Error(getDataEndpointError(error, resource));
  }
  return unwrapRows(data, resource);
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

export const fetchSensorHistory = (limit = 48) =>
  fetchRows('/historial', { limite: limit }, 'las lecturas');

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

const SEVERITY_POR_NIVEL = {
  ROJO: 'critical',
  NARANJA: 'high',
  AMARILLO: 'medium',
  VERDE: 'low',
};

export const fetchAlerts = async () => {
  const alerts = await fetchRows('/alertas', { limite: 100 }, 'las alertas');

  return alerts.map((alert) => {
    const level = String(alert.nivel_final ?? 'VERDE').toUpperCase();

    return {
      ...alert,
      id: alert.id ?? alert.lectura_id,
      title: `Alerta ${level}`,
      severity: SEVERITY_POR_NIVEL[level] ?? 'low',
      description: alert.confirmada_por_satelite
        ? 'Alerta registrada y confirmada con datos satelitales.'
        : 'Alerta registrada; no figura confirmación satelital.',
      status: 'recorded',
      timestamp: Date.parse(alert.timestamp) || Date.now(),
      metric: 'nivel_final',
      code: level,
    };
  });
};

export const fetchRawReadings = (limit = 120) =>
  fetchRows('/lecturas-crudas', { limite: limit }, 'las lecturas crudas');

export const fetchNodes = () => fetchRows('/nodos', undefined, 'los nodos');

export const fetchNotifications = (limit = 200) =>
  fetchRows('/notificaciones', { limite: limit }, 'las notificaciones');

// --- WhatsApp -------------------------------------------------------------
// El número se guarda en Supabase, no en el navegador: si viviera solo en
// localStorage el backend no podría notificarlo.

const whatsappError = (error) => {
  if (!error.response) {
    return `No se pudo conectar con la API (${API_URL}). Verifica que el backend esté activo.`;
  }
  return error.response.data?.detail ?? error.message;
};

export const fetchEstadoWhatsapp = async () => {
  try {
    const { data } = await apiClient.get('/whatsapp/estado');
    return data;
  } catch (error) {
    throw new Error(whatsappError(error));
  }
};

export const fetchMiContactoWhatsapp = async (telefono) => {
  try {
    const { data } = await apiClient.get('/whatsapp/contacto', { params: { telefono } });
    return data;
  } catch (error) {
    throw new Error(whatsappError(error));
  }
};

export const guardarMiContactoWhatsapp = async (payload) => {
  try {
    const { data } = await apiClient.post('/whatsapp/contactos', payload);
    return data;
  } catch (error) {
    throw new Error(whatsappError(error));
  }
};

export const revocarMiContactoWhatsapp = async (telefono) => {
  try {
    const { data } = await apiClient.post('/whatsapp/consentimiento/revocar', { telefono });
    return data;
  } catch (error) {
    throw new Error(whatsappError(error));
  }
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