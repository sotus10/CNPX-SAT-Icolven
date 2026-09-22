import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  X,
  RotateCcw,
  Info,
  ShieldCheck,
  Siren,
  Users,
  MapPinned,
  Timer,
  Filter,
} from 'lucide-react';
import {
  acknowledgeAlert,
  resolveAlert,
  removeAlert,
} from '../store/slices/alertsSlice';
import { bootstrapAlerts } from '../services/bootstrap';
import Select from '../components/ui/Select';
import { BASINS, mockDispatchSummary } from '../data/mock';

const SEVERITY_CONFIG = {
  critical: { Icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', label: 'Crítica' },
  high: { Icon: AlertCircle, color: '#ea580c', bg: '#fff7ed', label: 'Alta' },
  medium: { Icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', label: 'Media' },
  low: { Icon: AlertCircle, color: '#3b82f6', bg: '#eff6ff', label: 'Baja' },
};

const STATUS_LABEL = { active: 'Activa', acknowledged: 'Reconocida', resolved: 'Resuelta' };

const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace unos segundos';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

const filterTabs = [
  { key: 'active', label: 'Activas' },
  { key: 'acknowledged', label: 'Reconocidas' },
  { key: 'resolved', label: 'Resueltas' },
  { key: 'all', label: 'Todas' },
];

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
  const [statusFilter, setStatusFilter] = React.useState('active');
  const [severity, setSeverity] = React.useState('all');
  const [basin, setBasin] = React.useState('all');

  useEffect(() => {
    bootstrapAlerts(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseScope = useMemo(
    () =>
      alerts.filter(
        (a) =>
          (severity === 'all' || a.severity === severity) &&
          (basin === 'all' || a.basin === basin)
      ),
    [alerts, severity, basin]
  );

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return baseScope;
    return baseScope.filter((a) => a.status === statusFilter);
  }, [baseScope, statusFilter]);

  const counts = useMemo(
    () => ({
      active: baseScope.filter((a) => a.status === 'active').length,
      acknowledged: baseScope.filter((a) => a.status === 'acknowledged').length,
      resolved: baseScope.filter((a) => a.status === 'resolved').length,
    }),
    [baseScope]
  );

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
          { Icon: Siren, label: 'Sirenas activas', value: mockDispatchSummary.sirensActive, tone: '#dc2626' },
          { Icon: Users, label: 'Confirmación organismos', value: `${mockDispatchSummary.confirmationRate}%`, tone: '#ea580c' },
          { Icon: MapPinned, label: 'Zonas de evacuación', value: mockDispatchSummary.evacuatedZones, tone: '#1b59f8' },
          { Icon: Timer, label: 'Lead time disponible', value: mockDispatchSummary.leadTime, tone: '#f59e0b' },
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

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#808080]">
          <Filter size={13} />
          Mostrar
        </span>
        <Select value={basin} onChange={(e) => setBasin(e.target.value)}>
          <option value="all">Todas las cuencas</option>
          {BASINS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`h-9 px-3.5 rounded-[10px] border text-[13px] font-semibold transition-colors ${
                statusFilter === tab.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white dark:bg-slate-800 border-line dark:border-slate-700 text-[#4d4d4d] dark:text-slate-300 hover:border-primary/40'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className={`ml-1.5 text-[11px] ${statusFilter === tab.key ? 'text-white/80' : 'text-[#a6a6a6]'}`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-[#a6a6a6] hidden sm:inline">·</span>
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
            <p className="text-[14px] font-semibold text-carbon">Sin alertas en este estado</p>
            <p className="text-[13px] text-[#a6a6a6] mt-1">
              Las estaciones continúan monitoreando cauces y precipitación en segundo plano.
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-carbon">{alert.title}</p>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#f0f1f6] text-[#4d4d4d]">
                        {STATUS_LABEL[alert.status]}
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
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    {alert.status === 'active' && (
                      <>
                        <button
                          type="button"
                          title="Reconocer"
                          onClick={() => dispatch(acknowledgeAlert(alert.id))}
                          className="h-8 px-2.5 rounded-[8px] border border-line text-[12px] font-semibold text-[#16a34a] hover:bg-[#f0fdf4] transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} /> Reconocer
                        </button>
                        <button
                          type="button"
                          title="Resolver"
                          onClick={() => dispatch(resolveAlert(alert.id))}
                          className="h-8 px-2.5 rounded-[8px] border border-line text-[12px] font-semibold text-dark hover:bg-canvas transition-colors flex items-center gap-1.5"
                        >
                          <RotateCcw size={14} /> Resolver
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => dispatch(removeAlert(alert.id))}
                      className="h-8 w-8 rounded-[8px] border border-line text-[#a6a6a6] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
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