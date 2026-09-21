import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Download,
  Filter,
  MapPin,
  Radio,
  Users,
  Waves,
  Droplets,
  Siren,
} from 'lucide-react';
import KPICard from '../components/dashboard/KPICard';
import ActivityChart from '../components/dashboard/ActivityChart';
import AlertPanel from '../components/dashboard/AlertPanel';
import Leaderboard from '../components/dashboard/Leaderboard';
import Select from '../components/ui/Select';
import { bootstrapDashboard } from '../services/bootstrap';
import {
  BASINS,
  mockBasinKPIs,
  mockLeaderboardGroups,
  mockLeaderboardUsers,
  getBasinKpis,
  getLevelTrend,
  filterLeaderboard,
  OPERATIONAL_PERIOD_OPTIONS,
  OPERATIONAL_PERIOD_CHANGE_LABEL,
} from '../data/mock';

const KPI_ICONS = {
  cuencas_alert: Siren,
  stations_critical: MapPin,
  population_at_risk: Users,
  network_online: Radio,
  mean_streamflow: Waves,
  api_saturation: Droplets,
};

const BasinsPage = () => {
  const dispatch = useDispatch();
  const kpis = useSelector((state) => state.dashboard.kpis);

  const [period, setPeriod] = useState('year');
  const [basin, setBasin] = useState('all');

  React.useEffect(() => {
    bootstrapDashboard(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayedKpis = useMemo(() => {
    const base = basin === 'all' && kpis.length > 0 ? kpis : getBasinKpis(basin);
    return base.map((k) => ({
      ...k,
      icon: KPI_ICONS[k.id] ?? k.icon,
      changeLabel: OPERATIONAL_PERIOD_CHANGE_LABEL[period],
    }));
  }, [kpis, basin, period]);

  const trend = useMemo(() => getLevelTrend(basin, period), [basin, period]);
  const leaderGroups = useMemo(() => filterLeaderboard(mockLeaderboardGroups, basin), [basin]);
  const leaderStations = useMemo(() => filterLeaderboard(mockLeaderboardUsers, basin), [basin]);

  const periodLabel = OPERATIONAL_PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? 'Últimas 24 horas';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Estado General de Cuencas</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Matriz de riesgo hidrológico y alertas tempranas por cuenca
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
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {OPERATIONAL_PERIOD_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Select value={basin} onChange={(e) => setBasin(e.target.value)}>
          <option value="all">Todas las cuencas</option>
          {BASINS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
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
          data={trend}
          title={basin === 'all' ? 'Tendencias de nivel (m) · todas las cuencas' : `Tendencias de nivel (m) · ${BASINS.find((b) => b.id === basin)?.name}`}
          range={periodLabel}
          className="col-span-1"
        />
        <AlertPanel basin={basin === 'all' ? null : basin} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Leaderboard
          title={basin === 'all' ? 'Cuencas con mayor riesgo' : 'Riesgo · cuenca seleccionada'}
          rows={leaderGroups}
        />
        <Leaderboard
          title={basin === 'all' ? 'Estaciones en estado crítico' : 'Estaciones críticas · cuenca seleccionada'}
          rows={leaderStations}
        />
      </div>
    </div>
  );
};

export default BasinsPage;