import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV_LINKS, PROJECT_NAME } from "@/data/mock";
import { Button, EASE } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const DASHBOARD_LOGIN_URL = "http://localhost:3000/login";

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 80));

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div
        className={cn(
          "mx-auto flex items-center justify-between px-6 transition-[height,background-color,box-shadow,border-color] duration-250 ease-out",
          scrolled ? "glass h-16 lg:mt-3 lg:max-w-[1200px] lg:rounded-full" : "h-[88px] border border-transparent",
        )}
      >
        <a href="#" className="font-display text-2xl tracking-tight text-ink" aria-label={`${PROJECT_NAME}, inicio`}>
          {PROJECT_NAME}
        </a>
        <nav aria-label="Secciones" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden lg:block">
          <div className="flex items-center gap-3">
            <Button variant="outline" href={DASHBOARD_LOGIN_URL}>
              Login
            </Button>
            <Button variant="outline" href="#contacto">
              Hablemos
            </Button>
          </div>
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink lg:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30 flex flex-col justify-center bg-bone px-8 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <nav aria-label="Secciones móvil">
              <ul className="space-y-6">
                {NAV_LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.5, ease: EASE }}
                  >
                    <a href={l.href} onClick={() => setOpen(false)} className="font-display text-4xl text-ink">
                      {l.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="mt-12">
              <div className="flex flex-wrap gap-3">
                <Button href={DASHBOARD_LOGIN_URL} onClick={() => setOpen(false)}>
                  Login
                </Button>
                <Button href="#contacto" onClick={() => setOpen(false)}>
                  Hablemos
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
