import { PROBLEM_CARDS } from "@/data/mock";
import { Card, Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

export function Problema() {
  return (
    <SectionWrapper id="problema" inner="grid gap-14 lg:grid-cols-2 lg:gap-20">
      <div>
        <Item>
          <Eyebrow>El problema</Eyebrow>
          <h2 className="text-section">Los ríos pequeños no tienen quién los vigile.</h2>
        </Item>
        <Item>
          <p className="mt-8 text-ink-muted">
            En Colombia, el monitoreo de crecientes se concentra en las grandes ciudades. Medellín tiene el SIATA.
            Bogotá tiene estaciones cada pocos kilómetros. Cientos de municipios ribereños no tienen un solo sensor
            sobre su río.
          </p>
        </Item>
        <Item>
          <p className="mt-6 text-ink-muted">
            Cuando el agua sube de noche, la diferencia entre perder los enseres y perder una vida se mide en
            minutos. Minutos que hoy nadie está contando.
          </p>
        </Item>
      </div>
      <div className="flex flex-col gap-4">
        {PROBLEM_CARDS.map((c) => (
          <Item key={c.label}>
            <Card className="flex items-baseline gap-6">
              <span className="font-display text-5xl tracking-tight text-ink lg:text-6xl">{c.figure}</span>
              <div>
                <p className="text-ink">{c.label}</p>
                <p className="mt-1 font-mono text-xs text-ink-muted">[DATO — {c.source}]</p>
              </div>
            </Card>
          </Item>
        ))}
      </div>
    </SectionWrapper>
  );
}
