import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import ChartCard from './ChartCard';

const NIVEL_COLOR = '#1b59f8';
const LLUVIA_COLOR = '#38bdf8';

/**
 * Gráfica 4 — análisis hidrológico combinado (río contra lluvia).
 *
 * Doble eje Y: distancia al agua en la izquierda y precipitación en la derecha,
 * como exige la especificación. Menos distancia significa más agua.
 */
const HydroDualAxisChart = ({ puntos = [], lag = null, error, badge, height = 300 }) => {
  const conLluvia = puntos.filter((punto) => punto.precipitacion !== null).length;
  const conSensor = puntos.filter((punto) => punto.distancia_cm !== null).length;

  return (
    <ChartCard
      title="Análisis hidrológico combinado · río vs. lluvia"
      note="Línea: distancia al agua del JSN-SR04T (eje izquierdo, menos cm = más agua). Barras: precipitación horaria de Open-Meteo (eje derecho). Un valor menor en la línea significa que el cauce subió."
      badge={badge}
      error={error}
      isEmpty={!error && conLluvia === 0 && conSensor === 0}
      emptyMessage="Aún no hay lecturas del sensor ni registros de lluvia para cruzarlos."
      height={height}
      footer={
        <p className="text-[12px] text-[#808080] dark:text-slate-400">
          {lag
            ? `La lluvia comenzó a las ${lag.inicioLluvia} y el cauce superó el nivel previo a las ${lag.respuesta}: retardo de ${lag.horas} h.`
            : 'No hay un episodio de lluvia con subida posterior del cauce en la ventana consultada, así que el retardo no es calculable.'}
        </p>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eff0f6" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: '#a6a6a6', fontSize: 11 }}
          />
          <YAxis
            yAxisId="distancia"
            orientation="left"
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: '#a6a6a6', fontSize: 11 }}
            label={{ value: 'cm al agua', angle: -90, position: 'insideLeft', fill: '#a6a6a6', fontSize: 10 }}
          />
          <YAxis
            yAxisId="lluvia"
            orientation="right"
            reversed
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: '#a6a6a6', fontSize: 11 }}
            label={{ value: 'mm/h', angle: 90, position: 'insideRight', fill: '#a6a6a6', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #eff0f6',
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(valor, nombre) => [
              valor === null || valor === undefined ? 'Sin dato' : `${valor} ${nombre === 'Distancia al agua' ? 'cm' : 'mm/h'}`,
              nombre,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
          <Bar
            yAxisId="lluvia"
            dataKey="precipitacion"
            name="Precipitación (mm/h)"
            fill={LLUVIA_COLOR}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
          <Line
            yAxisId="distancia"
            type="monotone"
            dataKey="distancia_cm"
            name="Distancia al agua"
            stroke={NIVEL_COLOR}
            strokeWidth={2.5}
            dot={{ r: 3, fill: NIVEL_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export default HydroDualAxisChart;
