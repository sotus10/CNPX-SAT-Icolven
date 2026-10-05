import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { P } from "@/data/palette";
import {
  LEVEL_HEX,
  MONO,
  axisBase,
  axisNameStyle,
  horaCorta,
  timeAxis,
  tooltip,
  verticalGradient,
  withAlpha,
} from "@/lib/echarts";
import type { NodeThresholds, RiverReading } from "@/hooks/useRiverData";

type Props = {
  lecturas: RiverReading[];
  umbrales: NodeThresholds | null;
};

/**
 * Gráfica 1 · Nivel actual del río vs. umbrales de peligro.
 *
 * El sensor mide la distancia entre el sensor y la superficie del agua, así que
 * la lectura se invierte respecto al nivel: menos distancia significa más agua.
 * Las franjas y las líneas horizontales salen de `configuracion_nodos`.
 */
export function NivelActualChart({ lecturas, umbrales }: Props) {
  const option = useMemo((): EChartsOption => {
    const valores = lecturas.map((lectura) => lectura.distancia_cm);
    const candidatos = umbrales
      ? [umbrales.umbral_amarillo_cm, umbrales.umbral_naranja_cm, umbrales.umbral_rojo_cm]
      : [];
    const escala = [...valores, ...candidatos];
    const minimo = escala.length ? Math.max(0, Math.floor((Math.min(...escala) - 15) / 10) * 10) : 0;
    const maximo = escala.length ? Math.ceil((Math.max(...escala) + 15) / 10) * 10 : 100;

    // Cada franja es un par [inicio, fin]: ECharts las lee como regiones, no
    // como puntos sueltos.
    const franja = (
      nombre: string,
      desde: number,
      hasta: number,
      hex: string,
    ): [{ yAxis: number; itemStyle: { color: string }; label: object }, { yAxis: number }] => [
      {
        yAxis: desde,
        itemStyle: { color: withAlpha(hex, 0.07) },
        label: {
          position: "insideTopLeft",
          formatter: nombre,
          color: hex,
          fontFamily: MONO,
          fontSize: 9,
          padding: [2, 0, 0, 2],
        },
      },
      { yAxis: hasta },
    ];

    const zonas = umbrales
      ? [
          franja("zona roja", minimo, umbrales.umbral_rojo_cm, LEVEL_HEX.ROJO),
          franja(
            "zona naranja",
            umbrales.umbral_rojo_cm,
            umbrales.umbral_naranja_cm,
            LEVEL_HEX.NARANJA,
          ),
          franja(
            "zona amarilla",
            umbrales.umbral_naranja_cm,
            umbrales.umbral_amarillo_cm,
            LEVEL_HEX.AMARILLO,
          ),
        ]
      : [];

    const marcadores = umbrales
      ? [
          {
            yAxis: umbrales.umbral_rojo_cm,
            name: "rojo",
            lineStyle: { color: LEVEL_HEX.ROJO },
            label: { color: LEVEL_HEX.ROJO, formatter: `rojo ${umbrales.umbral_rojo_cm} cm` },
          },
          {
            yAxis: umbrales.umbral_naranja_cm,
            name: "naranja",
            lineStyle: { color: LEVEL_HEX.NARANJA },
            label: { color: LEVEL_HEX.NARANJA, formatter: `naranja ${umbrales.umbral_naranja_cm} cm` },
          },
          {
            yAxis: umbrales.umbral_amarillo_cm,
            name: "amarillo",
            lineStyle: { color: LEVEL_HEX.AMARILLO },
            label: { color: LEVEL_HEX.AMARILLO, formatter: `amarillo ${umbrales.umbral_amarillo_cm} cm` },
          },
        ]
      : [];

    return {
      backgroundColor: "transparent",
      animationDuration: 1200,
      grid: { left: 52, right: 20, top: 34, bottom: 34 },
      tooltip: {
        ...tooltip,
        valueFormatter: (valor) => `${Number(valor).toFixed(1)} cm al agua`,
      },
      legend: {
        data: ["Distancia al agua"],
        textStyle: { color: P.inkMuted, fontFamily: MONO, fontSize: 11 },
        itemWidth: 18,
        itemHeight: 2,
      },
      xAxis: timeAxis(
        lecturas.map((lectura) => horaCorta(lectura.timestamp)),
        Math.max(0, Math.ceil(lecturas.length / 6) - 1),
      ),
      yAxis: {
        type: "value",
        min: minimo,
        max: maximo,
        name: "cm al agua",
        nameTextStyle: axisNameStyle,
        ...axisBase,
      },
      series: [
        {
          name: "Distancia al agua",
          type: "line",
          smooth: true,
          symbol: "none",
          data: valores,
          lineStyle: { color: P.aqua, width: 2 },
          areaStyle: { color: verticalGradient(P.aqua, 0.22) },
          markLine: {
            symbol: "none",
            silent: true,
            lineStyle: { type: "dashed", width: 1 },
            label: { position: "insideEndTop", fontFamily: MONO, fontSize: 9 },
            data: marcadores,
          },
          markArea: { silent: true, data: zonas },
        },
      ],
    };
  }, [lecturas, umbrales]);

  return (
    <ReactECharts
      option={option}
      style={{ height: 280, width: "100%" }}
      opts={{ renderer: "svg" }}
      autoResize
    />
  );
}