import { ClientOnly } from "@tanstack/react-router";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { lazy, Suspense, useRef } from "react";
import { STORY_STEPS } from "@/data/mock";

const StoryScene = lazy(() => import("./three/StoryScene"));

function StepText({ step, progress }: { step: (typeof STORY_STEPS)[number]; progress: MotionValue<number> }) {
  const span = step.to - step.from;
  const f = Math.min(0.04, span * 0.25);
  const first = step.from === 0;
  const last = step.to === 1;
  const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  // fade out finishes before the next step fades in, so panels never overlap
  const opacity = useTransform(progress, (p) => {
    const enter = first ? 1 : ramp(p, step.from + f * 0.5, step.from + f);
    const exit = last ? 1 : 1 - ramp(p, step.to - f, step.to - f * 0.5);
    return Math.min(enter, exit);
  });
  const y = useTransform(progress, (p) => (first ? 0 : 16 * (1 - ramp(p, step.from + f * 0.5, step.from + f))));
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 bottom-0 lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:items-center">
      <div className="glass m-4 rounded-2xl p-6 lg:m-0 lg:ml-[max(24px,calc((100vw-1200px)/2))] lg:w-[400px] lg:p-8">
        <p className="eyebrow mb-3">{step.kicker}</p>
        <h3 className="text-[1.75rem] leading-[1.1] lg:text-[2.25rem]">{step.title}</h3>
        <p className="mt-3 text-[0.95rem] text-ink-muted">{step.text}</p>
      </div>
    </motion.div>
  );
}

function LoadingBar({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.4, 0.43, 0.54, 0.57], [0, 1, 1, 0]);
  const width = useTransform(progress, [0.42, 0.54], ["0%", "100%"]);
  const label = useTransform(progress, (p) => `${Math.round(Math.min(1, Math.max(0, (p - 0.42) / 0.12)) * 100)} %`);
  return (
    <motion.div
      style={{ opacity }}
      className="glass absolute right-4 top-24 w-[240px] rounded-2xl p-4 lg:right-[max(24px,calc((100vw-1200px)/2))] lg:top-1/2 lg:-translate-y-1/2"
      aria-hidden
    >
      <div className="flex items-center justify-between font-mono text-xs text-ink-muted">
        <span>cargando datos</span>
        <motion.span className="text-ink">{label}</motion.span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-hairline">
        <motion.div style={{ width }} className="h-full bg-aqua" />
      </div>
      <p className="mt-3 font-mono text-[0.7rem] text-ink-muted">trama LoRa · 12 bytes · CRC ok</p>
    </motion.div>
  );
}

function Label({ progress, from, to, text, className }: { progress: MotionValue<number>; from: number; to: number; text: string; className: string }) {
  const opacity = useTransform(progress, [from, from + 0.03, to - 0.03, to], [0, 1, 1, 0]);
  return (
    <motion.p style={{ opacity }} className={`absolute font-mono text-xs uppercase tracking-[0.18em] text-aqua-deep ${className}`} aria-hidden>
      {text}
    </motion.p>
  );
}

export function Story3D() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section id="recorrido" aria-label="Recorrido del dato, del río al dashboard" className="relative bg-bone">
      <div className="mx-auto max-w-[1200px] px-6 pt-20 lg:pt-32">
        <p className="eyebrow mb-5">El recorrido del dato</p>
        <h2 className="text-section max-w-[16ch]">Del río a la pantalla, sin una sola torre celular.</h2>
        <p className="mt-6 max-w-[560px] text-ink-muted">Desplázate para seguir una lectura desde el sensor hasta el dashboard.</p>
      </div>

      <div ref={ref} className="relative h-[560vh]">
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
          <ClientOnly fallback={<div className="h-full w-full gradient-mesh" />}>
            <Suspense fallback={<div className="h-full w-full gradient-mesh" />}>
              <StoryScene progress={scrollYProgress} />
            </Suspense>
          </ClientOnly>

          <div className="pointer-events-none absolute inset-0">
            {STORY_STEPS.map((s) => (
              <StepText key={s.kicker} step={s} progress={scrollYProgress} />
            ))}
            <Label progress={scrollYProgress} from={0.18} to={0.4} text="LoRa connection · 900 MHz" className="left-1/2 top-24 -translate-x-1/2" />
            <Label progress={scrollYProgress} from={0.58} to={0.74} text="WiFi → base de datos" className="left-1/2 top-24 -translate-x-1/2" />
            <LoadingBar progress={scrollYProgress} />
          </div>
        </div>
      </div>
    </section>
  );
}
