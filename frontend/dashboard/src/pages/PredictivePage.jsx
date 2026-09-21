import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Download, Filter, TrendingUp, Clock, Target, Percent, Mountain, Waves, BrainCircuit } from 'lucide-react';
import KPICard from '../components/dashboard/KPICard';
import ForecastChart from '../components/dashboard/ForecastChart';
import AlertPanel from '../components/dashboard/AlertPanel';
import Select from '../components/ui/Select';
import useForecast from '../hooks/useForecast';
import { bootstrapDashboard } from '../services/bootstrap';
import { BASINS, getPredictiveKpis, getForecastSeries } from '../data/mock';

const KPI_ICONS = {
  exceed_prob: Percent,
  forecast_level: Waves,
  peak_time: Clock,
  model_error: Target,
  runoff: TrendingUp,
  slope_risk: Mountain,
};

const HORIZON_OPTIONS = [
  { key: 12, label: 'Horizonte 12 horas' },
  { key: 24, label: 'Horizonte 24 horas' },
  { key: 48, label: 'Horizonte 48 horas' },
];

const PredictivePage = () => {
  const dispatch = useDispatch();
  const [basin, setBasin] = useState('reconquista');
  const [horizon, setHorizon] = useState(12);

  const series = useMemo(() => getForecastSeries(basin), [basin]);
  const { forecastPoints, currentValue } = useForecast(series, horizon, 0.3);

  React.useEffect(() => {
    bootstrapDashboard(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayedKpis = useMemo(
    () =>
      getPredictiveKpis(basin, horizon).map((k) => ({
        ...k,
        icon: KPI_ICONS[k.id],
      })),
    [basin, horizon]
  );

  const chartData = forecastPoints.map((p, i) => ({
    label: i + 1,
    observado: p.isForecast ? null : p.value,
    pronostico: p.isForecast ? p.value : null,
  }));

  const basinRef = BASINS.find((b) => b.id === basin) ?? BASINS.find((b) => b.id === 'reconquista');
  const slopeKpi = displayedKpis.find((k) => k.id === 'slope_risk');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Predictivo y Geotecnia</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Pronóstico hidrológico, probabilidad de superación y saturación de suelos
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 h-10 px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-sm hover:bg-primary-700 transition-colors"
        >
          <Download size={16} />
          Descargar reporte
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#808080]">
          <Filter size={13} />
          Mostrar
        </span>
        <Select value={basin} onChange={(e) => setBasin(e.target.value)}>
          {BASINS.filter((b) => b.id !== 'parana').map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <span className="text-[12px] text-[#a6a6a6]">·</span>
        <Select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
          {HORIZON_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
        {displayedKpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <ForecastChart
          data={chartData}
          title={`Pronóstico de nivel · ${basinRef.name}`}
          horizon={horizon}
          className="col-span-3 xl:col-span-2"
        />
        <div className="col-span-3 xl:col-span-1 bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5 flex flex-col justify-center items-center gap-2 text-center">
          <BrainCircuit size={28} className="text-primary" />
          <p className="text-[14px] font-semibold text-carbon dark:text-slate-100">Motor estadístico</p>
          <p className="text-[13px] text-[#a6a6a6] dark:text-slate-400">
            El pronóstico local usa suavizado exponencial (demo). En producción los
            modelos Muskingum + ARIMA/Prophet corre en el backend de estadística
            (REACT_APP_STATS_API).
          </p>
          <p className="text-[12px] font-semibold text-[#4d4d4d] dark:text-slate-300 mt-1">
            Suavizado actual: {currentValue != null ? `${currentValue.toFixed(2)} m` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <AlertPanel basin={basin} />
        <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
          <h3 className="text-[15px] font-bold text-carbon dark:text-slate-100 mb-3">Monitoreo de laderas</h3>
          <p className="text-[13px] text-[#808080] dark:text-slate-400">
            Con un índice API de {basinRef.api}% (GEO-API-70 superado en {basinRef.name}), se
            prioriza el monitoreo de las {slopeKpi?.value ?? basinRef.slopes} laderas con riesgo
            geotécnico en la cuenca.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PredictivePage;