import { motion, useScroll } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-aqua"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
