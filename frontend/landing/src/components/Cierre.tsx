import { COMPETITION, PROJECT_NAME } from "@/data/mock";
import { Button, Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

export function Cierre() {
  return (
    <SectionWrapper id="contacto" className="overflow-hidden py-32 lg:py-48" inner="relative text-center">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua opacity-[0.14] blur-[120px]"
        aria-hidden
      />
      <Item className="relative">
        <Eyebrow>Contacto</Eyebrow>
        <h2 className="text-section mx-auto max-w-[18ch]">Si su municipio tiene un río, hablemos.</h2>
        <p className="mx-auto mt-6 max-w-[520px] text-ink-muted">
          Buscamos alcaldías, juntas de acción comunal y organizaciones que quieran instalar el primer nodo piloto.
        </p>
        <div className="mt-10">
          <Button href="mailto:hola@cauce.co">Escribir al equipo</Button>
        </div>
      </Item>
    </SectionWrapper>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-xl text-ink">{PROJECT_NAME}</span>
        <p className="font-mono text-xs text-ink-muted">
          {COMPETITION} · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
