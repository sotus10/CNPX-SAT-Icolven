import { STATS } from "@/data/mock";
import { GiantNumber, Item, SectionWrapper } from "@/components/ui/primitives";

export function StatBand() {
  return (
    <SectionWrapper className="!py-0 border-y border-hairline bg-paper-2" inner="!px-0">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Item
            key={s.caption}
            className={`flex flex-col items-start px-6 py-12 lg:px-10 lg:py-20 ${i % 2 === 1 ? "border-l border-hairline" : ""} ${i >= 2 ? "border-t border-hairline lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <GiantNumber value={s.value} prefix={s.prefix} suffix={s.suffix} className="!text-[clamp(2.75rem,6vw,5.5rem)]" />
            <p className="mt-4 font-mono text-xs leading-relaxed text-ink-muted">{s.caption}</p>
          </Item>
        ))}
      </div>
    </SectionWrapper>
  );
}
