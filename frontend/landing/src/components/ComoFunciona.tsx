import { motion, useReducedMotion } from "framer-motion";
import { Bell, Radio, Ruler, Satellite } from "lucide-react";
import { STEPS } from "@/data/mock";
import { EASE, Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

const ICONS = [Ruler, Radio, Satellite, Bell];

export function ComoFunciona() {
  const reduce = useReducedMotion();
  return (
    <SectionWrapper id="como-funciona" className="bg-paper-2">
      <Item className="max-w-[640px]">
        <Eyebrow>Cómo funciona</Eyebrow>
        <h2 className="text-section">Cuatro pasos entre el río y el teléfono.</h2>
      </Item>

      <div className="relative mt-16">
        {/* connector line (desktop) */}
        <div className="absolute left-0 right-0 top-6 hidden h-px bg-hairline lg:block" aria-hidden>
          <motion.div
            className="h-full bg-aqua"
            initial={{ width: reduce ? "100%" : "0%" }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
          />
        </div>
        {/* connector line (mobile) */}
        <div className="absolute bottom-0 left-6 top-0 w-px bg-hairline lg:hidden" aria-hidden>
          <motion.div
            className="w-full bg-aqua"
            initial={{ height: reduce ? "100%" : "0%" }}
            whileInView={{ height: "100%" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.6, ease: EASE }}
          />
        </div>

        <ol className="grid gap-12 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((s, i) => {
            const Icon = ICONS[i]!;
            return (
              <Item key={s.n} className="relative pl-16 lg:pl-0">
                <li className="list-none">
                  <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl border border-aqua/30 bg-aqua-soft text-aqua-deep lg:relative">
                    <Icon size={20} strokeWidth={1.6} />
                  </div>
                  <p className="mt-0 font-mono text-4xl text-hairline lg:mt-8 [color:oklch(0.22_0.025_185/0.18)]">{s.n}</p>
                  <h3 className="mt-3 text-[1.375rem]">{s.title}</h3>
                  <p className="mt-2 text-[0.95rem] text-ink-muted">{s.text}</p>
                </li>
              </Item>
            );
          })}
        </ol>
      </div>

      <Item>
        <p className="mt-16 max-w-[640px] border-l border-aqua pl-5 text-[0.95rem] text-ink-muted">
          El cruce satelital existe para eliminar falsas alarmas. Un sistema que grita sin razón deja de ser
          creído, y una alerta en la que nadie cree no sirve de nada.
        </p>
      </Item>
    </SectionWrapper>
  );
}
