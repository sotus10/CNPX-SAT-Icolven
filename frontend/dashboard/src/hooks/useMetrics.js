import { useQuery } from 'react-query';
import * as api from '../services/api';

export const useMetrics = (params, options = {}) =>
  useQuery(
    ['metrics', params],
    () => api.fetchMetrics(params),
    {
      // Los modelos estadísticos publican nuevas métricas periodicamente;
      // refresco conservador para evitar cargar el backend.
      refetchInterval: 60000,
      ...options,
    }
  );

export const useAlerts = (status = 'active', options = {}) =>
  useQuery(
    ['alerts', status],
    () => api.fetchAlerts(status),
    {
      refetchInterval: 30000,
      ...options,
    }
  );

export default { useMetrics, useAlerts };