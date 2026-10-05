import { useCallback, useEffect, useMemo, useState } from "react";
import type { SatelliteData } from "@/components/DatosSatelitales";
import { toNum } from "@/lib/echarts";
import { API_BASE, REFRESH_INTERVAL } from "@/lib/api";

const HISTORIAL_LIMITE = 48;

export type RiverReading = {
  id: string;
  nodo_id: string;
  distancia_cm: number;
  velocidad_cm_min: number | null;
  nivel: string;
  timestamp: string;
};

/** Umbrales vigentes de `configuracion_nodos` para el nodo que se está mostrando. */
export type NodeThresholds = {
  umbral_amarillo_cm: number;
  umbral_naranja_cm: number;
  umbral_rojo_cm: number;
  limite_velocidad_cm_min: number | null;
};

/**
 * Lo que llega de la API se tipa campo a campo y no como `unknown`: los NUMERIC
 * de Postgres pueden venir como número o como cadena y solo se acepta lo que se
 * puede convertir sin perder precisión.
 */
type LecturaApi = {
  id?: unknown;
  nodo_id?: unknown;
  distancia_cm?: unknown;
  velocidad_cm_min?: unknown;
  nivel?: unknown;
  timestamp?: unknown;
};

type ConfiguracionApi = {
  nodo_id?: unknown;
  umbral_amarillo_cm?: unknown;
  umbral_naranja_cm?: unknown;
  umbral_rojo_cm?: unknown;
  limite_velocidad_cm_min?: unknown;
};

async function consultar<T>(ruta: string, signal?: AbortSignal): Promise<T[]> {
  const response = await fetch(`${API_BASE}${ruta}`, {
    signal: signal ?? null,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`La API respondió con el estado ${response.status}.`);
  const cuerpo = (await response.json()) as { data: T[] };
  if (!Array.isArray(cuerpo.data)) throw new Error("La API devolvió un formato inesperado.");
  return cuerpo.data;
}

/** `/satelital` responde el objeto de Open-Meteo directamente, sin sobre de lista. */
async function consultarSatelite(signal?: AbortSignal): Promise<SatelliteData> {
  const response = await fetch(`${API_BASE}/satelital`, {
    signal: signal ?? null,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`La API respondió con el estado ${response.status}.`);
  return (await response.json()) as SatelliteData;
}

function leerLecturas(bruto: LecturaApi[]): RiverReading[] {
  return bruto
    .map((fila) => {
      const distancia_cm = toNum(fila.distancia_cm);
      const timestamp = typeof fila.timestamp === "string" ? fila.timestamp : null;
      if (distancia_cm === null || timestamp === null) return null;
      return {
        id: typeof fila.id === "string" ? fila.id : timestamp,
        nodo_id: typeof fila.nodo_id === "string" ? fila.nodo_id : "",
        distancia_cm,
        velocidad_cm_min: toNum(fila.velocidad_cm_min),
        nivel: typeof fila.nivel === "string" ? fila.nivel : "VERDE",
        timestamp,
      };
    })
    .filter((lectura): lectura is RiverReading => lectura !== null);
}

function leerUmbrales(bruto: ConfiguracionApi[], nodoId: string | null): NodeThresholds | null {
  for (const fila of bruto) {
    if (nodoId && fila.nodo_id !== nodoId) continue;
    const amarillo = toNum(fila.umbral_amarillo_cm);
    const naranja = toNum(fila.umbral_naranja_cm);
    const rojo = toNum(fila.umbral_rojo_cm);
    if (amarillo === null || naranja === null || rojo === null) return null;
    return {
      umbral_amarillo_cm: amarillo,
      umbral_naranja_cm: naranja,
      umbral_rojo_cm: rojo,
      limite_velocidad_cm_min: toNum(fila.limite_velocidad_cm_min),
    };
  }
  return null;
}

/**
 * Alimenta las gráficas de la página pública con datos reales del SAT.
 * Cada consulta es independiente: si Open-Meteo falla, el nivel del río sigue visible.
 */
export function useRiverData() {
  const [lecturas, setLecturas] = useState<RiverReading[]>([]);
  const [umbrales, setUmbrales] = useState<NodeThresholds | null>(null);
  const [lluvia, setLluvia] = useState<SatelliteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    const [nivel, config, satelite] = await Promise.allSettled([
      consultar<LecturaApi>(`/historial?limite=${HISTORIAL_LIMITE}`, signal),
      consultar<ConfiguracionApi>("/configuracion", signal),
      consultarSatelite(signal),
    ]);

    if (nivel.status === "fulfilled") {
      // El backend devuelve de la más reciente a la más antigua; la línea del
      // tiempo tiene que avanzar de izquierda a derecha.
      const ordenadas = leerLecturas(nivel.value).sort((a, b) =>
        a.timestamp < b.timestamp ? -1 : 1,
      );
      setLecturas(ordenadas);
      const nodoActual = ordenadas[ordenadas.length - 1]?.nodo_id ?? null;
      setUmbrales(
        config.status === "fulfilled" ? leerUmbrales(config.value, nodoActual) : null,
      );
    }

    if (satelite.status === "fulfilled") setLluvia(satelite.value);

    if (nivel.status === "rejected") {
      const causa = nivel.reason;
      setError(
        causa instanceof Error && causa.name !== "AbortError"
          ? causa.message
          : "No fue posible consultar el nivel del río.",
      );
    } else if (config.status === "rejected" || satelite.status === "rejected") {
      setError("Datos parciales: falta la lluvia satelital o los umbrales configurados.");
    } else {
      setError(null);
    }

    setUpdatedAt(new Date());
    setLoading(false);
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

  const lecturaActual = useMemo(() => lecturas[lecturas.length - 1] ?? null, [lecturas]);

  return { lecturas, umbrales, lecturaActual, lluvia, error, loading, updatedAt, loadData };
}