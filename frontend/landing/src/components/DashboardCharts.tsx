import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { ALERT_LEVELS, RIVER_SERIES } from "@/data/mock";
import { P } from "@/data/palette";

const LEVEL_HEX: Record<string, string> = { verde: P.moss, amarillo: P.sun, naranja: P.amber, rojo: P.ember };

const axisBase = {
  axisLine: { lineStyle: { color: P.hairline } },
  axisTick: { show: false },
  axisLabel: { color: P.inkMuted, fontFamily: "JetBrains Mono", fontSize: 11 },
  splitLine: { lineStyle: { color: P.hairline } },
};

const tooltip: EChartsOption["tooltip"] = {
  trigger: "axis",
  backgroundColor: "rgba(255,255,255,0.72)",
  borderColor: "rgba(31,156,136,0.25)",
  borderWidth: 1,
  padding: [8, 12],
  textStyle: { color: P.ink, fontFamily: "JetBrains Mono", fontSize: 12 },
  extraCssText: "backdrop-filter: blur(16px) saturate(1.4); border-radius: 10px; box-shadow: 0 8px 32px rgba(11,31,29,0.08);",
};

const times = RIVER_SERIES.map((d) => d.time);

const levelOption: EChartsOption = {
  backgroundColor: "transparent",
  animationDuration: 1200,
  grid: { left: 44, right: 16, top: 24, bottom: 32 },
  tooltip,
  xAxis: { type: "category", data: times, boundaryGap: false, ...axisBase, splitLine: { show: false } },
  yAxis: { type: "value", min: 0.5, max: 3.2, name: "m", nameTextStyle: { color: P.inkMuted, fontFamily: "JetBrains Mono" }, ...axisBase },
  series: [
    {
      name: "Nivel",
      type: "line",
      smooth: true,
      symbol: "none",
      data: RIVER_SERIES.map((d) => d.level),
      lineStyle: { color: P.aqua, width: 2 },
      areaStyle: {
        color: {
          type: "linear",
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(31,156,136,0.28)" },
            { offset: 1, color: "rgba(31,156,136,0)" },
          ],
        },
      },
      markLine: {
        symbol: "none",
        silent: true,
        lineStyle: { type: "dashed", width: 1 },
        label: { position: "insideEndTop", fontFamily: "JetBrains Mono", fontSize: 10 },
        data: ALERT_LEVELS.map((l) => ({
          yAxis: l.threshold,
          name: l.name,
          lineStyle: { color: LEVEL_HEX[l.key] ?? P.ink },
          label: { color: LEVEL_HEX[l.key] ?? P.ink, formatter: l.name.toLowerCase() },
        })),
      },
    },
  ],
};

const rainOption: EChartsOption = {
  backgroundColor: "transparent",
  animationDuration: 1200,
  grid: { left: 40, right: 12, top: 24, bottom: 32 },
  tooltip,
  xAxis: { type: "category", data: times, ...axisBase, splitLine: { show: false }, axisLabel: { ...axisBase.axisLabel, interval: 11 } },
  yAxis: { type: "value", name: "mm/h", nameTextStyle: { color: P.inkMuted, fontFamily: "JetBrains Mono" }, ...axisBase },
  series: [
    {
      name: "Lluvia",
      type: "bar",
      data: RIVER_SERIES.map((d) => d.rain),
      itemStyle: { color: P.aquaDeep, borderRadius: [4, 4, 0, 0] },
      barWidth: "55%",
    },
  ],
};

export default function DashboardCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="rounded-xl border border-hairline bg-paper/60 p-4 lg:col-span-3">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">Nivel del río · últimas 24 h</p>
        <ReactECharts option={levelOption} style={{ height: 300, width: "100%" }} opts={{ renderer: "svg" }} autoResize />
      </div>
      <div className="rounded-xl border border-hairline bg-paper/60 p-4 lg:col-span-2">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">Precipitación satelital · mm/h</p>
        <ReactECharts option={rainOption} style={{ height: 300, width: "100%" }} opts={{ renderer: "svg" }} autoResize />
      </div>
    </div>
  );
}
