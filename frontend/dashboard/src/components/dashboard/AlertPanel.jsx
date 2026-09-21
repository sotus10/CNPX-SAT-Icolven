import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { mockAlerts } from '../../data/mock';

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

const AlertPanel = ({ basin = null }) => {
  const [alerts, setAlerts] = useState(mockAlerts);

  const visible = basin ? alerts.filter((a) => a.basin === basin) : alerts;
  const activeCount = visible.filter((a) => a.status === 'active').length;

  const acknowledge = (id) => {
    setAlerts((current) =>
      current.map((alert) => (alert.id === id ? { ...alert, status: 'acknowledged' } : alert))
    );
  };

  const remove = (id) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  };

  if (visible.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[17px] font-bold text-carbon dark:text-slate-100">Alertas actuales</h3>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#16a34a] bg-[#f0fdf4] px-2.5 py-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            Demo
          </span>
        </div>
        <p className="text-[13px] leading-5 text-[#a6a6a6] dark:text-slate-400">
          {basin
            ? `No hay alertas activas para la cuenca seleccionada. Los modelos (Muskingum, ARIMA/Prophet, índice API) monitorean los cauces en segundo plano.`
            : `No hay alertas activas en los datos de demostración.`}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[17px] font-bold text-carbon dark:text-slate-100">Alertas actuales</h3>
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#16a34a] bg-[#f0fdf4] px-2.5 py-1.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
          {activeCount} activas
        </span>
      </div>

      <ul className="space-y-3 flex-1">
        {visible.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity];
          const Icon = config.Icon;
          return (
            <li
              key={alert.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 p-4 rounded-[14px] border border-line dark:border-slate-700 bg-canvas/50 dark:bg-slate-800/70 items-start"
            >
              <span
                className="mt-0.5 h-10 w-10 shrink-0 rounded-[11px] flex items-center justify-center"
                style={{ backgroundColor: config.bg, color: config.color }}
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] leading-5 font-semibold text-carbon dark:text-slate-100">{alert.title}</p>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                    style={{ backgroundColor: config.bg, color: config.color }}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="text-[13px] leading-5 text-[#808080] dark:text-slate-400 line-clamp-3 mt-1">{alert.description}</p>
                <p className="text-[12px] text-[#a6a6a6] dark:text-slate-500 mt-1.5">{timeAgo(alert.timestamp)}</p>
              </div>
              <div className="col-start-2 flex justify-end gap-2">
                {alert.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => acknowledge(alert.id)}
                    className="h-8 w-8 rounded-lg border border-line dark:border-slate-600 text-[#16a34a] hover:bg-[#f0fdf4] flex items-center justify-center transition-colors"
                    aria-label="Reconocer"
                  >
                    <CheckCircle size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(alert.id)}
                  className="h-8 w-8 rounded-lg border border-line dark:border-slate-600 text-[#a6a6a6] hover:text-[#dc2626] hover:bg-[#fef2f2] flex items-center justify-center transition-colors"
                  aria-label="Eliminar"
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AlertPanel;