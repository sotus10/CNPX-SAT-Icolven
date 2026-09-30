import { loadDashboard } from '../store/slices/dashboardSlice';
import { hydrate } from '../store/slices/dashboardSlice';
import { loadAlerts } from '../store/slices/alertsSlice';
import { hydrateAlerts } from '../store/slices/alertsSlice';

const isoPastDays = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

/** Carga datos de la API sin sustituir errores por datos de demostración. */
export const bootstrapDashboard = async (dispatch) => {
  try {
    const params = { start_date: isoPastDays(30), end_date: new Date().toISOString() };
    await dispatch(loadDashboard(params)).unwrap();
  } catch (error) {
    console.warn('[bootstrap] No fue posible cargar datos de la API SAT', error);
    dispatch(hydrate({ kpis: [], series: [] }));
  }
};

export const bootstrapAlerts = async (dispatch) => {
  try {
    await dispatch(loadAlerts('active')).unwrap();
  } catch (error) {
    console.warn('[bootstrap] No fue posible cargar alertas de la API SAT', error);
    dispatch(hydrateAlerts([]));
  }
};