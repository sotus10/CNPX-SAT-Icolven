import { createFileRoute } from "@tanstack/react-router";
import { ReactLenis } from "lenis/react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { StatBand } from "@/components/StatBand";
import { Problema } from "@/components/Problema";
import { ComoFunciona } from "@/components/ComoFunciona";
import { DatosSatelitales } from "@/components/DatosSatelitales";
import { Story3D } from "@/components/Story3D";
import { Niveles } from "@/components/Niveles";
import { Dashboard } from "@/components/Dashboard";
import { Tecnologia } from "@/components/Tecnologia";
import { Comunidad } from "@/components/Comunidad";
import { Equipo } from "@/components/Equipo";
import { Cierre, Footer } from "@/components/Cierre";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Divider } from "@/components/ui/primitives";
import { API_BASE } from "@/lib/api";
import type { SatelliteData } from "@/components/DatosSatelitales";

const TITLE = "Cauce · Sistema de alerta temprana de crecientes con LoRa";
const DESC =
  "Alerta temprana de inundaciones para municipios ribereños de Colombia. Sensores solares, radio LoRa 900 MHz, validación satelital y alertas a la comunidad.";

export const Route = createFileRoute("/")({
  loader: async (): Promise<SatelliteData | null> => {
    try {
      const response = await fetch(`${API_BASE}/satelital`);
      if (!response.ok) return null;
      return (await response.json()) as SatelliteData;
    } catch {
      return null;
    }
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const satelliteData = Route.useLoaderData();
  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <StatBand />
        <Problema />
        <Divider />
        <ComoFunciona />
        <DatosSatelitales initialData={satelliteData} />
        <Story3D />
        <Divider />
        <Niveles />
        <Dashboard />
        <Divider />
        <Tecnologia />
        <Comunidad />
        <Equipo />
        <Divider />
        <Cierre />
      </main>
      <Footer />
    </ReactLenis>
  );
}
