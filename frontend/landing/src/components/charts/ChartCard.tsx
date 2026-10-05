import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChartCardProps = {
  title: string;
  caption?: string | undefined;
  loading?: boolean | undefined;
  height?: number | undefined;
  className?: string | undefined;
  children?: ReactNode;
};

/** Tarjeta con el mismo encabezado y esqueleto que usa el resto de gráficas del sitio. */
export function ChartCard({
  title,
  caption,
  loading = false,
  height = 260,
  className,
  children,
}: ChartCardProps) {
  return (
    <div className={cn("rounded-xl border border-hairline bg-paper/60 p-4", className)}>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">{title}</p>
      {caption ? <p className="mt-1 text-[0.7rem] text-ink-muted">{caption}</p> : null}
      <div className="mt-3">
        {loading ? (
          <div
            className="animate-pulse rounded-lg bg-aqua-soft"
            style={{ height }}
            aria-hidden
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}