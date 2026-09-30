import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CloudRain, MapPin, RefreshCw, Satellite, Signal } from "lucide-react";
import { Eyebrow } from "@/components/ui/primitives";

type HourlyRain = {
  time: string;
  precipitation_mm: number;
  is_forecast: boolean;
};

export type SatelliteData = {
  source: string;
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    precipitation_mm: number;
  };
  accumulated_24h_mm: number;
  hourly: HourlyRain[];
};

const API_BASE = (import.meta.env.VITE_SAT_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const REFRESH_INTERVAL = 5 * 60 * 1000;

function formatTime(value: string) {
  return value.slice(11, 16);
}

function RainChart({ hours }: { hours: HourlyRain[] }) {
  const maxRain = Math.max(1, ...hours.map((hour) => hour.precipitation_mm));
  const chartWidth = 480;
  const chartHeight = 128;
  const gap = 5;
  const barWidth = (chartWidth - gap * (hours.length - 1)) / hours.length;

  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">Lluvia por hora · mm</p>
        <div className="flex items-center gap-4 font-mono text-[0.65rem] text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-aqua-deep" />registrado</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-aqua/40" />pronóstico</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`}
        className="h-36 w-full overflow-visible"
        role="img"
        aria-label="Precipitación horaria reciente y pronosticada para las próximas horas"
        preserveAspectRatio="none"
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = chartHeight * fraction;
          return <line key={fraction} x1="0" x2={chartWidth} y1={y} y2={y} stroke="currentColor" className="text-hairline" strokeDasharray="3 5" />;
        })}
        {hours.map((hour, index) => {
          const barHeight = Math.max(2, (hour.precipitation_mm / maxRain) * (chartHeight - 8));
          const x = index * (barWidth + gap);
          const y = chartHeight - barHeight;
          return (
            <g key={`${hour.time}-${index}`}>
              <title>{`${formatTime(hour.time)} · ${hour.precipitation_mm.toFixed(1)} mm${hour.is_forecast ? " · pronóstico" : " · registrado"}`}</title>
              <rect
                x={x}
                y={y}
                width={Math.max(2, barWidth)}
                height={barHeight}
                rx="3"
                fill={hour.is_forecast ? "var(--aqua)" : "var(--aqua-deep)"}
                opacity={hour.is_forecast ? 0.4 : 0.85}
              />
              {index % 4 === 0 && (
                <text x={x} y={chartHeight + 19} fill="currentColor" className="font-mono text-[9px] text-ink-muted">
                  {formatTime(hour.time)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DatosSatelitales({ initialData = null }: { initialData?: SatelliteData | null }) {
  const [data, setData] = useState<SatelliteData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialData === null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`${API_BASE}/satelital`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error(`La API respondió con el estado ${response.status}.`);
      const result = (await response.json()) as SatelliteData;
      setData(result);
      setUpdatedAt(new Date());
      setError(null);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "No fue posible consultar los datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    const interval = window.setInterval(() => void loadData(), REFRESH_INTERVAL);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadData]);

  const chartHours = useMemo(() => {
    if (!data) return [];
    const observed = data.hourly.filter((hour) => !hour.is_forecast).slice(-12);
    const forecast = data.hourly.filter((hour) => hour.is_forecast).slice(0, 12);
    return [...observed, ...forecast];
  }, [data]);

  const nextSixHours = useMemo(
    () => data?.hourly.filter((hour) => hour.is_forecast).slice(0, 6).reduce((sum, hour) => sum + hour.precipitation_mm, 0) ?? 0,
    [data],
  );

  return (
    <section id="datos-satelitales" className="relative scroll-mt-16 overflow-hidden bg-bone-2 py-20 lg:py-32">
      <div className="pointer-events-none absolute inset-0 grid-overlay" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1200px] px-6">
      <div className="max-w-[680px]">
        <Eyebrow>Conexión satelital · datos en vivo</Eyebrow>
        <h2 className="text-section">El cielo también cuenta lo que pasa en el río.</h2>
        <p className="mt-6 text-ink-muted">
          Una vista previa de la precipitación consultada por el backend y usada para poner cada lectura del río en contexto.
        </p>
      </div>

      <div className="relative mt-12">
        <div className="glass rounded-2xl p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-hairline pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-aqua-soft text-aqua-deep">
                <Satellite size={21} strokeWidth={1.7} />
              </span>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">Fuente meteorológica</p>
                <p className="mt-1 text-lg text-ink">{data?.source ?? "Open-Meteo"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper/60 px-3 py-1.5 font-mono text-xs text-ink-muted">
                <span className={`h-2 w-2 rounded-full ${error ? "bg-ember" : data ? "bg-moss" : "animate-pulse bg-sun"}`} />
                {error ? "sin conexión" : data ? "API conectada" : "conectando"}
              </span>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper/60 px-3 py-1.5 font-mono text-xs text-ink-muted transition hover:border-aqua/50 hover:text-aqua-deep disabled:opacity-50"
                aria-label="Actualizar datos de precipitación"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>
          </div>

          {error && !data ? (
            <div className="py-12 text-center">
              <Signal className="mx-auto text-ember" size={24} />
              <p className="mt-4 text-ink">No se pudo conectar con la API satelital.</p>
              <p className="mt-1 text-sm text-ink-muted">{error} Comprueba que el backend esté activo.</p>
              <button type="button" onClick={() => void loadData()} className="mt-5 rounded-full bg-ink px-5 py-2 text-sm text-bone hover:bg-aqua-deep">
                Reintentar conexión
              </button>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-hairline bg-paper/65 p-4">
                  <p className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-wider text-ink-muted"><CloudRain size={14} className="text-aqua-deep" />Lluvia actual</p>
                  <p className="mt-3 font-display text-4xl text-ink">{data ? data.current.precipitation_mm.toFixed(1) : "—"}<span className="ml-1 font-sans text-base text-ink-muted">mm/h</span></p>
                </div>
                <div className="rounded-xl border border-hairline bg-paper/65 p-4">
                  <p className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-wider text-ink-muted"><Activity size={14} className="text-aqua-deep" />Acumulado · 24 h</p>
                  <p className="mt-3 font-display text-4xl text-ink">{data ? data.accumulated_24h_mm.toFixed(1) : "—"}<span className="ml-1 font-sans text-base text-ink-muted">mm</span></p>
                </div>
                <div className="rounded-xl border border-hairline bg-paper/65 p-4">
                  <p className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-wider text-ink-muted"><CloudRain size={14} className="text-aqua-deep" />Pronóstico · 6 h</p>
                  <p className="mt-3 font-display text-4xl text-ink">{data ? nextSixHours.toFixed(1) : "—"}<span className="ml-1 font-sans text-base text-ink-muted">mm</span></p>
                </div>
              </div>

              {data && chartHours.length > 0 ? <RainChart hours={chartHours} /> : <div className="mt-7 h-36 animate-pulse rounded-xl bg-aqua-soft" />}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-4 font-mono text-[0.68rem] text-ink-muted">
                <span className="inline-flex items-center gap-1.5"><MapPin size={13} />{data ? `${data.latitude.toFixed(3)}, ${data.longitude.toFixed(3)} · ${data.timezone}` : "Río Medellín · Colombia"}</span>
                <span>{updatedAt ? `Consulta API · ${updatedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}` : data ? `Dato · ${formatTime(data.current.time)} · hora Colombia` : loading ? "Consultando API…" : "Esperando conexión"}</span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-muted">
                Precipitación de Open-Meteo vía la API del sistema. Es una estimación meteorológica para contexto, no una medición directa del sensor del río.
              </p>
              {error && <p className="mt-2 text-xs text-ember">No se pudo actualizar; se muestran los últimos datos recibidos.</p>}
            </>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}