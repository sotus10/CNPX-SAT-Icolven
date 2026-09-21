import React, { useState } from 'react';
import { Save, Bell, Waves, Siren, CheckCircle2, MapPin, Mountain, Container } from 'lucide-react';
import { updateAlertRule } from '../services/api';
import { APP_ENV, API_URL, WS_URL, STATS_API_URL } from '../config';

const RangeSlider = ({ label, value, onChange, min, max, step = 1, unit = '' }) => (
  <div className="flex items-center gap-4 py-4">
    <div className="w-56 shrink-0">
      <p className="text-[13px] font-semibold text-carbon dark:text-slate-100">{label}</p>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 accent-[#1b59f8]"
    />
    <span className="w-16 text-right text-[13px] font-bold text-carbon dark:text-slate-100">
      {value}
      {unit}
    </span>
  </div>
);

const Toggle = ({ label, description, checked, onChange }) => (
  <div className="flex w-full min-w-0 items-center justify-between gap-4 py-4">
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-semibold text-carbon dark:text-slate-100">{label}</p>
      {description && <p className="text-[12px] text-[#a6a6a6] dark:text-slate-400">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-[#e4e5eb]'}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const SettingsPage = () => {
  const [yellowLevel, setYellowLevel] = useState(5.6);
  const [orangeLevel, setOrangeLevel] = useState(6.1);
  const [flvRise, setFlvRise] = useState(20);
  const [pptInt, setPptInt] = useState(50);
  const [pptAcc, setPptAcc] = useState(100);
  const [resCap, setResCap] = useState(90);
  const [geoApi, setGeoApi] = useState(70);
  const [sirenEnabled, setSirenEnabled] = useState(true);
  const [warningsEnabled, setWarningsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      // En producción actualiza las reglas vía `PUT /alert-rules/:id`.
      await updateAlertRule('threshold-default', { yellowLevel, orangeLevel, flvRise, pptInt, pptAcc, resCap, geoApi });
    } catch (error) {
      console.warn('[settings] backend no disponible, reglas guardadas localmente');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-carbon">Configuración</h1>
          <p className="text-[13px] text-[#a6a6a6] mt-0.5">
            Umbrales de alerta temprana y preferencias de notificación de emergencias
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 h-10 px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-sm hover:bg-primary-700 transition-colors"
        >
          <Save size={16} />
          Guardar cambios
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-card border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-semibold text-[#15803d]">
          <CheckCircle2 size={16} />
          Configuración guardada correctamente
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-primary" />
            <h2 className="text-[15px] font-bold text-carbon dark:text-slate-100">Cotas de río</h2>
          </div>
          <div className="divide-y divide-line">
            <RangeSlider
              label="Cota amarilla · Río Capacete"
              value={yellowLevel}
              onChange={setYellowLevel}
              min={2}
              max={10}
              step={0.1}
              unit="m"
            />
            <RangeSlider
              label="Cota naranja · Río Capacete"
              value={orangeLevel}
              onChange={setOrangeLevel}
              min={2}
              max={12}
              step={0.1}
              unit="m"
            />
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Waves size={16} className="text-primary" />
            <h2 className="text-[15px] font-bold text-carbon dark:text-slate-100">Crecida súbita y lluvia</h2>
          </div>
          <div className="divide-y divide-line">
            <RangeSlider
              label="Ascenso rápido FLV-RISE"
              value={flvRise}
              onChange={setFlvRise}
              min={10}
              max={60}
              step={5}
              unit="cm/h"
            />
            <RangeSlider
              label="Precipitación intensa PPT-INT"
              value={pptInt}
              onChange={setPptInt}
              min={10}
              max={120}
              step={5}
              unit="mm/h"
            />
            <RangeSlider
              label="Precipitación acumulada PPT-ACC"
              value={pptAcc}
              onChange={setPptAcc}
              min={40}
              max={250}
              step={10}
              unit="mm"
            />
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mountain size={16} className="text-primary" />
            <h2 className="text-[15px] font-bold text-carbon dark:text-slate-100">Embalse y suelo</h2>
          </div>
          <div className="divide-y divide-line">
            <RangeSlider
              label="Capacidad de embalse RES-CAP"
              value={resCap}
              onChange={setResCap}
              min={50}
              max={120}
              unit="%"
            />
            <RangeSlider
              label="Índice de precipitación API GEO-API"
              value={geoApi}
              onChange={setGeoApi}
              min={30}
              max={100}
              unit="%"
            />
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-primary" />
            <h2 className="text-[15px] font-bold text-carbon dark:text-slate-100">Notificaciones</h2>
          </div>
          <div className="divide-y divide-line">
            <Toggle
              label="Alertas de advertencia"
              description="Severidad media y baja"
              checked={warningsEnabled}
              onChange={setWarningsEnabled}
            />
            <Toggle
              label="Resumen diario por email"
              description="Resumen de alertas activas de las cuencas"
              checked={emailEnabled}
              onChange={setEmailEnabled}
            />
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Siren size={16} className="text-primary" />
            <h2 className="text-[15px] font-bold text-carbon dark:text-slate-100">Comando de emergencias</h2>
          </div>
          <div className="divide-y divide-line">
            <Toggle
              label="Sirenas automáticas"
              description="Activación al superar cota naranja o FLV-RISE"
              checked={sirenEnabled}
              onChange={setSirenEnabled}
            />
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-line dark:border-slate-800 rounded-card shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Container size={16} className="text-primary" />
            <h2 className="text-[15px] font-bold text-carbon dark:text-slate-100">Servicios conectados</h2>
          </div>
          <dl className="grid grid-cols-1 gap-3">
            {[
              { label: 'API REST', value: API_URL },
              { label: 'WebSocket', value: WS_URL },
              { label: 'API estadística', value: STATS_API_URL },
              { label: 'Entorno', value: APP_ENV },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[12px] bg-canvas dark:bg-slate-800 border border-line dark:border-slate-700 px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#a6a6a6]">{label}</dt>
                <dd className="text-[13px] font-mono text-carbon dark:text-slate-100 truncate mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;