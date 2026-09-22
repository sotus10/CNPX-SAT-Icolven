import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

const ChartContainer = ({ type = 'line', data, dataKeys = [], xKey = 'label', colors = [], height = 280 }) => {
  const renderChart = () => {
    if (type === 'bar') {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eff0f6" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: '#a6a6a6', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#a6a6a6', fontSize: 12 }} width={40} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #eff0f6', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {dataKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i]} radius={[6, 6, 6, 6]} />
          ))}
        </BarChart>
      );
    }

    if (type === 'area') {
      return (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b59f8" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#1b59f8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eff0f6" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: '#a6a6a6', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#a6a6a6', fontSize: 12 }} width={40} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #eff0f6', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          {dataKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i]}
              strokeWidth={2}
              fill={i === 0 ? 'url(#chartArea)' : 'transparent'}
              dot={false}
            />
          ))}
        </AreaChart>
      );
    }

    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eff0f6" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: '#a6a6a6', fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#a6a6a6', fontSize: 12 }} width={40} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #eff0f6', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {dataKeys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={colors[i]} strokeWidth={2.5} dot={false} />
        ))}
      </LineChart>
    );
  };

  return (
    <div style={{ width: '100%', height }} className="text-carbon">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartContainer;