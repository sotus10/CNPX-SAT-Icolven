import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import ChartCard from './ChartCard';

const CRUDA_COLOR = '#dc2626';
const LIMPIA_COLOR = '#16a34a';

/**
 * Gráfica 5 — eficiencia del algoritmo de limpieza.
 *
 * Cada mensaje se guarda crudo antes de validarse, de modo que los huecos de la
 * línea verde son lecturas que el filtro descartó, no datos faltantes.
 */
const RawVsCleanChart = ({ puntos = [], resumen, error, badge, height = 300 }) => (
  <ChartCard
    title="Eficiencia del algoritmo de limpieza · filtro de ruido"
    note="Roja discontinua: distancia reportada por el receptor antes de validar. Verde: distancia ya validada. Cuando la línea verde se interrumpe, el backend descartó esa lectura por estar fuera de rango."
    badge={badge}
    error={error}
    isEmpty={!error && puntos.length === 0}
    emptyMessage="El receptor aún no ha enviado lecturas crudas."
    height={height}
    footer={
      resumen && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
          <div>
            <dt className="text-[#a6a6a6]">Lecturas crudas</dt>
            <dd className="font-bold text-carbon dark:text-slate-100">{resumen.crudas}</dd>
          </div>
          <div>
            <dt className="text-[#a6a6a6]">Conservadas</dt>
            <dd className="font-bold text-carbon dark:text-slate-100">{resumen.conservadas}</dd>
          </div>
          <div>
            <dt className="text-[#a6a6a6]">Descartadas</dt>
            <dd className="font-bold" style={{ color: resumen.descartadas ? CRUDA_COLOR : undefined }}>
              {resumen.descartadas}
            </dd>
          </div>
          <div>
            <dt className="text-[#a6a6a6]">Tasa de descarte</dt>
            <dd className="font-bold text-carbon dark:text-slate-100">
              {resumen.tasaDescarte === null ? 'Sin base comparable' : `${resumen.tasaDescarte}%`}
            </dd>
          </div>
        </dl>
      )
    }
  >
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eff0f6" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tick={{ fill: '#a6a6a6', fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fill: '#a6a6a6', fontSize: 11 }}
          label={{ value: 'cm', angle: -90, position: 'insideLeft', fill: '#a6a6a6', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #eff0f6',
            fontSize: 13,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          formatter={(valor, nombre) => [
            valor === null || valor === undefined ? 'Descartada por el filtro' : `${valor} cm`,
            nombre,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="cruda"
          name="Lectura cruda"
          stroke={CRUDA_COLOR}
          strokeWidth={1.75}
          strokeDasharray="5 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="limpia"
          name="Lectura validada"
          stroke={LIMPIA_COLOR}
          strokeWidth={2.5}
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </ChartCard>
);

export default RawVsCleanChart;
