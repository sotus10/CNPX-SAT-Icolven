import { AlertTriangle, RefreshCw, Satellite } from "lucide-react";
import { ChartCard } from "@/components/charts/ChartCard";
import { NivelActualChart } from "@/components/charts/NivelActualChart";
import { LluviaRecienteChart } from "@/components/charts/LluviaRecienteChart";
import { VelocidadCrecidaChart } from "@/components/charts/VelocidadCrecidaChart";
import { useRiverData } from "@/hooks/useRiverData";

/**
 * Gráficas 1 a 3 de la página pública, alimentadas por el backend del SAT.
 * Se monta detrás de <ClientOnly> desde Dashboard.tsx porque ECharts necesita
 * medir el contenedor en el navegador.
 */
export default function DashboardCharts() {
  const { lecturas, umbrales, lecturaActual, lluvia, error, loading, updatedAt, loadData } =
    useRiverData();

  const sinDatos = lecturas.length === 0;
  const advertencia = error && sinDatos;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[0.68rem] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Satellite size={13} className="text-aqua-deep" />
          {umbrales
            ? "Umbrales vigentes de configuracion_nodos"
            : "Umbrales no configurados para este nodo"}
        </span>
        <span className="inline-flex items-center gap-3">
          {updatedAt ? `Actualizado ${updatedAt.toLocaleTimeString("es-CO")}` : "Consultando…"}
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper/60 px-2.5 py-1 transition hover:border-aqua/50 hover:text-aqua-deep disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </span>
      </div>

      {advertencia ? (
        <p className="flex items-center gap-2 rounded-xl border border-ember/30 bg-ember/5 px-4 py-3 text-[0.7rem] text-ember">
          <AlertTriangle size={13} />
          {error} Las gráficas muestran el estado sin datos hasta que la API responda.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          title="Nivel del río · distancia al agua"
          caption="Menos distancia significa más agua. Las líneas marcan los umbrales de peligro configurados para el nodo."
          loading={loading && sinDatos}
          className="lg:col-span-3"
        >
          <NivelActualChart lecturas={lecturas} umbrales={umbrales} />
        </ChartCard>

        <ChartCard
          title="Lluvia satelital · últimas 24 h"
          caption="Precipitación registrada en la cuenca alta (Open-Meteo), en milímetros por hora."
          loading={loading && !lluvia}
          className="lg:col-span-2"
        >
          <LluviaRecienteChart lluvia={lluvia} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          title="Velocidad de crecida"
          caption="Qué tan rápido se acerca o se retira el agua. La aguja se pone en alerta al superar el límite configurado."
          loading={loading && sinDatos}
          className="lg:col-span-2"
        >
          <VelocidadCrecidaChart lectura={lecturaActual} umbrales={umbrales} />
        </ChartCard>

        <div className="rounded-xl border border-hairline bg-paper/60 p-4 lg:col-span-3">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
            Lectura vigente
          </p>
          {lecturaActual ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {[
                { term: "Distancia al agua", valor: `${lecturaActual.distancia_cm.toFixed(1)} cm` },
                {
                  term: "Velocidad",
                  valor:
                    lecturaActual.velocidad_cm_min === null
                      ? "—"
                      : `${lecturaActual.velocidad_cm_min.toFixed(2)} cm/min`,
                },
                { term: "Nivel validado", valor: lecturaActual.nivel },
                { term: "Medido", valor: lecturaActual.timestamp.slice(11, 16) },
              ].map((item) => (
                <div key={item.term}>
                  <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-ink-muted">
                    {item.term}
                  </dt>
                  <dd className="mt-1 font-display text-2xl text-ink">{item.valor}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              {loading ? "Consultando el sensor…" : "El sensor todavía no ha enviado lecturas."}
            </p>
          )}
          <p className="mt-5 border-t border-hairline pt-3 text-[0.7rem] leading-relaxed text-ink-muted">
            La distancia la mide el sensor ultrasónico JSN-SR04T. Sirve para comparar contra los
            umbrales del nodo, no para estimar caudal ni profundidad.
          </p>
        </div>
      </div>
    </div>
  );
}