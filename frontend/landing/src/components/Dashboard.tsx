import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

const Charts = lazy(() => import("./DashboardCharts"));

function ChartsFallback() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="h-[340px] animate-pulse rounded-xl border border-hairline bg-paper/40 lg:col-span-3" />
        <div className="h-[340px] animate-pulse rounded-xl border border-hairline bg-paper/40 lg:col-span-2" />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="h-[340px] animate-pulse rounded-xl border border-hairline bg-paper/40 lg:col-span-2" />
        <div className="h-[340px] animate-pulse rounded-xl border border-hairline bg-paper/40 lg:col-span-3" />
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <SectionWrapper id="dashboard" className="bg-bone-2">
      <div className="pointer-events-none absolute inset-0 grid-overlay" aria-hidden />
      <Item className="relative max-w-[640px]">
        <Eyebrow>Dashboard en vivo</Eyebrow>
        <h2 className="text-section">Lo que ve quien vigila el río.</h2>
        <p className="mt-6 text-ink-muted">
          Un panel de control simple para la alcaldía y los líderes comunitarios. Nivel del agua, lluvia
          en la cuenca alta y velocidad de la crecida, en una sola pantalla.
        </p>
      </Item>

      <Item className="relative mt-14">
        <div className="glass rounded-2xl p-4 lg:p-6">
          <ClientOnly fallback={<ChartsFallback />}>
            <Suspense fallback={<ChartsFallback />}>
              <Charts />
            </Suspense>
          </ClientOnly>
        </div>
      </Item>
    </SectionWrapper>
  );
}