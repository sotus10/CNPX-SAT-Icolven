import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Siren,
  CloudRain,
  Filter,
  ShieldCheck,
} from 'lucide-react';
import { loadAlerts } from '../store/slices/alertsSlice';
import AlertConfirmationDonut from '../components/dashboard/charts/AlertConfirmationDonut';
import NotificationsStackedChart from '../components/dashboard/charts/NotificationsStackedChart';
import SuscripcionPush from '../components/dashboard/SuscripcionPush';
import { useNotifications } from '../hooks/useSatAnalytics';
import { buildAlertConfirmation, buildNotificationSeries } from '../utils/series';

const SEVERITY_CONFIG = {
  critical: { Icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', label: 'Crítica' },
  high: { Icon: AlertCircle, color: '#ea580c', bg: '#fff7ed', label: 'Alta' },
  medium: { Icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', label: 'Media' },
  low: { Icon: AlertCircle, color: '#3b82f6', bg: '#eff6ff', label: 'Baja' },
};

const STATUS_LABEL = { recorded: 'Registrada' };

const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace unos segundos';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

const SEVERITY_TABS = [
  { key: 'all', label: 'Todas las severidades' },
  { key: 'critical', label: 'Crítica' },
  { key: 'high', label: 'Alta' },
  { key: 'medium', label: 'Media' },
  { key: 'low', label: 'Baja' },
];

const AlertsPage = () => {
  const dispatch = useDispatch();
  const { alerts, loading, error } = useSelector((state) => state.alerts);
  const [severity, setSeverity] = React.useState('all');
  const notificationsQuery = useNotifications(200);

  useEffect(() => {
    dispatch(loadAlerts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => alerts.filter((alert) => severity === 'all' || alert.severity === severity),
    [alerts, severity]
  );
  // Las gráficas 6 y 8 resumen el histórico completo, no el filtro de severidad.
  const confirmacion = useMemo(() => buildAlertConfirmation(alerts), [alerts]);
  const notificaciones = useMemo(
    () => buildNotificationSeries(notificationsQuery.data),
    [notificationsQuery.data]
  );

  const { confirmed: confirmedCount, severe: severeCount } = useMemo(
    () => ({
      confirmed: confirmacion.find((sector) => sector.id === 'confirmadas')?.value ?? 0,
      severe: alerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'high').length,
    }),
    [confirmacion, alerts]
  );
  const notificationsError = notificationsQuery.isError
    ? notificationsQuery.error?.message ?? 'No fue posible consultar las notificaciones.'
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Alertas y Comando de Emergencias</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Alertas tempranas de crecidas, sirenas y notificación a organismos de respuesta
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          { Icon: Siren, label: 'Alertas registradas', value: alerts.length, tone: '#dc2626' },
          { Icon: CloudRain, label: 'Confirmadas por satélite', value: confirmedCount, tone: '#1b59f8' },
          { Icon: AlertTriangle, label: 'Nivel alto o crítico', value: severeCount, tone: '#ea580c' },
          { Icon: Info, label: 'Estado persistido', value: 'Solo lectura', tone: '#64748b' },
        ].map(({ Icon, label, value, tone }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-4 flex items-center gap-3">
            <span className="h-9 w-9 shrink-0 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: `${tone}14`, color: tone }}>
              <Icon size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a6a6a6]">{label}</p>
              <p className="text-[18px] font-bold text-carbon dark:text-slate-100 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <SuscripcionPush />

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#808080]">
          <Filter size={13} />
          Mostrar
        </span>
        <span className="text-[13px] font-semibold text-carbon">Fuente: API SAT · Supabase</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SEVERITY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSeverity(tab.key)}
              className={`h-9 px-3.5 rounded-[10px] border text-[13px] font-semibold transition-colors ${
                severity === tab.key
                  ? 'bg-[#1b59f8]/10 text-primary border-primary/60'
                  : 'bg-white dark:bg-slate-800 border-line dark:border-slate-700 text-[#4d4d4d] dark:text-slate-300 hover:border-primary/40'
              }`}
            >
              {tab.label}
            </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card overflow-hidden">
        {loading && filtered.length === 0 && (
          <p className="p-8 text-center text-[13px] text-[#a6a6a6]">Cargando alertas...</p>
        )}

        {error && alerts.length === 0 && (
          <p className="p-8 text-center text-[13px] text-[#a6a6a6]">
            No fue posible conectar con el servicio de alertas.
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center mb-3">
              <ShieldCheck size={22} />
            </div>
            <p className="text-[14px] font-semibold text-carbon">Sin alertas registradas</p>
            <p className="text-[13px] text-[#a6a6a6] mt-1">
              No hay registros SAT que coincidan con esta severidad.
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <ul className="divide-y divide-line">
            {filtered.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.Icon;
              return (
                <li key={alert.id} className="flex items-start gap-4 p-4 hover:bg-canvas/50 transition-colors">
                  <span
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-[10px] flex items-center justify-center"
                    style={{ backgroundColor: config.bg, color: config.color }}
                  >
                    <Icon size={17} />
                  </span>

                  <div className="flex-1 min-w-0">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <AlertConfirmationDonut
          sectors={confirmacion}
          total={alerts.length}
          badge={`${alerts.length} alertas registradas`}
          error={error && alerts.length === 0 ? 'No fue posible conectar con el servicio de alertas.' : null}
        />
        <NotificationsStackedChart
          filas={notificaciones.filas}
          resumen={notificaciones.resumen}
          badge="notificaciones_alertas"
          error={notificationsError}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">

                      <p className="text-[14px] font-semibold text-carbon">{alert.title}</p>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#f0f1f6] text-[#4d4d4d]">
                        {STATUS_LABEL[alert.status] ?? 'Registrada'}
                      </span>
                      {alert.code && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                          {alert.code}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#808080] mt-1">{alert.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-[#a6a6a6]">
                      <span className="flex items-center gap-1">
                        <Info size={11} /> código: {alert.code ?? alert.metric}
                      </span>
                      <span>{timeAgo(alert.timestamp)}</span>
                      <span>Confirmada por satélite: {alert.confirmada_por_satelite ? 'Sí' : 'No'}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;