import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

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

export const fetchAlerts = async (status = 'active') => {
  const { data } = await apiClient.get('/alerts', { params: { status } });
  return data;
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