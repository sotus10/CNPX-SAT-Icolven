import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { NODES, NODE_STATUS } from "@/data/mock";
import { Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

const Charts = lazy(() => import("./DashboardCharts"));

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / range) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-24" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke="#1F9C88" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ChartsFallback() {
  return <div className="h-[340px] animate-pulse rounded-xl border border-hairline bg-paper/40" />;
}

export function Dashboard() {
  return (
    <SectionWrapper id="dashboard" className="bg-bone-2">
      <div className="pointer-events-none absolute inset-0 grid-overlay" aria-hidden />
      <Item className="relative max-w-[640px]">
        <Eyebrow>Dashboard en vivo</Eyebrow>
        <h2 className="text-section">Lo que ve quien vigila el río.</h2>
        <p className="mt-6 text-ink-muted">
          Un panel de control simple para la alcaldía y los líderes comunitarios. Nivel, lluvia y estado de cada
          nodo, en una sola pantalla.
        </p>
      </Item>

      <Item className="relative mt-14">
        <div className="glass rounded-2xl p-4 lg:p-6">
          <div className="mb-5 flex flex-wrap gap-2">
            {NODE_STATUS.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper/70 px-3 py-1 font-mono text-xs text-ink-muted"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-moss" aria-hidden />
                {c.label} <span className="text-ink">{c.value}</span>
              </span>
            ))}
          </div>

          <ClientOnly fallback={<ChartsFallback />}>
            <Suspense fallback={<ChartsFallback />}>
              <Charts />
            </Suspense>
          </ClientOnly>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {NODES.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-xl border border-hairline bg-paper/60 px-4 py-3">
                <div>
                  <p className="font-mono text-[0.7rem] uppercase tracking-wider text-aqua-deep">{n.id}</p>
                  <p className="text-sm text-ink">{n.name}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {n.type} · bat {n.battery} %
                  </p>
                </div>
                <Sparkline data={n.spark} />
              </div>
            ))}
          </div>
        </div>
      </Item>
    </SectionWrapper>
  );
}
