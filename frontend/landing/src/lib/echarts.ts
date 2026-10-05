import type { EChartsOption } from "echarts";
import { P } from "@/data/palette";

export const MONO = "JetBrains Mono";

/** Colores por nivel de alerta, alineados con el token `level` de decision.py. */
export const LEVEL_HEX = {
  VERDE: P.moss,
  AMARILLO: P.sun,
  NARANJA: P.amber,
  ROJO: P.ember,
} as const;

/** Convierte un hex de 6 dígitos en rgba() con la opacidad indicada. */
export function withAlpha(hex: string, alpha: number): string {
  const valor = hex.replace("#", "");
  const r = parseInt(valor.slice(0, 2), 16);
  const g = parseInt(valor.slice(2, 4), 16);
  const b = parseInt(valor.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Relleno degradado vertical reutilizado por las series de área. */
export function verticalGradient(hex: string, alpha: number) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(hex, alpha) },
      { offset: 1, color: withAlpha(hex, 0) },
    ],
  };
}

export const axisBase = {
  axisLine: { lineStyle: { color: P.hairline } },
  axisTick: { show: false },
  axisLabel: { color: P.inkMuted, fontFamily: MONO, fontSize: 11 },
  splitLine: { lineStyle: { color: P.hairline } },
};

export const axisNameStyle = { color: P.inkMuted, fontFamily: MONO, fontSize: 10 };

export const tooltip: EChartsOption["tooltip"] = {
  trigger: "axis",
  backgroundColor: "rgba(255,255,255,0.72)",
  borderColor: "rgba(31,156,136,0.25)",
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: P.ink, fontFamily: MONO, fontSize: 12 },
  extraCssText:
    "backdrop-filter: blur(16px) saturate(1.4); border-radius: 10px; box-shadow: 0 8px 32px rgba(11,31,29,0.08);",
};

/**
 * ECharts tipa `xAxis` como unión con `undefined`, así que devolver ese tipo
 * rompería la asignación dentro de `EChartsOption`.
 */
export type EjeTiempo = Exclude<EChartsOption["xAxis"], undefined>;

/** Eje de tiempo compacto: las marcas viajan al final del tooltip, no sobre la línea. */
export function timeAxis(horas: string[], intervalo: number): EjeTiempo {
  return {
    type: "category",
    data: horas,
    boundaryGap: false,
    ...axisBase,
    splitLine: { show: false },
    axisLabel: { ...axisBase.axisLabel, interval: intervalo },
  };
}

/** `HH:MM` a partir del ISO-8601 que devuelve PostgREST. */
export function horaCorta(timestamp: string): string {
  return timestamp.slice(11, 16);
}

/** Convierte un NUMERIC de Postgres (número o cadena) a número finito. */
export function toNum(valor: unknown): number | null {
  if (valor === null || valor === undefined || typeof valor === "boolean") return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}