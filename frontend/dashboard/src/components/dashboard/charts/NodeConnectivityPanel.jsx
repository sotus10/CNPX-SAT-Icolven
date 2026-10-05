import React, { useMemo } from 'react';
import { RadioTower, Signal, SignalZero } from 'lucide-react';
import ChartCard from './ChartCard';

const ESTADOS = {
  online: { label: 'En línea', tone: '#16a34a', Icon: Signal },
  retraso: { label: 'Con retraso', tone: '#f59e0b', Icon: Signal },
  offline: { label: 'Sin señal', tone: '#dc2626', Icon: SignalZero },
};

const SIN_LECTURA = 'Sin lectura';

const minutosAEtiq = (minutos) => {
  if (minutos === null || minutos === undefined) return SIN_LECTURA;
  if (minutos < 1) return 'Hace menos de 1 min';
  if (minutos < 60) return `Hace ${Math.round(minutos)} min`;
  const horas = minutos / 60;
  if (horas < 24) return `Hace ${Math.round(horas)} h`;
  return `Hace ${Math.round(horas / 24)} d`;
};

const fechaLarga = (iso) => {
  if (!iso) return SIN_LECTURA;
  const momento = Date.parse(iso);
  return Number.isNaN(momento)
    ? iso
    : new Date(momento).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * Gráfica 7 — monitoreo de red y estado de los nodos.
 *
 * El estado lo calcula el backend a partir del silencio de cada transmisor:
 * en línea hasta 10 min, con retraso hasta 20 min y sin señal después.
 */
const NodeConnectivityPanel = ({ nodos = [], error, badge }) => {
  const conteo = useMemo(() => {
    const acumulado = {};
    nodos.forEach((nodo) => {
      acumulado[nodo.conectividad] = (acumulado[nodo.conectividad] ?? 0) + 1;
    });
    return acumulado;
  }, [nodos]);

  return (
    <ChartCard
      title="Monitoreo de red y estado de nodos"
      note="Disponibilidad del enlace LoRa/WiFi según los minutos transcurridos desde la última lectura: en línea hasta 10 min, con retraso hasta 20 min, sin señal después."
      badge={badge}
      error={error}
      isEmpty={!error && nodos.length === 0}
      emptyMessage="No hay nodos registrados en la tabla nodos."
      height={nodos.length ? undefined : 140}
      footer={
        nodos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(ESTADOS).map(([clave, { label, tone }]) => (
              <span
                key={clave}
                className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[12px] font-semibold"
                style={{ backgroundColor: `${tone}14`, color: tone }}
              >
                {label}
                <span className="font-mono">{conteo[clave] ?? 0}</span>
              </span>
            ))}
          </div>
        )
      }
    >
      <ul className="h-full space-y-2 overflow-y-auto pr-1">
        {nodos.map((nodo) => {
          const config = ESTADOS[nodo.conectividad] ?? { label: 'Desconocido', tone: '#64748b', Icon: RadioTower };
          const { Icon } = config;
          return (
            <li
              key={nodo.id ?? nodo.nombre}
              className="rounded-[10px] border border-line dark:border-slate-800 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                    style={{ backgroundColor: `${config.tone}14`, color: config.tone }}
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-carbon dark:text-slate-100">
                      {nodo.nombre}
                    </p>
                    {nodo.ubicacion && (
                      <p className="truncate text-[11px] text-[#a6a6a6]">{nodo.ubicacion}</p>
                    )}
                  </div>
                </div>

                <span
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold"
                  style={{ backgroundColor: `${config.tone}14`, color: config.tone }}
                >
                  {config.label}
                </span>
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
                <div>
                  <dt className="text-[#a6a6a6]">Sin lectura</dt>
                  <dd className="font-semibold text-carbon dark:text-slate-200">
                    {minutosAEtiq(nodo.minutosSinLectura)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#a6a6a6]">Última lectura</dt>
                  <dd className="font-semibold text-carbon dark:text-slate-200">{fechaLarga(nodo.ultimaLectura)}</dd>
                </div>
                <div>
                  <dt className="text-[#a6a6a6]">Distancia</dt>
                  <dd className="font-semibold text-carbon dark:text-slate-200">
                    {nodo.distanciaCm === null ? '—' : `${nodo.distanciaCm} cm`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#a6a6a6]">Velocidad</dt>
                  <dd className="font-semibold text-carbon dark:text-slate-200">
                    {nodo.velocidadCmMin === null ? '—' : `${nodo.velocidadCmMin} cm/min`}
                  </dd>
                </div>
              </dl>

              {nodo.detalle && (
                <p className="mt-2 text-[11px] leading-relaxed text-[#808080] dark:text-slate-500">{nodo.detalle}</p>
              )}
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
};

export default NodeConnectivityPanel;
