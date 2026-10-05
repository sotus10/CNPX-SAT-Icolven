import React from 'react';
import { Info } from 'lucide-react';

/**
 * Envoltura común de las gráficas internas: título, nota metodológica y estados
 * de carga, error y vacío.
 */
const ChartCard = ({
  title,
  note,
  badge,
  error,
  isEmpty = false,
  emptyMessage = 'Sin datos para el periodo seleccionado.',
  height = 280,
  footer,
  children,
}) => (
  <div className="flex flex-col bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-2 min-w-0">
        <h3 className="text-[15px] font-bold text-carbon dark:text-slate-100">{title}</h3>
        {note && <Info size={14} className="mt-0.5 shrink-0 text-[#a6a6a6]" />}
      </div>
      {badge && (
        <span className="shrink-0 text-[12px] font-semibold text-[#808080] dark:text-slate-400">{badge}</span>
      )}
    </div>

    {note && (
      <p className="-mt-2 mb-3 text-[11px] leading-relaxed text-[#808080] dark:text-slate-500">{note}</p>
    )}

    <div style={height ? { height } : undefined} className="min-w-0">
      {error || isEmpty ? (
        <p className="min-h-[140px] h-full flex items-center justify-center text-center text-[13px] text-[#a6a6a6] px-4">
          {error || emptyMessage}
        </p>
      ) : (
        children
      )}
    </div>

    {footer && !error && !isEmpty && <div className="mt-4">{footer}</div>}
  </div>
);

export default ChartCard;
