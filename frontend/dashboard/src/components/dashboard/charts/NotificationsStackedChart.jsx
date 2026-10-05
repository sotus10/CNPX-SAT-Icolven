import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard';
import { ESTADOS_ENVIO } from '../../../utils/series';

/**
 * Gráfica 8 — desempeño del sistema de notificaciones.
 *
 * Barras apiladas por canal (SMS, WhatsApp, Push) segmentadas por estado de envío.
 */
const NotificationsStackedChart = ({ filas = [], resumen, error, badge }) => {
  const hayRegistros = filas.some((fila) => fila.total > 0);
  const enviados = resumen?.enviado ?? 0;
  const total = resumen?.total ?? 0;
  const tasa = total ? Math.round((enviados / total) * 100) : null;

  return (
    <ChartCard
      title="Desempeño del sistema de notificaciones"
      note="Conteo acumulado de envíos a la comunidad, agrupado por canal y segmentado por estado de envío."
      badge={badge}
      error={error}
      isEmpty={!error && !hayRegistros}
      emptyMessage="No hay notificaciones registradas en notificaciones_alertas."
      height={260}
      footer={
        <p className="text-[12px] text-[#808080] dark:text-slate-400">
          {tasa === null
            ? 'Sin envíos registrados para medir la efectividad.'
            : `${enviados} de ${total} envíos quedaron en estado enviado (${tasa}%).`}
        </p>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eff0f6" />
          <XAxis dataKey="canal" tickLine={false} axisLine={false} tick={{ fill: '#a6a6a6', fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: '#a6a6a6', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(27, 89, 248, 0.06)' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #eff0f6',
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {ESTADOS_ENVIO.map(({ clave, label, tone }) => (
            <Bar key={clave} dataKey={clave} name={label} stackId="total" fill={tone} radius={[4, 4, 0, 0]} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default NotificationsStackedChart;
