import React, { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { fetchAlerts } from '../../services/api';

const SEVERITY_CONFIG = {
  critical: { Icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', label: 'Crítica' },
  high: { Icon: AlertCircle, color: '#ea580c', bg: '#fff7ed', label: 'Alta' },
  medium: { Icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', label: 'Media' },
  low: { Icon: AlertCircle, color: '#3b82f6', bg: '#eff6ff', label: 'Baja' },
};

const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace unos segundos';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

const AlertPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetchAlerts()
      .then((data) => {
        if (active) setAlerts(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[17px] font-bold text-carbon dark:text-slate-100">Alertas SAT registradas</h3>
        <span className="text-[12px] font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-full">
          {loading ? 'Consultando…' : `${alerts.length} registros`}
        </span>
      </div>

      {error ? (
        <p className="text-[13px] leading-5 text-amber-700">No se pudieron consultar las alertas: {error}</p>
      ) : alerts.length === 0 ? (
        <p className="text-[13px] leading-5 text-[#a6a6a6] dark:text-slate-400">
          {loading ? 'Consultando alertas en la API SAT…' : 'La API SAT no tiene alertas registradas.'}
        </p>
      ) : (
        <ul className="space-y-3 flex-1">
          {alerts.slice(0, 5).map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
            const Icon = config.Icon;
            return (
              <li key={alert.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 p-4 rounded-[14px] border border-line dark:border-slate-700 bg-canvas/50 dark:bg-slate-800/70 items-start">
                <span className="mt-0.5 h-10 w-10 shrink-0 rounded-[11px] flex items-center justify-center" style={{ backgroundColor: config.bg, color: config.color }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] leading-5 font-semibold text-carbon dark:text-slate-100">{alert.title}</p>
                  <p className="text-[13px] leading-5 text-[#808080] dark:text-slate-400 mt-1">{alert.description}</p>
                  <p className="text-[11px] text-[#a6a6a6] dark:text-slate-500 mt-1.5">
                    {timeAgo(alert.timestamp)} · Confirmada por satélite: {alert.confirmada_por_satelite ? 'Sí' : 'No'}
                  </p>
                </div>
                <span className="col-start-2 w-fit text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: config.bg, color: config.color }}>
                  {config.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AlertPanel;
