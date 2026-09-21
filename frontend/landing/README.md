# Río Seguro

You are a senior front-end engineer and art director. Build a single-page

marketing site for a real engineering project competing in Colombia's national

programming competition. The visual bar is a top-tier product launch page

(think Linear, Vercel, Arc, Raycast) — not a template. Every detail below is

intentional; follow it precisely.

═══════════════════════════════════════════════════════════════

PROJECT CONTEXT

═══════════════════════════════════════════════════════════════

Name: [PROJECT NAME]

What it is: an Early Warning System (Sistema de Alerta Temprana / SAT) for

river flooding, built for small rural towns in Colombia — the municipalities

that big-city systems like Medellín's SIATA never cover.

How it works: a solar-powered sensor node sits above the river and measures

water level with an ultrasonic sensor. It transmits over LoRa radio at 900 MHz

(license-free band, works with zero cell coverage, kilometers of range). A

receiver node in the town validates the reading, cross-checks it against free

satellite weather data, and pushes it to a web dashboard. When the river rises

past a threshold, a siren sounds in the town square and notifications go out —

first to community leaders, then to every resident's phone.

The human angle (important, it's the project's soul): the system is calibrated

with the knowledge of people who have lived beside that river their whole

lives. A neighbor is trusted more than strangers installing sensors on poles.

ALL USER-FACING COPY MUST BE IN COLOMBIAN SPANISH. Professional, confident,

restrained. No marketing hype, no exclamation marks, no emoji. Short sentences.

═══════════════════════════════════════════════════════════════

TECH STACK — use exactly this

═══════════════════════════════════════════════════════════════

- React 18 + Vite + TypeScript

- Tailwind CSS (extend the theme with the custom tokens below — do NOT use

  default Tailwind colors for anything branded)

- Framer Motion for all scroll and entrance animation

- Apache ECharts (echarts-for-react) for all data visualization

- lucide-react for icons only (never emoji as icons)

- No backend. All data comes from a single src/data/mock.ts file with

  realistic simulated values.

═══════════════════════════════════════════════════════════════

DESIGN TOKENS — define these in tailwind.config and use them everywhere

═══════════════════════════════════════════════════════════════

Colors:

  abyss     #04120F   page background, deepest layer

  depth     #071D1B   section background alternate

  surface   #0C2A28   card / panel background

  surface-2 #123734   elevated card, hover state

  hairline  rgba(94, 234, 212, 0.12)   all 1px borders

  aqua      #5EEAD4   primary accent

  aqua-deep #2DD4BF   accent hover / gradient partner

  aqua-glow rgba(94, 234, 212, 0.22)   glows and shadows

  ink       #E9F7F5   primary text

  ink-muted #93B8B4   secondary text

  amber     #F5A524   alert level: naranja

  ember     #EF4444   alert level: rojo

  moss      #4ADE80   alert level: verde

  sun       #FACC15   alert level: amarillo

Discipline rules:

- Aquamarine is an ACCENT, never a fill. Large aqua blocks look cheap.

  Use it on: thin borders, small text labels, icon strokes, glow halos,

  chart lines, one button.

- Absolutely no purple-to-blue gradients. No rainbow. No neon pink.

- Any gradient must stay inside the aqua family and be subtle

  (e.g. linear-gradient(135deg, #5EEAD4 0%, #2DD4BF 100%) on small elements

  only, never as a full section background).

- Every card: bg surface, 1px hairline border, border-radius 14px,

  and on hover lift 2px + border brightens to rgba(94,234,212,0.28).

  Transition 200ms ease-out.

Typography:

- Headings: "Space Grotesk" (Google Fonts), weight 500, letter-spacing -0.03em.

- Body: "Inter" (Google Fonts), weight 400, line-height 1.7.

- Data / numbers / technical labels: "JetBrains Mono", weight 400.

- Scale:

    hero h1        clamp(3.25rem, 8vw, 7rem), line-height 0.95

    section h2     clamp(2.25rem, 4.5vw, 3.75rem), line-height 1.05

    card h3        1.375rem

    body           1.0625rem

    eyebrow label  0.75rem, uppercase, letter-spacing 0.18em, color aqua,

                   font JetBrains Mono — put one above EVERY section heading

    giant stat     clamp(4rem, 12vw, 11rem), font Space Grotesk, weight 500,

                   letter-spacing -0.05em

═══════════════════════════════════════════════════════════════

GLOBAL EFFECTS — this is where the page earns its presence

═══════════════════════════════════════════════════════════════

1. BACKGROUND VIDEO (hero only)

   - Full-bleed <video> as the hero background: autoPlay, muted, loop,

     playsInline, preload="metadata", with a poster image fallback.

   - Source it from src/assets/river.mp4 — if the file is absent, fall back

     gracefully to an animated CSS gradient mesh in abyss/depth tones so the

     page NEVER looks broken.

   - Over the video, stack in this order:

       a) a dark scrim: linear-gradient(180deg, rgba(4,18,15,0.55) 0%,

          rgba(4,18,15,0.82) 55%, #04120F 100%)

       b) a fine grid overlay: 1px lines, 64px spacing, aqua at 4% opacity,

          masked with a radial-gradient so it fades out at the edges

       c) a soft aqua radial glow behind the headline, blur 120px, 18% opacity

   - Video is desaturated: filter: saturate(0.55) contrast(1.05).

   - On prefers-reduced-motion, freeze the video (do not autoplay) and show

     the poster.

2. PARALLAX

   - Use Framer Motion's useScroll + useTransform.

   - Hero: video layer moves at 0.3x scroll speed, headline at 0.7x, and the

     whole hero fades to 0 opacity between 0% and 60% of its own height.

   - Decorative background shapes in later sections drift at 0.15x–0.25x.

   - NEVER parallax body text or interactive elements — only background layers

     and decorative art. Readability wins.

3. GLASSMORPHISM

   - Navbar and the floating dashboard panels use:

       background: rgba(12,42,40,0.55);

       backdrop-filter: blur(20px) saturate(1.4);

       border: 1px solid rgba(94,234,212,0.14);

       box-shadow: 0 8px 32px rgba(0,0,0,0.4),

                   inset 0 1px 0 rgba(255,255,255,0.05);

   - Use glass on at most 3 elements in the whole page. Overused glass reads

     as amateur.

4. SCROLL CHOREOGRAPHY

   - Every section: opacity 0→1 and translateY 28px→0, duration 600ms,

     ease [0.22, 1, 0.36, 1], triggered at viewport amount 0.25, once: true.

   - Children within a section stagger by 80ms.

   - Section dividers: a 1px hairline that animates its width from 0% to 100%

     (900ms) when it scrolls into view.

   - A 2px aqua scroll-progress bar pinned to the very top of the viewport.

   - All giant numbers COUNT UP from 0 to their value over 1.6s when they

     enter the viewport (ease-out, and respect reduced-motion by snapping

     straight to the final value).

5. CURSOR & MICRO-INTERACTION (desktop only, ≥1024px)

   - A subtle aqua glow follows the cursor over the hero (a 340px radial

     gradient at 10% opacity, lagging with a spring).

   - Buttons: on hover, the aqua glow shadow expands from 0 to

     0 0 28px aqua-glow over 200ms.

6. REDUCED MOTION

   - Wrap everything in a useReducedMotion() check. When it's on: no parallax,

     no counters animating, no cursor glow, video paused, entrances become

     instant opacity fades of 150ms. The page must remain fully legible and

     complete.

═══════════════════════════════════════════════════════════════

PAGE STRUCTURE — build these sections in this exact order

═══════════════════════════════════════════════════════════════

NAVBAR (fixed)

  Glass. Left: wordmark. Center: anchor links — Problema · Cómo funciona ·

  Dashboard · Tecnología · Equipo. Right: a single aqua outline button.

  Starts transparent over the hero; after 80px of scroll it gains the glass

  background and shrinks height from 88px to 64px (250ms transition).

  Mobile: full-screen overlay menu with staggered link entrance.

1. HERO (min-height 100svh)

  Background video stack as specified above.

  Eyebrow: "SISTEMA DE ALERTA TEMPRANA · LORA 900 MHZ"

  H1, two lines, second line in aqua: about anticipating the river's rise —

  write something with weight, not a feature list.

  Subhead, max-width 620px, ink-muted: one sentence on bringing early warning

  to the towns that big-city systems never reached.

  Two buttons: primary solid aqua with dark text ("Ver cómo funciona"),

  secondary ghost with hairline border ("Conocer el dashboard").

  Bottom of hero: an animated SVG waveform representing a rising river level —

  a smooth path that undulates slowly (8s loop), aqua stroke 1.5px, with a

  faint aqua gradient fill beneath it fading to transparent.

  Bottom-left: a small scroll indicator that fades out on first scroll.

2. STAT BAND (immediately below hero, no gap)

  Four GIANT NUMBERS in a row, separated by vertical hairlines, each with a

  mono caption below in ink-muted. Numbers count up on entry.

    "+10 km"   → alcance del enlace LoRa sin infraestructura

    "10 min"   → intervalo de medición del nivel del río

    "0 $"      → costo de conectividad mensual por nodo

    "24/7"     → operación autónoma con energía solar

  On mobile: 2×2 grid.

3. EL PROBLEMA

  Two-column layout. Left: eyebrow + h2 + two paragraphs stating plainly that

  Colombia's flood monitoring is concentrated in major cities while small

  riverside municipalities are left without instrumentation — and that

  minutes of warning are the difference between losing belongings and losing

  lives. Right: three stacked stat cards with LARGE numbers and a source line

  in mono beneath each. Leave the figures as visible placeholders

  ("[DATO — fuente: DANE/UNGRD]") so the team fills in verified data.

4. CÓMO FUNCIONA

  Four steps laid out horizontally on desktop (vertical timeline on mobile),

  connected by a hairline whose aqua fill animates left-to-right as the

  section scrolls into view.

  Each step: a large mono step number (01–04), an icon in an aqua-tinted

  rounded square, a title, and two lines of description.

    01 Medición — ultrasonic sensor above the river, every 10 minutes

    02 Transmisión — LoRa 900 MHz, no cell coverage required

    03 Validación — the receiver node cross-checks the reading against free

       satellite weather data before escalating

    04 Alerta — local siren plus notifications to community leaders and

       residents

  Add a caption noting the satellite cross-check exists to eliminate false

  alarms — a system that cries wolf stops being trusted.

5. NIVELES DE ALERTA

  Four cards in a stepped/ascending layout (each card sits progressively

  higher, suggesting a rising river). Colors: moss, sun, amber, ember —

  used ONLY as a thin top border and a small status dot, never as the card

  background. Each card: level name, the condition that triggers it, and who

  gets notified at that level.

6. DASHBOARD EN VIVO  ← the centerpiece, give it the most effort

  Full-width dark section on abyss with the fine grid overlay.

  Render a realistic control-panel mockup inside a glass container:

    - Top strip: four compact status chips (mono text) — nodo activo,

      batería 87%, RSSI −96 dBm, última lectura hace 4 min.

    - Main chart (ECharts line, ~60% width): river level over the last 24 h.

      Smooth line in aqua with an area gradient fading to transparent below.

      Add horizontal markLine thresholds for the four alert levels in their

      colors, with labels. Dark theme: transparent background, axis lines at

      rgba(255,255,255,0.08), axis labels in JetBrains Mono at ink-muted.

      Tooltip styled as glass, not the ECharts default.

    - Secondary chart (~40%): ECharts bar chart of satellite precipitation

      (mm/h) over the same window, bars in aqua-deep with rounded top corners.

    - Below: three mini node cards, each with a tiny sparkline.

  Generate 48 realistic data points showing a gradual rise that crosses the

  "amarillo" threshold near the end — it should look like a real event.

  IMPORTANT: make all ECharts responsive (resize observer) and use a merged

  dark theme so nothing renders with white default backgrounds.

7. TECNOLOGÍA

  A 6-card bento-style grid (uneven cell sizes, not a uniform 3×2). One large

  feature cell for LoRa 900 MHz with a small animated concentric-ring SVG

  suggesting radio propagation. The other cells: ESP32, sensor ultrasónico,

  alimentación solar autónoma, validación satelital, carcasas IP68.

  Each card: icon, title, one-sentence explanation, and a mono spec line.

8. HECHO CON LA COMUNIDAD

  Deliberate tonal shift — this section breathes. Wider margins, larger line

  height, smaller type scale, almost no ornament. Centered, max-width 760px.

  A short piece of prose about calibrating the system with the knowledge of

  people who have watched that river their whole lives, and about community

  leaders receiving the alert first. One pull-quote in Space Grotesk at

  2rem with an aqua vertical bar on its left.

9. EQUIPO

  Cards with initials in an aqua-tinted circle (no photos), name, role, and

  optional GitHub/LinkedIn icon links.

10. CIERRE / CTA

  Centered, generous vertical padding, a soft aqua radial glow behind it.

  H2 inviting municipalities and organizations to get in touch, plus a single

  primary button.

FOOTER

  Minimal. Wordmark, the competition name, year, and a hairline above.

═══════════════════════════════════════════════════════════════

QUALITY BAR — verify before you finish

═══════════════════════════════════════════════════════════════

- Mobile-first. Test mentally at 375px, 768px, 1440px. Nothing overflows

  horizontally. Giant numbers scale down, they don't clip.

- Section vertical padding: 128px desktop / 80px mobile. Content max-width

  1200px, centered, with 24px gutters.

- Contrast passes WCAG AA for all text. ink on abyss, ink-muted on surface.

- Semantic HTML: header, nav, main, section, footer. One h1 only.

  Descriptive aria-labels on icon-only buttons. Visible focus rings in aqua.

- Video is the only heavy asset; everything else is SVG or CSS.

  Lazy-mount ECharts components below the fold.

- Clean component structure: one file per section under src/components/,

  shared primitives (Button, Card, Eyebrow, GiantNumber, SectionWrapper) under

  src/components/ui/, mock data in src/data/mock.ts.

- No lorem ipsum anywhere. Write real Spanish copy for every single string.

- No console errors, no unused imports, no TODO comments left behind.


Le puedes agregar algo mas interactivo, como un efecto scroll con un modelo 3d, usando three.js y alguna libreria para mejorar el scroll. Como unas especie de representacion en 3d del sistema de conectividad del prototipo:

Primero comenzamos con el rio y el nodo transmisor, de ahi hacemos un zoom out hasta el pueblo, mostrando un texto que diga LoRa connection y unas ondas que representen la conexión. Estas ondas se detienen sobre el pueblo, se hace un zoom in a un poste donde esta el nodo receptor, el cual recibe la conexion, se muestra como una barra de carga de cargando datos, de ahi dice datos enviados a base de datos por wifi, entonces alli usamos el zoom out y vamos a un computador con un zoom in y mostramos el dashboard en el, estan son las fotos del dashboard. Todo este proceso debe avanzar por medio de scroll. Cambiemos la pagina a colores mas claros, un fondo f6f6f6 o un color tirando mas al color hueso muy blanco. Fuentes elegantes y que todo el proceso sea explicado por texto

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ac029ca0-367e-45c1-ae29-021d9800c334).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
