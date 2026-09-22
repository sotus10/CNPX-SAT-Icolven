import { motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ---------- Button ---------- */
type ButtonProps = ComponentProps<"a"> & { variant?: "primary" | "ghost" | "outline" };

export function Button({ variant = "primary", className, children, ...rest }: ButtonProps) {
  return (
    <a
      className={cn(
        "btn-glow inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] font-medium",
        variant === "primary" && "bg-ink text-bone hover:bg-aqua-deep",
        variant === "ghost" && "border border-hairline bg-paper/40 text-ink hover:border-aqua/50",
        variant === "outline" && "h-10 border border-aqua-deep/50 px-5 text-aqua-deep hover:bg-aqua-soft",
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("card-base p-7", className)} {...rest}>
      {children}
    </div>
  );
}

/* ---------- Eyebrow ---------- */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow mb-5", className)}>{children}</p>;
}

/* ---------- Section wrapper with choreography ---------- */
export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

type SectionProps = {
  id?: string;
  className?: string;
  inner?: string;
  children: ReactNode;
  as?: "section" | "div";
};

export function SectionWrapper({ id, className, inner, children }: SectionProps) {
  const reduce = useReducedMotion();
  return (
    <section id={id} className={cn("relative scroll-mt-16 py-20 lg:py-32", className)}>
      <motion.div
        className={cn("mx-auto w-full max-w-[1200px] px-6", inner)}
        variants={reduce ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } } : stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
      >
        {children}
      </motion.div>
    </section>
  );
}

export function Item({ className, children }: { className?: string | undefined; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? {} : fadeUp}>
      {children}
    </motion.div>
  );
}

/* ---------- Animated hairline divider ---------- */
export function Divider({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("mx-auto max-w-[1200px] px-6", className)} aria-hidden>
      <motion.div
        className="h-px bg-hairline"
        initial={{ width: reduce ? "100%" : "0%" }}
        whileInView={{ width: "100%" }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, ease: EASE }}
      />
    </div>
  );
}

/* ---------- Giant count-up number ---------- */
type GiantProps = { value: number; prefix?: string | undefined; suffix?: string | undefined; className?: string | undefined };

export function GiantNumber({ value, prefix = "", suffix = "", className }: GiantProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1600, bounce: 0 });
  const text = useTransform(spring, (v) => `${prefix}${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      spring.jump(value);
    } else {
      mv.set(value);
    }
  }, [inView, reduce, value, mv, spring]);

  return (
    <span ref={ref} className={cn("text-giant text-ink", className)}>
      <motion.span>{text}</motion.span>
    </span>
  );
}
