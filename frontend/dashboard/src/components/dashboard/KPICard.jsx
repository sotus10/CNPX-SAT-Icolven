import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

const TrendIcon = ({ status }) => {
  if (status === 'positive') {
    return <TrendingUp size={13} className="text-[#16a34a]" />;
  }
  if (status === 'negative') {
    return <TrendingDown size={13} className="text-[#dc2626]" />;
  }
  return <Minus size={13} className="text-[#808080]" />;
};

const KPICard = ({ kpi, onClick }) => {
  const {
    label,
    value,
    unit = '',
    change = 0,
    changeLabel = '',
    status = 'neutral',
    subtext = '',
    operationalDetails = [],
    spark = [],
    icon: Icon,
  } = kpi;

  const sparkData = spark.map((v, i) => ({ i, v }));
  const trendColor = status === 'positive' ? '#16a34a' : status === 'negative' ? '#dc2626' : '#808080';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5 flex flex-col gap-3 ${
        onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#4d4d4d] dark:text-slate-300">{label}</span>
        {Icon && (
          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon size={16} />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[26px] font-bold tracking-tight text-carbon dark:text-slate-100">
          {typeof value === 'number' ? fmt.format(value) : value}
        </span>
        {unit && <span className="text-[13px] font-semibold text-[#808080] dark:text-slate-400">{unit}</span>}
      </div>

      <div className="flex items-center gap-1.5 text-[12px] font-semibold">
        <TrendIcon status={status} />
        <span className={trendColor === '#16a34a' ? 'text-[#16a34a]' : trendColor === '#dc2626' ? 'text-[#dc2626]' : 'text-[#808080]'}>
          {Math.abs(change)}%
        </span>
        {changeLabel && <span className="text-[#a6a6a6] dark:text-slate-400 font-normal">{changeLabel}</span>}
      </div>

      {subtext && <span className="text-[12px] text-[#a6a6a6] dark:text-slate-400">{subtext}</span>}

      {operationalDetails.length > 0 && (
        <div className="space-y-1 text-[12px] text-[#4d4d4d] dark:text-slate-300">
          {operationalDetails.map((detail) => (
            <div key={detail.label} className="flex items-center justify-between gap-3">
              <span className="text-[#808080] dark:text-slate-400">{detail.label}</span>
              <span className="text-right font-semibold text-carbon dark:text-slate-200">{detail.value}</span>
            </div>
          ))}
        </div>
      )}

      {spark.length > 0 && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1b59f8" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#1b59f8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="i" hide />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <CartesianGrid horizontal={false} vertical={false} />
              <Tooltip
                cursor={false}
                contentStyle={{ display: 'none' }}
                wrapperStyle={{ display: 'none' }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#1b59f8"
                strokeWidth={2}
                fill={`url(#spark-${label})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default KPICard;