import { Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

export function Comunidad() {
  return (
    <SectionWrapper id="comunidad" className="bg-paper py-28 lg:py-44" inner="max-w-[760px] text-center">
      <Item>
        <Eyebrow>Hecho con la comunidad</Eyebrow>
        <h2 className="text-[clamp(1.9rem,3.5vw,2.75rem)] leading-[1.15]">Nadie conoce el río como quien lo ha visto crecer toda la vida.</h2>
      </Item>
      <Item>
        <p className="mt-10 text-left text-[1rem] leading-[1.9] text-ink-muted">
          Los umbrales de este sistema no salieron de una tabla. Salieron de conversaciones con la señora que
          sabe que cuando el agua tapa la tercera piedra del puente hay que subir los colchones. Con el pescador
          que lee el color de la corriente. Con el maestro que lleva treinta años anotando a qué hora suena el
          trueno arriba en la montaña.
        </p>
        <p className="mt-6 text-left text-[1rem] leading-[1.9] text-ink-muted">
          Por eso la alerta llega primero a los líderes comunitarios. Un vecino que golpea la puerta genera más
          confianza que un desconocido que instaló sensores en un poste. La tecnología mide. La comunidad decide.
        </p>
      </Item>
      <Item>
        <blockquote className="mt-14 border-l-2 border-aqua pl-6 text-left font-display text-[2rem] leading-[1.25] text-ink">
          El sensor no reemplaza la memoria del pueblo. La escucha.
        </blockquote>
      </Item>
    </SectionWrapper>
  );
}
