import React from 'react';
import { Info, ChevronDown } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

const ACTIVE_BAR_COLOR = '#1b59f8';
const INACTIVE_BAR_COLOR = '#e8ebf2';

const ActivityChart = ({ data = [], className = '', title = 'Actividad', range = 'Este año' }) => (
  <div className={`bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-[15px] font-bold text-carbon dark:text-slate-100">{title}</h3>
        <Info size={14} className="text-[#a6a6a6]" />
      </div>
      <button type="button" className="flex items-center gap-1 text-[12px] font-semibold text-[#a6a6a6] dark:text-slate-400 hover:text-carbon dark:hover:text-slate-100 transition-colors">
        {range}
        <ChevronDown size={13} />
      </button>
    </div>

    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f2f7" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#a6a6a6', fontSize: 12 }}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#a6a6a6', fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: 'rgba(27, 89, 248, 0.06)' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #eff0f6',
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 3, 3]} maxBarSize={34}>
            {data.map((entry) => (
              <Cell
                key={entry.label}
                fill={entry.active ? ACTIVE_BAR_COLOR : INACTIVE_BAR_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default ActivityChart;