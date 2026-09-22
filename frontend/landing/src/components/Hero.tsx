import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import poster from "@/assets/river-poster.jpg";
import { Button, EASE } from "@/components/ui/primitives";

const WAVE_A =
  "M0 90 C 120 60, 240 120, 360 90 S 600 60, 720 90 S 960 120, 1080 90 S 1320 60, 1440 90 L1440 200 L0 200 Z";
const WAVE_B =
  "M0 80 C 120 110, 240 50, 360 80 S 600 120, 720 80 S 960 40, 1080 80 S 1320 120, 1440 80 L1440 200 L0 200 Z";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [videoOk, setVideoOk] = useState(true);
  const [desktop, setDesktop] = useState(false);
  const [scrolledOnce, setScrolledOnce] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "30%"]);
  const headY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "70%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    const onScroll = () => window.scrollY > 10 && setScrolledOnce(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <motion.section
      ref={ref}
      style={{ opacity }}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden"
      onPointerMove={(e) => {
        if (!desktop || reduce) return;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        mx.set(-1000);
        my.set(-1000);
      }}
    >
      {/* Background layer (parallax 0.3x) */}
      <motion.div style={{ y: videoY }} className="absolute inset-0" aria-hidden>
        {videoOk ? (
          <video
            className="h-full w-full object-cover [filter:saturate(0.55)_contrast(1.05)]"
            autoPlay={!reduce}
            muted
            loop
            playsInline
            preload="metadata"
            poster={poster}
            onError={() => setVideoOk(false)}
          >
            <source src="/river.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="relative h-full w-full gradient-mesh">
            <img
              src={poster}
              alt=""
              width={1920}
              height={1088}
              className="h-full w-full object-cover opacity-80 [filter:saturate(0.55)_contrast(1.05)]"
            />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(246,246,243,0.25) 0%, rgba(246,246,243,0.7) 55%, #F6F6F3 100%)",
          }}
        />
        <div className="absolute inset-0 grid-overlay" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua opacity-[0.18] blur-[120px]" />
      </motion.div>

      {/* Cursor glow */}
      {desktop && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute z-[1] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: sx,
            top: sy,
            background: "radial-gradient(circle, rgba(31,156,136,0.22) 0%, rgba(31,156,136,0) 70%)",
          }}
        />
      )}

      {/* Content (parallax 0.7x) */}
      <motion.div style={{ y: headY }} className="relative z-[2] mx-auto w-full max-w-[1200px] px-6 pb-40 pt-40">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
        >
          Sistema de alerta temprana · LoRa 900 MHz
        </motion.p>
        <motion.h1
          className="text-hero mt-6 max-w-[14ch] text-ink"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        >
          El río avisa antes.
          <br />
          <span className="italic text-aqua-deep">Ahora alguien escucha.</span>
        </motion.h1>
        <motion.p
          className="mt-8 max-w-[620px] text-lg text-ink-muted"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        >
          Alerta temprana de crecientes para los municipios ribereños que los sistemas de las grandes ciudades
          nunca alcanzaron.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
        >
          <Button href="#como-funciona">Ver cómo funciona</Button>
          <Button href="#dashboard" variant="ghost">
            Conocer el dashboard
          </Button>
        </motion.div>
      </motion.div>

      {/* Waveform */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[160px] w-full"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="waveFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1F9C88" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#1F9C88" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={WAVE_A}
          fill="url(#waveFill)"
          stroke="#1F9C88"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          animate={reduce ? {} : { d: [WAVE_A, WAVE_B, WAVE_A] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {/* Scroll indicator */}
      <motion.div
        aria-hidden
        className="absolute bottom-8 left-6 z-[2] flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted"
        animate={{ opacity: scrolledOnce ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <ArrowDown size={14} className="text-aqua-deep" />
        Desplázate
      </motion.div>
    </motion.section>
  );
}
