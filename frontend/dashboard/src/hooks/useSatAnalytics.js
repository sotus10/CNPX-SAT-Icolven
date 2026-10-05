import { useQuery } from 'react-query';
import * as api from '../services/api';

const OPTIONS = {
  // El sensor transmite cada pocos minutos; refrescar más rápido solo carga el backend.
  refetchInterval: 60000,
  staleTime: 30000,
  retry: 1,
};

export const useRawReadings = (limit = 120, options = {}) =>
  useQuery(['raw-readings', limit], () => api.fetchRawReadings(limit), { ...OPTIONS, ...options });

export const useNodes = (options = {}) =>
  useQuery(['nodes'], () => api.fetchNodes(), { ...OPTIONS, refetchInterval: 30000, ...options });

export const useNotifications = (limit = 200, options = {}) =>
  useQuery(['notifications', limit], () => api.fetchNotifications(limit), { ...OPTIONS, ...options });

export default { useRawReadings, useNodes, useNotifications };
