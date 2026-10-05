import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { P } from "@/data/palette";
import type { SatelliteData } from "@/components/DatosSatelitales";
import { MONO, axisBase, axisNameStyle, horaCorta, timeAxis, tooltip } from "@/lib/echarts";

type Props = {
  lluvia: SatelliteData | null;
  horas?: number;
};

/**
 * Gráfica 2 · Registro de lluvia reciente (satelital).
 *
 * Solo se dibujan las horas ya registradas; el pronóstico se omite para que la
 * comunidad no confunda una predicción con una medición.
 */
export function LluviaRecienteChart({ lluvia, horas = 24 }: Props) {
  const option = useMemo((): EChartsOption => {
    const registrados = (lluvia?.hourly ?? [])
      .filter((hora) => !hora.is_forecast)
      .slice(-horas);
    const vacio = registrados.length === 0;

    return {
      backgroundColor: "transparent",
      animationDuration: 1200,
      grid: { left: 48, right: 20, top: 34, bottom: 34 },
      tooltip: {
        ...tooltip,
        valueFormatter: (valor) => `${Number(valor).toFixed(1)} mm/h`,
      },
      xAxis: timeAxis(
        registrados.map((hora) => horaCorta(hora.time)),
        Math.max(0, Math.ceil(registrados.length / 6) - 1),
      ),
      yAxis: {
        type: "value",
        min: 0,
        name: "mm/h",
        nameTextStyle: axisNameStyle,
        ...axisBase,
      },
      series: [
        {
          name: "Precipitación",
          type: "bar",
          barWidth: "58%",
          data: registrados.map((hora) => hora.precipitation_mm),
          itemStyle: { color: P.aquaDeep, borderRadius: [3, 3, 0, 0] },
        },
      ],
      graphic: vacio
        ? [
            {
              type: "text",
              left: "center",
              top: "middle",
              style: {
                text: "Sin registro satelital disponible",
                fill: P.inkMuted,
                fontFamily: MONO,
                fontSize: 12,
              },
            },
          ]
        : [],
    };
  }, [lluvia, horas]);

  return (
    <ReactECharts
      option={option}
      style={{ height: 280, width: "100%" }}
      opts={{ renderer: "svg" }}
      autoResize
    />
  );
}