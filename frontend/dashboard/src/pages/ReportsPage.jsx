import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, FileText, Filter, Siren, MapPin, Users, Radio, Waves, Droplets } from 'lucide-react';
import { generateReport } from '../services/api';
import KPICard from '../components/dashboard/KPICard';
import ActivityChart from '../components/dashboard/ActivityChart';
import Leaderboard from '../components/dashboard/Leaderboard';
import Select from '../components/ui/Select';
import { bootstrapDashboard } from '../services/bootstrap';
import {
  BASINS,
  mockLeaderboardGroups,
  mockLeaderboardUsers,
  getBasinKpis,
  getLevelTrend,
  filterLeaderboard,
  PERIOD_SELECT_OPTIONS,
  PERIOD_CHANGE_LABEL,
} from '../data/mock';
import { jsPDF } from 'jspdf';

const KPI_ICONS = {
  cuencas_alert: Siren,
  stations_critical: MapPin,
  population_at_risk: Users,
  network_online: Radio,
  mean_streamflow: Waves,
  api_saturation: Droplets,
};

const exportCSV = (rows) => {
  const header = Object.keys(rows[0]);
  const csv = [header.join(';'), ...rows.map((r) => header.map((h) => r[h]).join(';'))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte-cuencas.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const exportPDF = (rows) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Reporte de Cuencas', 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString('es-AR'), 14, 27);
  doc.setTextColor(21, 30, 35);
  doc.setFontSize(12);
  rows.forEach((r, i) => {
    doc.text(`${r.periodo ?? r.label} — ${r.metrica ?? r.value}`, 14, 36 + i * 6);
  });
  doc.save('reporte-cuencas.pdf');
};

const ReportsPage = () => {
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
      changeLabel: PERIOD_CHANGE_LABEL[period],
    }));
  }, [kpis, basin, period]);

  const trend = useMemo(() => getLevelTrend(basin, period), [basin, period]);
  const leaderGroups = useMemo(() => filterLeaderboard(mockLeaderboardGroups, basin), [basin]);
  const leaderStations = useMemo(() => filterLeaderboard(mockLeaderboardUsers, basin), [basin]);

  const handleExport = async (format) => {
    const rows = trend.map((a) => ({ periodo: a.label, metrica: 'nivel (m)', valor: a.value }));
    try {
      await generateReport({ format, start_date: null, end_date: null });
    } catch (error) {
      console.warn('[reports] backend no disponible, generando export local');
    }
    if (format === 'csv') exportCSV(rows);
    if (format === 'pdf') exportPDF(rows);
  };

  const periodLabel = PERIOD_SELECT_OPTIONS.find((o) => o.key === period)?.label ?? 'Este año';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Reportes</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Resumen ejecutivo con indicadores hidrológicos y actividad de alertas de cuencas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="h-10 px-4 rounded-[10px] border border-line dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] font-semibold text-carbon dark:text-slate-100 hover:border-primary/40 transition-colors"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 h-10 px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-sm hover:bg-primary-700 transition-colors"
          >
            <Download size={16} />
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#808080]">
          <Filter size={13} />
          Mostrar
        </span>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIOD_SELECT_OPTIONS.map((opt) => (
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ActivityChart
          data={trend}
          title="Evolución de niveles (semanal)"
          range={periodLabel}
        />
        <div className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5 flex flex-col justify-center items-center gap-2 text-center">
          <FileText size={28} className="text-primary" />
          <p className="text-[14px] font-semibold text-carbon dark:text-slate-100">Modelos estadísticos</p>
          <p className="text-[13px] text-[#a6a6a6] dark:text-slate-400">
            Muskingum, ARIMA/Prophet e índices API se ejecutan en el backend de
            estadística (REACT_APP_STATS_API). Esta vista muestra el desglose por
            cuenca cuando estén disponibles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Leaderboard title="Ríos monitoreados" rows={leaderGroups} />
        <Leaderboard title="Estaciones críticas" rows={leaderStations} />
      </div>
    </div>
  );
};

export default ReportsPage;