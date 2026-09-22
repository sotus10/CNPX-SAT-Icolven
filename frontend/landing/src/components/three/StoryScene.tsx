import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { P } from "@/data/palette";
import { RIVER_SERIES } from "@/data/mock";

/* ---------- positions ---------- */
const NODE = new THREE.Vector3(-14, 0, 6.3);
const RECEIVER = new THREE.Vector3(16, 0, -5);
const DESK = new THREE.Vector3(24, 0, -3);
const LINK_DIST = NODE.distanceTo(RECEIVER);

/* ---------- camera keyframes ---------- */
type Key = { p: number; pos: [number, number, number]; look: [number, number, number] };
const KEYS: Key[] = [
  { p: 0.0, pos: [-19.5, 4.2, 12.5], look: [-14, 1.6, 3.5] },
  { p: 0.14, pos: [-6, 14, 26], look: [-8, 0, 2] },
  { p: 0.26, pos: [1, 32, 44], look: [2, 0, -1] },
  { p: 0.38, pos: [1, 32, 44], look: [2, 0, -1] },
  { p: 0.46, pos: [13, 10, 12], look: [16, 1.5, -5] },
  { p: 0.54, pos: [18.2, 3.8, -1.2], look: [16, 3.3, -5] },
  { p: 0.64, pos: [21, 7, 8], look: [21, 1.5, -4] },
  { p: 0.78, pos: [24, 1.9, 1.2], look: [24, 1.45, -3] },
  { p: 1.0, pos: [24, 1.55, -0.3], look: [24, 1.45, -3] },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const { camera } = useThree();
  const pos = useMemo(() => new THREE.Vector3(...KEYS[0]!.pos), []);
  const look = useMemo(() => new THREE.Vector3(...KEYS[0]!.look), []);
  const tp = useMemo(() => new THREE.Vector3(), []);
  const tl = useMemo(() => new THREE.Vector3(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const p = progress.get();
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1]!.p) i++;
    const k0 = KEYS[i]!;
    const k1 = KEYS[i + 1]!;
    const t = smooth(seg(p, k0.p, k1.p));
    tp.copy(a.set(...k0.pos)).lerp(b.set(...k1.pos), t);
    tl.copy(a.set(...k0.look)).lerp(b.set(...k1.look), t);
    const k = 1 - Math.exp(-6 * dt);
    pos.lerp(tp, k);
    look.lerp(tl, k);
    camera.position.copy(pos);
    camera.lookAt(look);
  });
  return null;
}

/* ---------- terrain & river ---------- */
function Ground() {
  const river = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 4.2, 120, 1);
    const p = g.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setY(i, p.getY(i) + Math.sin(x * 0.12) * 2.2 + Math.sin(x * 0.05) * 1.5);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const bank = useMemo(() => {
    const g = new THREE.PlaneGeometry(120, 6.5, 120, 1);
    const p = g.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setY(i, p.getY(i) + Math.sin(x * 0.12) * 2.2 + Math.sin(x * 0.05) * 1.5);
    }
    return g;
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#E4E9E1" />
      </mesh>
      <mesh geometry={bank} rotation-x={-Math.PI / 2} position={[0, 0, 6]} receiveShadow>
        <meshStandardMaterial color="#D8D9CB" />
      </mesh>
      <mesh geometry={river} rotation-x={-Math.PI / 2} position={[0, 0.02, 6]}>
        <meshStandardMaterial color="#8FD3C6" roughness={0.25} metalness={0.05} />
      </mesh>
      {/* distant hills */}
      {(
        [
          [-40, -40, 22],
          [-5, -55, 30],
          [35, -45, 24],
          [60, -20, 18],
          [-60, -10, 16],
        ] as [number, number, number][]
      ).map(([x, z, r], i) => (
        <mesh key={i} position={[x, -r * 0.55, z]} scale={[r * 1.6, r, r]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={i % 2 ? "#CBD7C6" : "#D6DFCF"} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 6]} />
        <meshStandardMaterial color="#9A8B7A" />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <coneGeometry args={[0.7, 1.8, 7]} />
        <meshStandardMaterial color="#A7C4A0" />
      </mesh>
    </group>
  );
}

const TREES: [number, number, number][] = [
  [-20, 0, 1], [-17, 0, -2], [-9, 0, -1], [-6, 0, 11], [-11, 0, 13], [2, 0, 14], [6, 0, -3], [0, 0, -6],
  [-24, 0, 9], [10, 0, 13], [28, 0, 4], [30, 0, -10], [8, 0, -12], [-3, 0, -14], [20, 0, 6],
];

/* ---------- transmitter node ---------- */
function TransmitterNode() {
  return (
    <group position={NODE.toArray()}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 3.2, 8]} />
        <meshStandardMaterial color="#7C8582" />
      </mesh>
      {/* enclosure */}
      <mesh position={[0, 2.6, 0.02]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.26]} />
        <meshStandardMaterial color={P.ink} roughness={0.5} />
      </mesh>
      {/* antenna */}
      <mesh position={[0.16, 3.25, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.8, 6]} />
        <meshStandardMaterial color={P.ink} />
      </mesh>
      {/* solar panel */}
      <group position={[0, 3.3, -0.1]} rotation-x={-0.5}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.04, 0.5]} />
          <meshStandardMaterial color="#2F4F6B" metalness={0.4} roughness={0.3} />
        </mesh>
      </group>
      {/* sensor arm over the river */}
      <mesh position={[0, 2.1, -0.9]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.03, 0.03, 1.8, 6]} />
        <meshStandardMaterial color="#7C8582" />
      </mesh>
      <mesh position={[0, 2.0, -1.8]}>
        <cylinderGeometry args={[0.1, 0.1, 0.16, 12]} />
        <meshStandardMaterial color={P.aqua} emissive={P.aqua} emissiveIntensity={0.4} />
      </mesh>
      {/* light on enclosure */}
      <mesh position={[0.12, 2.75, 0.16]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color={P.aqua} emissive={P.aqua} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/* ---------- town ---------- */
function House({ position, rot = 0, w = 1.6, d = 1.4, h = 1.1, roof = "#C9A48B" }: { position: [number, number, number]; rot?: number | undefined; w?: number; d?: number; h?: number; roof?: string | undefined }) {
  return (
    <group position={position} rotation-y={rot}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#FBFBF7" />
      </mesh>
      <mesh position={[0, h + 0.38, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[Math.max(w, d) * 0.78, 0.76, 4]} />
        <meshStandardMaterial color={roof} />
      </mesh>
    </group>
  );
}

const HOUSES: { p: [number, number, number]; r?: number; roof?: string }[] = [
  { p: [12, 0, -9] }, { p: [14.2, 0, -9.2], roof: "#B98F76" }, { p: [18, 0, -9], roof: "#D3B39B" }, { p: [20.2, 0, -8.8] },
  { p: [11.6, 0, -1.2], roof: "#B98F76" }, { p: [13.8, 0, -1] }, { p: [18.4, 0, -1.4], roof: "#D3B39B" }, { p: [20.6, 0, -1.2], roof: "#B98F76" },
  { p: [10.2, 0, -5.4], r: Math.PI / 2 }, { p: [10.2, 0, -3.2], r: Math.PI / 2, roof: "#D3B39B" },
  { p: [12.6, 0, -13], roof: "#D3B39B" }, { p: [16.4, 0, -13.2] }, { p: [20.4, 0, -12.8], roof: "#B98F76" },
  { p: [9.6, 0, 2.4], r: 0.3 }, { p: [16, 0, 3.2], roof: "#B98F76" },
];

function Receiver() {
  return (
    <group position={RECEIVER.toArray()}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.11, 4, 8]} />
        <meshStandardMaterial color="#7C8582" />
      </mesh>
      <mesh position={[0, 3.3, 0.1]} castShadow>
        <boxGeometry args={[0.36, 0.44, 0.22]} />
        <meshStandardMaterial color={P.ink} roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.9, 6]} />
        <meshStandardMaterial color={P.ink} />
      </mesh>
      {/* siren horn */}
      <mesh position={[0.28, 3.85, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.16, 0.36, 12, 1, true]} />
        <meshStandardMaterial color="#C7CCC8" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.1, 3.4, 0.22]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color={P.aqua} emissive={P.aqua} emissiveIntensity={2} />
      </mesh>
      {/* park plaza */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[2.6, 40]} />
        <meshStandardMaterial color="#D9D4C4" />
      </mesh>
    </group>
  );
}

/* ---------- office & desk with monitor ---------- */
function drawDashboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#F6F6F3";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0B1F1D";
  ctx.font = "500 34px 'Instrument Serif', Georgia, serif";
  ctx.fillText("Cauce · Nivel del río", 48, 70);
  ctx.font = "18px 'JetBrains Mono', monospace";
  const chips = ["NODO ACTIVO", "BATERÍA 87 %", "RSSI −96 dBm", "HACE 4 MIN"];
  let x = 48;
  chips.forEach((c) => {
    const cw = ctx.measureText(c).width + 40;
    ctx.strokeStyle = "rgba(11,31,29,0.15)";
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(x, 92, cw, 36, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1F9C88";
    ctx.beginPath();
    ctx.arc(x + 18, 110, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5C716E";
    ctx.fillText(c, x + 32, 116);
    x += cw + 12;
  });
  // chart panel
  const cx = 48, cy = 160, cw = w - 96, ch = h - 210;
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "rgba(11,31,29,0.12)";
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 16);
  ctx.fill();
  ctx.stroke();
  const gx = cx + 40, gy = cy + 30, gw = cw - 70, gh = ch - 70;
  const yOf = (v: number) => gy + gh - ((v - 0.5) / 2.7) * gh;
  // thresholds
  [
    [1.2, P.moss, "verde"], [1.9, P.sun, "amarillo"], [2.4, P.amber, "naranja"], [2.9, P.ember, "rojo"],
  ].forEach(([v, c, l]) => {
    ctx.strokeStyle = c as string;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(gx, yOf(v as number));
    ctx.lineTo(gx + gw, yOf(v as number));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c as string;
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.fillText(l as string, gx + gw - 70, yOf(v as number) - 6);
  });
  // area + line
  const pts: [number, number][] = RIVER_SERIES.map((d, i) => [gx + (i / (RIVER_SERIES.length - 1)) * gw, yOf(d.level)]);
  const grad = ctx.createLinearGradient(0, gy, 0, gy + gh);
  grad.addColorStop(0, "rgba(31,156,136,0.3)");
  grad.addColorStop(1, "rgba(31,156,136,0)");
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  pts.forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.lineTo(gx + gw, gy + gh);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.strokeStyle = P.aqua;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineWidth = 1;
  // axis labels
  ctx.fillStyle = "#5C716E";
  ctx.font = "13px 'JetBrains Mono', monospace";
  ["00:00", "06:00", "12:00", "18:00", "23:30"].forEach((t, i) => ctx.fillText(t, gx + (i / 4) * gw - 18, gy + gh + 24));
}

function Office() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 640;
    const ctx = c.getContext("2d");
    if (ctx) drawDashboard(ctx, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  const x = DESK.x;
  const z = DESK.z;
  return (
    <group position={[x, 0, z]}>
      {/* floor slab + back wall */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0.5]} receiveShadow>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#EFEDE4" />
      </mesh>
      <mesh position={[0, 1.6, -2.4]} receiveShadow>
        <boxGeometry args={[5, 3.2, 0.2]} />
        <meshStandardMaterial color="#FBFBF7" />
      </mesh>
      <mesh position={[-2.4, 1.6, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3.2, 5]} />
        <meshStandardMaterial color="#F3F2EA" />
      </mesh>
      {/* desk */}
      <mesh position={[0, 0.72, -1]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.06, 1]} />
        <meshStandardMaterial color="#D6C4A8" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.0, 0.35, -1]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.9]} />
          <meshStandardMaterial color="#B8A78D" />
        </mesh>
      ))}
      {/* monitor */}
      <mesh position={[0, 0.85, -1.15]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial color="#454B48" />
      </mesh>
      <mesh position={[0, 1.45, -1.18]} castShadow>
        <boxGeometry args={[1.62, 1.02, 0.05]} />
        <meshStandardMaterial color="#2A2F2D" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.45, -1.15]}>
        <planeGeometry args={[1.54, 0.94]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* keyboard */}
      <mesh position={[0, 0.76, -0.7]}>
        <boxGeometry args={[0.7, 0.02, 0.22]} />
        <meshStandardMaterial color="#CFD3CF" />
      </mesh>
      {/* router with small light */}
      <mesh position={[0.8, 0.8, -1.3]}>
        <boxGeometry args={[0.28, 0.08, 0.18]} />
        <meshStandardMaterial color="#F0F0EA" />
      </mesh>
      <mesh position={[0.72, 0.85, -1.2]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color={P.aqua} emissive={P.aqua} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/* ---------- LoRa waves + WiFi arcs ---------- */
function LoraWaves({ progress }: { progress: MotionValue<number> }) {
  const rings = useRef<THREE.Mesh[]>([]);
  useFrame(() => {
    const p = progress.get();
    const t = seg(p, 0.16, 0.36);
    const fade = 1 - seg(p, 0.42, 0.5);
    rings.current.forEach((m, i) => {
      if (!m) return;
      const phase = i / rings.current.length;
      const local = t >= 1 ? 1 - phase * 0.12 : ((t * 1.3 + phase) % 1);
      const r = Math.max(0.2, local * LINK_DIST);
      m.scale.setScalar(r);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (t > 0 ? 0.8 * (1 - local * 0.5) : 0) * fade;
      m.visible = mat.opacity > 0.01;
    });
  });
  return (
    <group position={[NODE.x, 0.12, NODE.z]} rotation-x={-Math.PI / 2}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(el) => el && (rings.current[i] = el)}>
          <ringGeometry args={[0.975, 1, 128]} />
          <meshBasicMaterial color={P.aqua} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function ReceiverPulse({ progress }: { progress: MotionValue<number> }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const p = progress.get();
    const on = seg(p, 0.38, 0.42) * (1 - seg(p, 0.56, 0.6));
    const s = 0.3 + ((clock.elapsedTime * 0.6) % 1) * 1.2;
    ref.current.scale.setScalar(s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = on * (1 - (s - 0.3) / 1.2) * 0.7;
  });
  return (
    <mesh ref={ref} position={[RECEIVER.x, 4.4, RECEIVER.z]}>
      <ringGeometry args={[0.95, 1, 48]} />
      <meshBasicMaterial color={P.aqua} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function WifiArcs({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const mid = useMemo(() => RECEIVER.clone().lerp(DESK, 0.5).setY(3.8), []);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const p = progress.get();
    const on = seg(p, 0.56, 0.6) * (1 - seg(p, 0.72, 0.78));
    group.current.children.forEach((c, i) => {
      const m = c as THREE.Mesh;
      const wave = (Math.sin(clock.elapsedTime * 3 - i * 0.9) + 1) / 2;
      (m.material as THREE.MeshBasicMaterial).opacity = on * (0.25 + 0.6 * wave);
    });
    group.current.visible = on > 0.01;
  });
  return (
    <group ref={group} position={mid.toArray()} rotation-y={Math.PI / 4}>
      {[0.5, 0.9, 1.3].map((r, i) => (
        <mesh key={i}>
          <ringGeometry args={[r - 0.06, r, 48, 1, Math.PI * 0.3, Math.PI * 0.4]} />
          <meshBasicMaterial color={P.aqua} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- root ---------- */
export default function StoryScene({ progress }: { progress: MotionValue<number> }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: KEYS[0]!.pos, fov: 42, near: 0.1, far: 300 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={[P.bone]} />
      <fog attach="fog" args={[P.bone, 45, 130]} />
      <hemisphereLight args={["#FFFFFF", "#C8D2C6", 0.9]} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0004}
      />
      <Environment>
        <Lightformer intensity={1.5} position={[0, 8, 0]} scale={[20, 20, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={0.6} color="#CDEDE6" position={[-8, 3, -4]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>

      <CameraRig progress={progress} />
      <Ground />
      {TREES.map((t, i) => (
        <Tree key={i} position={t} s={0.8 + (i % 3) * 0.25} />
      ))}
      <TransmitterNode />
      {HOUSES.map((h, i) => (
        <House key={i} position={h.p} rot={h.r} roof={h.roof} />
      ))}
      <Receiver />
      <Office />
      <LoraWaves progress={progress} />
      <ReceiverPulse progress={progress} />
      <WifiArcs progress={progress} />
    </Canvas>
  );
}
