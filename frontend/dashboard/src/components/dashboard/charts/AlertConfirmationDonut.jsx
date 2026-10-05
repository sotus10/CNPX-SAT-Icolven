import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import ChartCard from './ChartCard';

const CENTRO = 46;

/**
 * Gráfica 6 — coherencia entre alertas y confirmación satelital.
 *
 * Audita qué fracción de las alertas registradas estuvo respaldada por lluvia
 * observada y qué fracción puede deberse solo a la señal del sensor.
 */
const AlertConfirmationDonut = ({ sectors = [], total = 0, error, badge }) => {
  const confirmadas = sectors.find((sector) => sector.id === 'confirmadas')?.value ?? 0;
  const porcentaje = total ? Math.round((confirmadas / total) * 100) : null;

  return (
    <ChartCard
      title="Coherencia de alertas y confirmación satelital"
      note="Reparto de las alertas registradas según la columna confirmada_por_satelite. Una alerta sin lluvia satelital simultánea puede deberse a una anomalía del sensor."
      badge={badge}
      error={error}
      isEmpty={!error && total === 0}
      emptyMessage="No hay alertas registradas para auditar."
      height={240}
      footer={
        <div className="flex items-center gap-2 text-[12px] text-[#808080] dark:text-slate-400">
          {porcentaje === null ? (
            <ShieldAlert size={14} />
          ) : porcentaje >= 50 ? (
            <ShieldCheck size={14} className="text-[#16a34a]" />
          ) : (
            <ShieldAlert size={14} className="text-[#f59e0b]" />
          )}
          <span>
            {porcentaje === null
              ? 'Sin alertas para medir la coherencia.'
              : `${confirmadas} de ${total} alertas con respaldo de lluvia (${porcentaje}%).`}
          </span>
        </div>
      }
    >
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sectors}
              dataKey="value"
              nameKey="name"
              innerRadius={CENTRO}
              outerRadius={CENTRO + 34}
              paddingAngle={2}
              strokeWidth={0}
            >
              {sectors.map((sector) => (
                <Cell key={sector.name} fill={sector.tone} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #eff0f6',
                fontSize: 13,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(valor, nombre) => [
                `${valor} (${total ? Math.round((valor / total) * 100) : 0}%)`,
                nombre,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-bold leading-none text-carbon dark:text-slate-100">
            {porcentaje === null ? '—' : `${porcentaje}%`}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-[#a6a6a6]">Con lluvia</span>
        </div>
      </div>
    </ChartCard>
  );
};

export default AlertConfirmationDonut;
