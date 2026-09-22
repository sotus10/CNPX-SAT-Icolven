import { Cpu, Radio, Ruler, Satellite, ShieldCheck, Sun } from "lucide-react";
import { TECH } from "@/data/mock";
import { Card, Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

const ICONS: Record<string, typeof Cpu> = {
  lora: Radio,
  esp32: Cpu,
  sensor: Ruler,
  solar: Sun,
  sat: Satellite,
  ip68: ShieldCheck,
};

function Rings() {
  return (
    <div className="relative h-40 w-40" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="absolute inset-0 rounded-full border border-aqua/60"
          style={{ animation: `ring-pulse 4s ease-out ${i}s infinite` }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua" />
    </div>
  );
}

export function Tecnologia() {
  return (
    <SectionWrapper id="tecnologia">
      <Item className="max-w-[640px]">
        <Eyebrow>Tecnología</Eyebrow>
        <h2 className="text-section">Componentes sencillos, elegidos con cuidado.</h2>
      </Item>
      <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
        {TECH.map((t) => {
          const Icon = ICONS[t.key]!;
          return (
            <Item key={t.key} className={t.large ? "sm:col-span-2 lg:col-span-8 lg:row-span-2" : "lg:col-span-4"}>
              <Card className={`flex h-full flex-col ${t.large ? "justify-between lg:p-10" : ""}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-aqua/30 bg-aqua-soft text-aqua-deep">
                    <Icon size={20} strokeWidth={1.6} />
                  </div>
                  {t.large && (
                    <div className="hidden lg:block">
                      <Rings />
                    </div>
                  )}
                </div>
                <div className={t.large ? "mt-10" : "mt-8"}>
                  <h3 className={t.large ? "text-4xl" : "text-[1.375rem]"}>{t.title}</h3>
                  <p className="mt-2 max-w-[46ch] text-[0.95rem] text-ink-muted">{t.text}</p>
                  <p className="mt-5 font-mono text-xs text-aqua-deep">{t.spec}</p>
                </div>
              </Card>
            </Item>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
