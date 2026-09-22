import { Code2, Briefcase } from "lucide-react";
import { TEAM } from "@/data/mock";
import { Card, Eyebrow, Item, SectionWrapper } from "@/components/ui/primitives";

function initials(name: string) {
  const [a, b] = name.split(" ");
  return `${a?.[0] ?? ""}${b?.[0] ?? ""}`;
}

export function Equipo() {
  return (
    <SectionWrapper id="equipo" className="bg-paper-2">
      <Item className="max-w-[640px]">
        <Eyebrow>Equipo</Eyebrow>
        <h2 className="text-section">Las personas detrás del prototipo.</h2>
      </Item>
      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TEAM.map((m) => (
          <Item key={m.name}>
            <Card>
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-aqua/30 bg-aqua-soft font-display text-xl text-aqua-deep">
                {initials(m.name)}
              </div>
              <h3 className="mt-6 text-[1.375rem]">{m.name}</h3>
              <p className="mt-1 text-[0.95rem] text-ink-muted">{m.role}</p>
              <div className="mt-6 flex gap-2">
                <a
                  href={m.github}
                  aria-label={`GitHub de ${m.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink-muted transition-colors hover:border-aqua/50 hover:text-aqua-deep"
                >
                  <Code2 size={16} />
                </a>
                <a
                  href={m.linkedin}
                  aria-label={`LinkedIn de ${m.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink-muted transition-colors hover:border-aqua/50 hover:text-aqua-deep"
                >
                  <Briefcase size={16} />
                </a>
              </div>
            </Card>
          </Item>
        ))}
      </div>
    </SectionWrapper>
  );
}
