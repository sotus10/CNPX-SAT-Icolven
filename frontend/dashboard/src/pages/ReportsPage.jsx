import React, { useMemo, useState } from 'react';
import { Download, Filter, CloudRain, Gauge, Waves, Bell } from 'lucide-react';
import KPICard from '../components/dashboard/KPICard';
import ActivityChart from '../components/dashboard/ActivityChart';
import Select from '../components/ui/Select';
import useSatData from '../hooks/useSatData';
import { PERIOD_OPTIONS, hourLabel, periodLabel } from '../utils/series';
import { jsPDF } from 'jspdf';

const exportCSV = (rows) => {
  if (!rows.length) return;
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
  doc.text('Reporte de datos SAT', 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString('es-AR'), 14, 27);
  doc.setTextColor(21, 30, 35);
  doc.setFontSize(12);
  rows.slice(0, 40).forEach((row, index) => {
    const content = Object.entries(row).map(([key, value]) => `${key}: ${value ?? '—'}`).join(' · ');
    doc.text(content, 14, 36 + index * 6, { maxWidth: 180 });
  });
  doc.save('reporte-cuencas.pdf');
};

const ReportsPage = () => {
  const [period, setPeriod] = useState(24);
  const { satellite, readings, alerts, errors, loading, lastUpdated } = useSatData();
  const latestReading = readings[0];

  const displayedKpis = useMemo(() => [
    { id: 'rainfall', label: 'Precipitación acumulada · 24 h', value: satellite?.accumulated_24h_mm ?? '—', unit: 'mm', icon: CloudRain, subtext: 'Open-Meteo' },
    { id: 'reading-count', label: 'Lecturas SAT recibidas', value: readings.length, unit: '', icon: Waves, subtext: 'Registros disponibles en el historial' },
    { id: 'distance', label: 'Última distancia sensor–agua', value: latestReading?.distancia_cm ?? '—', unit: 'cm', icon: Gauge, subtext: latestReading?.timestamp ?? 'Sin lectura disponible' },
    { id: 'alert-count', label: 'Alertas SAT registradas', value: alerts.length, unit: '', icon: Bell, subtext: `${alerts.filter((alert) => alert.confirmada_por_satelite).length} confirmadas por satélite` },
  ], [satellite, readings, latestReading, alerts]);

  const trend = useMemo(
    () => (satellite?.hourly ?? []).filter((point) => !point.is_forecast).slice(-period).map((point) => ({
      label: hourLabel(point.time), value: point.precipitation_mm, active: true,
    })),
    [satellite, period]
  );

  const handleExport = async (format) => {
    const cutoff = Date.now() - period * 60 * 60 * 1000;
    const rows = [
      ...readings.slice(0, period).map((reading) => ({ tipo: 'sensor', fecha: reading.timestamp, distancia_cm: reading.distancia_cm, velocidad_cm_min: reading.velocidad_cm_min ?? '', precipitacion_mm: '', nivel: '', confirmada_por_satelite: '' })),
      ...trend.map((point) => ({ tipo: 'precipitacion_open_meteo', fecha: point.label, distancia_cm: '', velocidad_cm_min: '', precipitacion_mm: point.value, nivel: '', confirmada_por_satelite: '' })),
      ...alerts.filter((alert) => alert.timestamp >= cutoff).map((alert) => ({ tipo: 'alerta', fecha: new Date(alert.timestamp).toISOString(), distancia_cm: '', velocidad_cm_min: '', precipitacion_mm: '', nivel: alert.nivel_final, confirmada_por_satelite: alert.confirmada_por_satelite })),
    ];
    if (format === 'csv') exportCSV(rows);
    if (format === 'pdf') exportPDF(rows);
  };

  const etiquetaPeriodo = periodLabel(period);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Reportes</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Exportación de datos recibidos por SAT y precipitación de Open-Meteo
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

      <p className="text-[12px] text-[#808080]">
        {loading ? 'Actualizando datos…' : lastUpdated ? `Fuente API SAT · actualizado ${lastUpdated.toLocaleTimeString('es-CO')}` : 'Sin conexión con la API SAT'}
      </p>

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

      <ActivityChart data={trend} title="Precipitación horaria Open-Meteo (mm)" range={etiquetaPeriodo} />
      <ActivityChart
        data={readings.slice(0, period).reverse().map((reading) => ({ label: hourLabel(reading.timestamp), value: Number(reading.distancia_cm), active: true }))}
        title="Distancia sensor–agua LoRa (cm)"
        range={etiquetaPeriodo}
      />
    </div>
  );
};

export default ReportsPage;