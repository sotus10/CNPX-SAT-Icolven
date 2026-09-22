import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, Filter, Waves, Gauge, CloudRain, Zap, Database, TrendingUp } from 'lucide-react';
import KPICard from '../components/dashboard/KPICard';
import ActivityChart from '../components/dashboard/ActivityChart';
import AlertPanel from '../components/dashboard/AlertPanel';
import Select from '../components/ui/Select';
import { bootstrapDashboard } from '../services/bootstrap';
import { STATIONS, getHydrologyKpis, getStationSeries } from '../data/mock';

const KPI_ICONS = {
  river_level: Waves,
  rise_rate: TrendingUp,
  discharge: Gauge,
  rainfall_24h: CloudRain,
  rain_intensity: Zap,
  reservoir: Database,
};

const PERIOD_OPTIONS = [
  { key: '24h', label: 'Últimas 24 horas' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
];

const PERIOD_CHANGE_LABEL = {
  '24h': 'vs últimas 24 h',
  '7d': 'vs semana anterior',
  '30d': 'vs últimos 30 días',
};

const HydrologyPage = () => {
  const dispatch = useDispatch();
  const kpis = useSelector((state) => state.dashboard.kpis);

  const [station, setStation] = useState('paso-castro');
  const [period, setPeriod] = useState('24h');

  React.useEffect(() => {
    bootstrapDashboard(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stationRef = STATIONS.find((s) => s.id === station) ?? STATIONS[0];

  const displayedKpis = useMemo(
    () =>
      getHydrologyKpis(station).map((k) => ({
        ...k,
        icon: KPI_ICONS[k.id],
        changeLabel: PERIOD_CHANGE_LABEL[period],
      })),
    [station, period]
  );

  const chartData = useMemo(() => getStationSeries(station, period), [station, period]);
  const periodLabel = PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? 'Últimas 24 horas';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Hidrología y Pluviometría</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Estaciones limnimétricas, caudal y precipitación en tiempo real
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
        <Select value={station} onChange={(e) => setStation(e.target.value)}>
          {STATIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <span className="text-[12px] text-[#a6a6a6]">·</span>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)] gap-5">
        <ActivityChart
          data={chartData}
          title={`Evolución del nivel (m) · ${stationRef.name}`}
          range={periodLabel}
          className="col-span-1"
        />
        <AlertPanel basin={stationRef.basin} />
      </div>
    </div>
  );
};

export default HydrologyPage;