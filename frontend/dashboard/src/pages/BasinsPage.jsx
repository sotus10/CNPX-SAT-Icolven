import React, { useMemo, useState } from 'react';
import { Bell, CloudRain, Filter, Gauge, Waves } from 'lucide-react';
import KPICard from '../components/dashboard/KPICard';
import ActivityChart from '../components/dashboard/ActivityChart';
import AlertPanel from '../components/dashboard/AlertPanel';
import NodeConnectivityPanel from '../components/dashboard/charts/NodeConnectivityPanel';
import Select from '../components/ui/Select';
import useSatData from '../hooks/useSatData';
import { useNodes } from '../hooks/useSatAnalytics';
import { PERIOD_OPTIONS, buildNodeConnectivity, hourLabel, periodLabel } from '../utils/series';

const BasinsPage = () => {
  const [period, setPeriod] = useState(24);
  const { satellite, readings, alerts, errors, loading, lastUpdated } = useSatData();
  const nodesQuery = useNodes();
  const latestReading = readings[0];

  const nodos = useMemo(() => buildNodeConnectivity(nodesQuery.data), [nodesQuery.data]);
  const nodesError = nodesQuery.isError
    ? nodesQuery.error?.message ?? 'No fue posible consultar los nodos.'
    : null;

  const displayedKpis = useMemo(() => [
    { id: 'rain-24h', label: 'Precipitación acumulada · 24 h', value: satellite?.accumulated_24h_mm ?? '—', unit: 'mm', icon: CloudRain, subtext: 'Open-Meteo' },
    { id: 'sensor-distance', label: 'Distancia sensor–agua', value: latestReading?.distancia_cm ?? '—', unit: 'cm', icon: Waves, subtext: latestReading ? `Última lectura ${latestReading.timestamp}` : 'Sin telemetría recibida' },
    { id: 'sensor-speed', label: 'Velocidad registrada', value: latestReading?.velocidad_cm_min ?? '—', unit: 'cm/min', icon: Gauge, subtext: 'Sensor LoRa SAT' },
    { id: 'alerts', label: 'Alertas registradas', value: alerts.length, unit: '', icon: Bell, subtext: `${alerts.filter((alert) => alert.confirmada_por_satelite).length} confirmadas por satélite` },
  ], [satellite, latestReading, alerts]);

  const rainSeries = useMemo(
    () => (satellite?.hourly ?? []).filter((point) => !point.is_forecast).slice(-period).map((point) => ({
      label: hourLabel(point.time), value: point.precipitation_mm, active: true,
    })),
    [satellite, period]
  );
  const sensorSeries = useMemo(
    () => readings.slice(0, period).reverse().map((reading) => ({
      label: hourLabel(reading.timestamp), value: Number(reading.distancia_cm), active: true,
    })),
    [readings, period]
  );
  const etiquetaPeriodo = periodLabel(period);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Estado General de Cuencas</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Datos de precipitación Open-Meteo, telemetría LoRa y alertas guardadas en SAT
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
        <Select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </Select>
        <span className="text-[13px] font-semibold text-carbon">Ubicación SAT configurada</span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
        {displayedKpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {(errors.satellite || errors.readings || errors.alerts) && (
        <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {errors.satellite && `Open-Meteo: ${errors.satellite}. `}
          {errors.readings && `Lecturas: ${errors.readings}. `}
          {errors.alerts && `Alertas: ${errors.alerts}`}
        </p>
      )}

      <NodeConnectivityPanel
        nodos={nodos}
        badge={`${nodos.length} nodos registrados`}
        error={nodesError}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ActivityChart
          data={rainSeries}
          title="Precipitación horaria Open-Meteo (mm)"
          range={etiquetaPeriodo}
        />
        <ActivityChart data={sensorSeries} title="Distancia sensor–agua LoRa (cm)" range={etiquetaPeriodo} />
      </div>

      <AlertPanel />
    </div>
  );
};

export default BasinsPage;