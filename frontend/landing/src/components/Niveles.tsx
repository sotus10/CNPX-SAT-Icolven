import { ALERT_LEVELS } from "@/data/mock";
import { Card, Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

const COLOR: Record<string, string> = {
  verde: "bg-moss",
  amarillo: "bg-sun",
  naranja: "bg-amber",
  rojo: "bg-ember",
};
const BORDER: Record<string, string> = {
  verde: "border-t-moss",
  amarillo: "border-t-sun",
  naranja: "border-t-amber",
  rojo: "border-t-ember",
};
const LIFT = ["lg:mt-24", "lg:mt-16", "lg:mt-8", "lg:mt-0"];

export function Niveles() {
  return (
    <SectionWrapper id="niveles">
      <Item className="max-w-[640px]">
        <Eyebrow>Niveles de alerta</Eyebrow>
        <h2 className="text-section">Cuatro niveles. Cada uno avisa a alguien distinto.</h2>
      </Item>
      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
        {ALERT_LEVELS.map((l, i) => (
          <Item key={l.key} className={LIFT[i] ?? ""}>
            <Card className={`border-t-2 ${BORDER[l.key]}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${COLOR[l.key]}`} aria-hidden />
                <h3 className="text-[1.375rem]">{l.name}</h3>
              </div>
              <p className="mt-2 font-mono text-xs text-ink-muted">umbral · {l.threshold.toFixed(1)} m</p>
              <p className="mt-5 text-[0.95rem] text-ink">{l.condition}</p>
              <p className="mt-4 text-[0.95rem] text-ink-muted">
                <span className="font-mono text-xs uppercase tracking-wider text-aqua-deep">Aviso a</span>
                <br />
                {l.notify}
              </p>
            </Card>
          </Item>
        ))}
      </div>
    </SectionWrapper>
  );
}
