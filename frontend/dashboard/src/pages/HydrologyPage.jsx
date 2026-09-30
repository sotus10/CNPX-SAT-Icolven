import React, { useMemo, useState } from 'react';
import { CloudRain, Filter, Gauge, Waves } from 'lucide-react';
import KPICard from '../components/dashboard/KPICard';
import ActivityChart from '../components/dashboard/ActivityChart';
import AlertPanel from '../components/dashboard/AlertPanel';
import Select from '../components/ui/Select';
import useSatData from '../hooks/useSatData';

const PERIOD_OPTIONS = [
  { key: 24, label: 'Últimas 24 horas' },
  { key: 48, label: 'Últimas 48 horas' },
];

const hourLabel = (value) => value?.slice(11, 16) ?? '';

const HydrologyPage = () => {
  const [period, setPeriod] = useState(24);
  const { satellite, readings, errors, loading, lastUpdated } = useSatData();
  const latestReading = readings[0];

  const displayedKpis = useMemo(() => [
    {
      id: 'rain-now', label: 'Precipitación actual',
      value: satellite?.current?.precipitation_mm ?? '—', unit: 'mm',
      icon: CloudRain, subtext: satellite ? 'Open-Meteo · hora actual' : 'Esperando respuesta de Open-Meteo',
    },
    {
      id: 'rain-24h', label: 'Precipitación acumulada · 24 h',
      value: satellite?.accumulated_24h_mm ?? '—', unit: 'mm',
      icon: CloudRain, subtext: 'Acumulado horario de Open-Meteo',
    },
    {
      id: 'sensor-distance', label: 'Distancia sensor–agua',
      value: latestReading?.distancia_cm ?? '—', unit: 'cm',
      icon: Waves, subtext: latestReading ? `Lectura ${latestReading.timestamp}` : 'Sin lecturas guardadas en SAT',
    },
    {
      id: 'sensor-speed', label: 'Velocidad registrada',
      value: latestReading?.velocidad_cm_min ?? '—', unit: 'cm/min',
      icon: Gauge, subtext: latestReading ? 'Dato del sensor LoRa' : 'Sin lecturas guardadas en SAT',
    },
  ], [satellite, latestReading]);

  const rainfallSeries = useMemo(
    () => (satellite?.hourly ?? [])
      .filter((point) => !point.is_forecast)
      .slice(-period)
      .map((point) => ({ label: hourLabel(point.time), value: point.precipitation_mm, active: true })),
    [satellite, period]
  );

  const sensorSeries = useMemo(
    () => readings.slice(0, period).reverse().map((reading) => ({
      label: hourLabel(reading.timestamp),
      value: Number(reading.distancia_cm),
      active: true,
    })),
    [readings, period]
  );
  const periodLabel = PERIOD_OPTIONS.find((option) => option.key === period)?.label ?? 'Últimas 24 horas';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Hidrología y Pluviometría</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Telemetría LoRa y precipitación de Open-Meteo para la ubicación del SAT
          </p>
        </div>
        <span className="text-[12px] text-[#808080]">
          {loading ? 'Actualizando datos…' : lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString('es-CO')}` : 'Sin conexión'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#808080]">
          <Filter size={13} />
          Mostrar
        </span>
        <span className="text-[13px] font-semibold text-carbon">Nodo SAT · ubicación configurada</span>
        <Select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
          {PERIOD_OPTIONS.map((opt) => (
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

      {(errors.satellite || errors.readings) && (
        <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {errors.satellite && `Open-Meteo: ${errors.satellite}. `}
          {errors.readings && `Lecturas SAT: ${errors.readings}`}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ActivityChart
          data={rainfallSeries}
          title="Precipitación horaria · Open-Meteo (mm)"
          range={periodLabel}
        />
        <ActivityChart
          data={sensorSeries}
          title="Distancia sensor–agua · LoRa (cm)"
          range={periodLabel}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <AlertPanel />
        <div className="rounded-card border border-line bg-white p-5 text-[13px] text-[#808080] shadow-card dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          La precipitación proviene de Open-Meteo. Distancia y velocidad son lecturas directas
          almacenadas por el sensor SAT; no se infiere nivel de río ni caudal a partir de la distancia.
        </div>
      </div>
    </div>
  );
};

export default HydrologyPage;