import { loadDashboard } from '../store/slices/dashboardSlice';
import { hydrate } from '../store/slices/dashboardSlice';
import { loadAlerts } from '../store/slices/alertsSlice';
import { hydrateAlerts } from '../store/slices/alertsSlice';
import { mockBasinKPIs, mockLevelSeries, mockAlerts } from '../data/mock';

const isoPastDays = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

/**
 * Carga los datos desde la API REST. Si el backend aún no está disponible
 * (arranque local sin servicios), hidrata el store con datos de demostración
 * para que la UI sea navegable y testeable de inmediato.
 */
export const bootstrapDashboard = async (dispatch) => {
  try {
    const params = { start_date: isoPastDays(30), end_date: new Date().toISOString() };
    await dispatch(loadDashboard(params)).unwrap();
  } catch (error) {
    console.warn('[bootstrap] API no disponible, usando datos demo', error);
    dispatch(hydrate({ kpis: mockBasinKPIs, series: mockLevelSeries }));
  }
};

export const bootstrapAlerts = async (dispatch) => {
  try {
    await dispatch(loadAlerts('active')).unwrap();
  } catch (error) {
    console.warn('[bootstrap] API de alertas no disponible, usando datos demo', error);
    dispatch(hydrateAlerts(mockAlerts));
  }
};