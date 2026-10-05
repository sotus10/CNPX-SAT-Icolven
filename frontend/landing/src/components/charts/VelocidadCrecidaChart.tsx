import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { P } from "@/data/palette";
import { LEVEL_HEX, MONO, withAlpha } from "@/lib/echarts";
import type { NodeThresholds, RiverReading } from "@/hooks/useRiverData";

type Props = {
  lectura: RiverReading | null;
  umbrales: NodeThresholds | null;
};

/** Parada de color del eje del tacómetro: [posición, color]. */
type ParadaColor = [number, string];

/** Redondea el extremo del eje a un múltiplo legible de 2 unidades. */
function techo(objetivo: number): number {
  const paso = objetivo > 20 ? 10 : 2;
  return Math.max(paso, Math.ceil(objetivo / paso) * paso);
}

function descripcion(velocidad: number | null, limite: number | null): string {
  if (velocidad === null) return "Sin medición de velocidad";
  const magnitud = Math.abs(velocidad).toFixed(2);
  if (limite === null) return `${velocidad >= 0 ? "Subiendo" : "Bajando"} · ${magnitud} cm/min`;
  if (velocidad >= limite) return "Subida rápida por encima del límite";
  if (velocidad <= -limite) return "Descenso rápido por debajo del límite";
  return velocidad > 0.15 ? "Subiendo" : velocidad < -0.15 ? "Bajando" : "Nivel estable";
}

/**
 * Gráfica 3 · Indicador de velocidad de crecida.
 *
 * El tacómetro es simétrico alrededor del cero porque el valor tiene signo: por
 * encima el agua se acerca al sensor, por debajo se retira. La aguja vira a color
 * de advertencia al superar `limite_velocidad_cm_min` en cualquier sentido.
 */
export function VelocidadCrecidaChart({ lectura, umbrales }: Props) {
  const option = useMemo((): EChartsOption => {
    const velocidad = lectura?.velocidad_cm_min ?? null;
    const limite = umbrales?.limite_velocidad_cm_min ?? null;
    const maximo = techo(
      Math.max(limite !== null ? limite * 1.6 : 0, velocidad !== null ? Math.abs(velocidad) * 1.25 : 0, 2),
    );

    const limiteRelativoPositivo =
      limite !== null ? (limite + maximo) / (2 * maximo) : 1;
    const limiteRelativoNegativo = 1 - limiteRelativoPositivo;
    // `maximo` siempre deja un 37 % de recorrido libre a cada lado del límite,
    // así que la franja roja cabe antes de los extremos del eje.
    const margen = (limiteRelativoPositivo - limiteRelativoNegativo) * 0.25;
    const colorAguja =
      velocidad !== null && limite !== null && Math.abs(velocidad) >= limite
        ? LEVEL_HEX.ROJO
        : P.aquaDeep;

    // ECharts exige parches de color estrictamente crecientes, así que cada
    // cambio de banda necesita dos paradas: una antes y otra después.
    const colorEje: ParadaColor[] =
      limite === null
        ? [
            [0, withAlpha(P.aqua, 0.55)],
            [1, withAlpha(P.aqua, 0.55)],
          ]
        : [
            [0, withAlpha(LEVEL_HEX.ROJO, 0.28)],
            [limiteRelativoNegativo - margen, withAlpha(LEVEL_HEX.ROJO, 0.28)],
            [limiteRelativoNegativo - margen, withAlpha(LEVEL_HEX.AMARILLO, 0.32)],
            [limiteRelativoNegativo, withAlpha(LEVEL_HEX.AMARILLO, 0.32)],
            [limiteRelativoNegativo, withAlpha(P.moss, 0.75)],
            [limiteRelativoPositivo, withAlpha(P.moss, 0.75)],
            [limiteRelativoPositivo, withAlpha(LEVEL_HEX.AMARILLO, 0.32)],
            [limiteRelativoPositivo + margen, withAlpha(LEVEL_HEX.AMARILLO, 0.32)],
            [limiteRelativoPositivo + margen, withAlpha(LEVEL_HEX.ROJO, 0.28)],
            [1, withAlpha(LEVEL_HEX.ROJO, 0.28)],
          ];

    return {
      backgroundColor: "transparent",
      animationDuration: 1200,
      series: [
        {
          type: "gauge",
          min: -maximo,
          max: maximo,
          startAngle: 210,
          endAngle: -30,
          center: ["50%", "56%"],
          radius: "88%",
          splitNumber: 4,
          progress: { show: false },
          axisLine: {
            roundCap: true,
            lineStyle: { width: 14, color: colorEje },
          },
          pointer: {
            length: "58%",
            width: 5,
            itemStyle: { color: colorAguja },
          },
          anchor: { show: true, size: 10, itemStyle: { color: colorAguja } },
          axisTick: {
            distance: -14,
            splitNumber: 2,
            lineStyle: { width: 1, color: withAlpha(P.ink, 0.35) },
          },
          splitLine: {
            distance: -16,
            length: 6,
            lineStyle: { width: 1.5, color: withAlpha(P.ink, 0.45) },
          },
          axisLabel: {
            distance: 20,
            color: P.inkMuted,
            fontFamily: MONO,
            fontSize: 9,
            formatter: (valor: number) => `${valor > 0 ? "+" : ""}${valor}`,
          },
          title: {
            offsetCenter: [0, "32%"],
            color: P.inkMuted,
            fontFamily: MONO,
            fontSize: 11,
          },
          detail: {
            offsetCenter: [0, "0%"],
            valueAnimation: true,
            color: colorAguja,
            fontFamily: MONO,
            fontSize: 30,
            formatter: (valor: number) =>
              velocidad === null ? "—" : `${valor >= 0 ? "+" : ""}${valor.toFixed(2)}`,
          },
          data: [
            {
              value: velocidad ?? 0,
              name: `${descripcion(velocidad, limite)} · cm/min`,
            },
          ],
        },
      ],
    };
  }, [lectura, umbrales]);

  return (
    <ReactECharts
      option={option}
      style={{ height: 280, width: "100%" }}
      opts={{ renderer: "svg" }}
      autoResize
    />
  );
}