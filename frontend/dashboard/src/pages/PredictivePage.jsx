import React, { useMemo, useState } from 'react';
import { CloudRain, Filter, Gauge, Waves } from 'lucide-react';
import KPICard from '../components/dashboard/KPICard';
import ForecastChart from '../components/dashboard/ForecastChart';
import AlertPanel from '../components/dashboard/AlertPanel';
import Select from '../components/ui/Select';
import useSatData from '../hooks/useSatData';

const HORIZON_OPTIONS = [
  { key: 12, label: 'Horizonte 12 horas' },
  { key: 24, label: 'Horizonte 24 horas' },
  { key: 48, label: 'Horizonte 48 horas' },
];

const PredictivePage = () => {
  const [horizon, setHorizon] = useState(12);
  const { satellite, readings, errors, loading, lastUpdated } = useSatData();
  const forecast = satellite?.hourly?.filter((point) => point.is_forecast).slice(0, horizon) ?? [];
  const observed = satellite?.hourly?.filter((point) => !point.is_forecast).slice(-12) ?? [];
  const forecastTotal = forecast.reduce((sum, point) => sum + Number(point.precipitation_mm ?? 0), 0);
  const peakForecast = forecast.reduce((peak, point) => Math.max(peak, Number(point.precipitation_mm ?? 0)), 0);
  const latestReading = readings[0];

  const displayedKpis = useMemo(() => [
    { id: 'rain-current', label: 'Precipitación actual', value: satellite?.current?.precipitation_mm ?? '—', unit: 'mm', icon: CloudRain, subtext: 'Open-Meteo · hora actual' },
    { id: 'rain-forecast', label: `Lluvia pronosticada · ${horizon} h`, value: forecast.length ? Number(forecastTotal.toFixed(2)) : '—', unit: 'mm', icon: CloudRain, subtext: 'Suma de precipitación horaria' },
    { id: 'rain-peak', label: 'Máxima horaria del pronóstico', value: forecast.length ? peakForecast : '—', unit: 'mm', icon: Gauge, subtext: 'Mayor valor horario en el horizonte' },
    { id: 'sensor-distance', label: 'Última distancia sensor–agua', value: latestReading?.distancia_cm ?? '—', unit: 'cm', icon: Waves, subtext: 'Dato LoRa guardado en SAT' },
  ], [satellite, horizon, forecastTotal, forecast, peakForecast, latestReading]);

  const chartData = [
    ...observed.map((point) => ({ label: point.time.slice(5, 16).replace('T', ' '), observado: point.precipitation_mm, pronostico: null })),
    ...forecast.map((point) => ({ label: point.time.slice(5, 16).replace('T', ' '), observado: null, pronostico: point.precipitation_mm })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Predictivo y Geotecnia</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Pronóstico de precipitación de Open-Meteo y última lectura del sensor SAT
          </p>
        </div>
        <span className="text-[12px] text-[#808080]">
          {loading ? 'Actualizando…' : lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString('es-CO')}` : 'Sin conexión'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#808080]">
          <Filter size={13} />
          Mostrar
        </span>
        <span className="text-[13px] font-semibold text-carbon">Ubicación SAT configurada</span>
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
          title="Pronóstico horario de precipitación · Open-Meteo (mm)"
          horizon={horizon}
          observedName="Histórico (mm)"
          forecastName="Pronóstico (mm)"
          className="col-span-3 xl:col-span-2"
        />
        <div className="col-span-3 xl:col-span-1 bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5 flex flex-col justify-center gap-2">
          <p className="text-[14px] font-semibold text-carbon dark:text-slate-100">Alcance de la fuente</p>
          <p className="text-[13px] text-[#a6a6a6] dark:text-slate-400">
            Open-Meteo entrega precipitación horaria; no proporciona pronóstico de nivel del río,
            caudal ni saturación geotécnica. Esas variables se muestran solo cuando estén disponibles
            en lecturas o servicios SAT.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <AlertPanel />
        <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
          <h3 className="text-[15px] font-bold text-carbon dark:text-slate-100 mb-3">Datos del sensor SAT</h3>
          <p className="text-[13px] text-[#808080] dark:text-slate-400">
            {errors.satellite ? `Open-Meteo: ${errors.satellite}. ` : ''}
            {errors.readings ? `Lecturas SAT: ${errors.readings}. ` : ''}
            {latestReading ? `Última lectura: ${latestReading.distancia_cm} cm, velocidad ${latestReading.velocidad_cm_min ?? '—'} cm/min.` : 'No hay lecturas de sensor guardadas.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PredictivePage;