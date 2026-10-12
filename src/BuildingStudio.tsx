import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, Sky, SoftShadows } from "@react-three/drei";
import * as THREE from "three";
import {
  Camera, Check, Compass, Download, Expand, Leaf, Minus, Plus, RotateCcw,
  SlidersHorizontal, Sparkles,
} from "lucide-react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type View = "default" | "front" | "side" | "rear" | "aerial";
type MaterialName = "Warm plaster" | "Travertine" | "Charcoal concrete" | "Sandstone";
type WindowName = "Full height" | "Framed" | "Ribbon";
type BalconyName = "Glass" | "Metal" | "None";
type RoofName = "Flat parapet" | "Pergola" | "Pitched";
type GardenName = "Lush" | "Minimal" | "Courtyard";
type Quality = "High" | "Performance";

export type BuildingConfig = {
  floors: number; width: number; depth: number; material: MaterialName; windows: WindowName;
  balcony: BalconyName; roof: RoofName; garden: GardenName; quality: Quality;
};

const defaults: BuildingConfig = {
  floors: 2, width: 48, depth: 38, material: "Warm plaster", windows: "Full height",
  balcony: "Glass", roof: "Pergola", garden: "Lush", quality: "High",
};

const palettes: Record<MaterialName, { wall: string; accent: string; roughness: number }> = {
  "Warm plaster": { wall: "#ded7ca", accent: "#8b7761", roughness: .78 },
  Travertine: { wall: "#d8c7a7", accent: "#8c795d", roughness: .66 },
  "Charcoal concrete": { wall: "#6d716e", accent: "#302f2c", roughness: .86 },
  Sandstone: { wall: "#cbb18d", accent: "#705d49", roughness: .82 },
};

function Box({ position, scale, color, roughness = .7, metalness = 0, castShadow = true, receiveShadow = true, children }: {
  position: [number, number, number]; scale: [number, number, number]; color: string;
  roughness?: number; metalness?: number; castShadow?: boolean; receiveShadow?: boolean; children?: React.ReactNode;
}) {
  return <mesh position={position} scale={scale} castShadow={castShadow} receiveShadow={receiveShadow}>
    <boxGeometry /><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />{children}
  </mesh>;
}

function Window({ x, y, z, width, height, side = false, style }: {
  x: number; y: number; z: number; width: number; height: number; side?: boolean; style: WindowName;
}) {
  const frame = style === "Framed" ? .14 : .07;
  const w = style === "Ribbon" ? width * 1.25 : width;
  return <group position={[x, y, z]} rotation={[0, side ? Math.PI / 2 : 0, 0]}>
    <Box position={[0, 0, 0]} scale={[w + frame * 2, height + frame * 2, .13]} color="#252d2d" roughness={.38} metalness={.55} />
    <mesh position={[0, 0, -.075]} scale={[w, height, .07]} castShadow>
      <boxGeometry />
      <meshPhysicalMaterial color="#729197" roughness={.08} metalness={.15} transmission={.18} thickness={.4} envMapIntensity={1.5} />
    </mesh>
    <Box position={[0, 0, -.16]} scale={[.035, height, .035]} color="#151c1d" metalness={.7} roughness={.25} />
    <Box position={[0, -height / 2 - .13, .03]} scale={[w + .12, .09, .28]} color="#b7afa0" roughness={.76} />
  </group>;
}

function Balcony({ width, y, frontZ, type }: { width: number; y: number; frontZ: number; type: BalconyName }) {
  if (type === "None") return null;
  const railColor = type === "Glass" ? "#7da4a7" : "#242d2c";
  return <group position={[width * .16, y, frontZ]}>
    <Box position={[0, -.73, .45]} scale={[width * .46, .14, 1.18]} color="#c9c4b9" roughness={.7} />
    <Box position={[0, -.09, 1.45]} scale={[width * .45, .48, .045]} color={railColor} roughness={type === "Glass" ? .1 : .35} metalness={type === "Glass" ? .1 : .7} />
    {type === "Metal" && Array.from({ length: 9 }).map((_, i) =>
      <Box key={i} position={[-width * .4 + i * width * .1, -.08, 1.48]} scale={[.025, .52, .035]} color="#1e2928" metalness={.8} roughness={.2} />)}
    <Box position={[-width * .45, -.1, .76]} scale={[.045, .5, .72]} color="#313a38" metalness={.6} roughness={.3} />
    <Box position={[width * .45, -.1, .76]} scale={[.045, .5, .72]} color="#313a38" metalness={.6} roughness={.3} />
  </group>;
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[.16, .25, 2.8, 9]} /><meshStandardMaterial color="#66513a" roughness={1} /></mesh>
    {[[0, 3.1, 0], [.55, 2.8, .1], [-.45, 2.7, -.2], [.1, 3.7, .05]].map((p, i) =>
      <mesh key={i} position={p as [number, number, number]} castShadow><dodecahedronGeometry args={[.85, 1]} /><meshStandardMaterial color={i % 2 ? "#416f4e" : "#507e55"} roughness={.95} /></mesh>)}
  </group>;
}

function Shrubs({ width, depth, lush }: { width: number; depth: number; lush: boolean }) {
  const count = lush ? 18 : 9;
  return <group>{Array.from({ length: count }).map((_, i) => {
    const side = i % 2 ? 1 : -1;
    const x = side * (width / 2 + 2 + (i % 3) * .45);
    const z = -depth / 2 + 1 + (i * 1.7) % (depth + 4);
    return <mesh key={i} position={[x, .42, z]} scale={[.65, .55 + (i % 3) * .1, .65]} castShadow>
      <dodecahedronGeometry args={[.62, 1]} /><meshStandardMaterial color={i % 3 ? "#47784d" : "#6e8b45"} roughness={1} />
    </mesh>;
  })}</group>;
}

function Neighbourhood() {
  return <group>
    {[[-20, -10, -19], [19, -10, -20], [-23, -10, 8]].map((p, i) =>
      <group position={[p[0], 0, p[2]]} scale={.72} key={i}>
        <Box position={[0, 2, 0]} scale={[8, 4, 6]} color={i === 1 ? "#c4bba9" : "#b8b8ae"} roughness={.92} />
        <mesh position={[0, 4.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[7, 2.5, 4]} /><meshStandardMaterial color="#575953" roughness={.9} /></mesh>
        <Window x={-2} y={2} z={3.03} width={1.3} height={1.5} style="Framed" /><Window x={2} y={2} z={3.03} width={1.3} height={1.5} style="Framed" />
      </group>)}
  </group>;
}

function House({ config }: { config: BuildingConfig }) {
  const width = config.width / 4.6;
  const depth = config.depth / 4.6;
  const floorHeight = 3.05;
  const height = config.floors * floorHeight;
  const palette = palettes[config.material];
  const windowHeight = config.windows === "Full height" ? 1.95 : config.windows === "Ribbon" ? 1.05 : 1.55;
  const columns = Math.max(2, Math.floor(width / 3.2));
  const frontZ = depth / 2 + .09;
  return <group>
    <Box position={[0, .12, 0]} scale={[width + .9, .24, depth + .9]} color="#aaa69e" roughness={.92} />
    <Box position={[0, height / 2 + .25, 0]} scale={[width, height, depth]} color={palette.wall} roughness={palette.roughness} />
    <Box position={[-width * .35, height / 2 + .3, frontZ + .12]} scale={[width * .27, height + .5, .22]} color={palette.accent} roughness={.9} />
    {Array.from({ length: config.floors }).map((_, floor) => {
      const y = floor * floorHeight + floorHeight * .54;
      return <group key={floor}>
        <Box position={[0, floor * floorHeight + .18, 0]} scale={[width + .2, .2, depth + .2]} color="#b4aea2" roughness={.8} />
        {Array.from({ length: columns }).map((__, col) => {
          const x = -width * .3 + col * (width * .58 / Math.max(1, columns - 1));
          return <Window key={col} x={x} y={y} z={frontZ + .05} width={Math.min(1.35, width / (columns + 1))} height={windowHeight} style={config.windows} />;
        })}
        {Array.from({ length: Math.max(2, Math.floor(depth / 3.5)) }).map((__, col) =>
          <Window key={`side-${col}`} x={width / 2 + .06} y={y} z={-depth * .25 + col * depth * .34} width={1.15} height={windowHeight * .9} side style={config.windows} />)}
        {floor > 0 && <Balcony width={width} y={y} frontZ={frontZ} type={config.balcony} />}
      </group>;
    })}
    <group position={[-width * .34, 1.2, frontZ + .38]}>
      <Box position={[0, 0, 0]} scale={[1.55, 2.35, .2]} color="#3d2d23" roughness={.52} />
      <Box position={[0, 0, -.13]} scale={[1.28, 2.08, .08]} color="#5a3d2c" roughness={.46} />
      <mesh position={[.45, 0, .1]}><sphereGeometry args={[.07, 16, 16]} /><meshStandardMaterial color="#cda85b" metalness={.8} roughness={.2} /></mesh>
      <pointLight position={[0, 1.7, 1]} intensity={4} distance={5} color="#ffd9a1" />
    </group>
    <Box position={[width * .43, height * .55, frontZ + .3]} scale={[.16, height * .86, .25]} color="#272f2d" metalness={.55} roughness={.35} />
    {config.roof === "Flat parapet" && <>
      <Box position={[0, height + .52, -depth / 2]} scale={[width + .4, .8, .25]} color={palette.wall} roughness={palette.roughness} />
      <Box position={[-width / 2, height + .52, 0]} scale={[.25, .8, depth]} color={palette.wall} roughness={palette.roughness} />
    </>}
    {config.roof === "Pergola" && <group position={[width * .15, height + 1.05, 0]}>
      {Array.from({ length: 7 }).map((_, i) => <Box key={i} position={[-width * .33 + i * width * .11, .4, 0]} scale={[.12, .12, depth * .82]} color="#5d4433" roughness={.58} />)}
      <Box position={[-width * .38, -.35, 0]} scale={[.16, 1.5, depth * .82]} color="#554334" roughness={.6} />
      <Box position={[width * .38, -.35, 0]} scale={[.16, 1.5, depth * .82]} color="#554334" roughness={.6} />
    </group>}
    {config.roof === "Pitched" && <mesh position={[0, height + 1.18, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[Math.max(width, depth) * .72, 2.45, 4]} /><meshStandardMaterial color="#343a38" roughness={.65} metalness={.2} />
    </mesh>}
    <Box position={[-width * .18, .09, frontZ + 4.5]} scale={[2.4, .18, 8]} color="#9c9991" roughness={.96} />
    <Box position={[width * .3, .1, frontZ + 4.5]} scale={[width * .28, .2, 8]} color="#6e7470" roughness={.88} />
    <Shrubs width={width} depth={depth} lush={config.garden === "Lush"} />
    {config.garden !== "Minimal" && <>
      <Tree position={[-width / 2 - 4, 0, -depth / 2]} scale={config.garden === "Lush" ? 1.2 : .9} />
      <Tree position={[width / 2 + 4, 0, depth / 2 - 1]} scale={.85} />
      <group position={[width / 2 + 2.1, .3, frontZ + 2]}>
        {Array.from({ length: 5 }).map((_, i) => <mesh key={i} position={[0, 0, i * 1.1]} castShadow><sphereGeometry args={[.38, 12, 8]} /><meshStandardMaterial color="#365f3f" roughness={1} /></mesh>)}
      </group>
    </>}
    <mesh position={[-width * .42, 2.45, frontZ + .65]}><sphereGeometry args={[.11, 16, 16]} /><meshStandardMaterial color="#fff1c6" emissive="#ffd896" emissiveIntensity={3} /></mesh>
  </group>;
}

function CameraRig({ view, revision }: { view: View; revision: number }) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    const points: Record<View, [number, number, number]> = {
      default: [18, 13, 20], front: [0, 7, 25], side: [25, 7, 0],
      rear: [0, 7, -25], aerial: [17, 25, 18],
    };
    camera.position.set(...points[view]);
    controls.current?.target.set(0, 4, 0);
    controls.current?.update();
  }, [camera, view, revision]);
  useFrame(() => controls.current?.update());
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.07} minDistance={12} maxDistance={52} maxPolarAngle={Math.PI / 2.03} target={[0, 4, 0]} />;
}

function Scene({ config, view, cameraRevision }: { config: BuildingConfig; view: View; cameraRevision: number }) {
  return <>
    {config.quality === "High" && <SoftShadows size={22} samples={12} focus={.55} />}
    <Sky distance={450000} sunPosition={[75, 42, 30]} turbidity={5} rayleigh={1.2} mieCoefficient={.006} mieDirectionalG={.82} />
    <fog attach="fog" args={["#d9e7e6", 35, 82]} />
    <hemisphereLight args={["#d8edff", "#63765f", 1.6]} />
    <directionalLight position={[16, 24, 14]} intensity={3.2} castShadow shadow-mapSize={[config.quality === "High" ? 2048 : 1024, config.quality === "High" ? 2048 : 1024]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={28} shadow-camera-bottom={-28} shadow-bias={-.00015} />
    <House config={config} />
    <Neighbourhood />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.04, 0]} receiveShadow>
      <planeGeometry args={[110, 110]} /><meshStandardMaterial color="#668262" roughness={1} />
    </mesh>
    <Box position={[0, .03, 18]} scale={[110, .12, 9]} color="#454a49" roughness={.98} />
    <Box position={[0, .11, 13.65]} scale={[110, .08, .23]} color="#d7d4c8" roughness={1} />
    {config.quality === "High" && <ContactShadows position={[0, .06, 0]} opacity={.48} scale={35} blur={2.8} far={18} resolution={1024} color="#1f3028" />}
    <CameraRig view={view} revision={cameraRevision} />
  </>;
}

function Loading() {
  return <div className="viewer-loading"><span /><strong>Preparing architectural scene</strong><small>Optimizing materials and lighting…</small></div>;
}

export default function BuildingStudio() {
  const [config, setConfig] = useState<BuildingConfig>(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem("landai-building") || "{}") }; } catch { return defaults; }
  });
  const [view, setView] = useState<View>("default");
  const [cameraRevision, setCameraRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const viewer = useRef<HTMLDivElement>(null);
  useEffect(() => { localStorage.setItem("landai-building", JSON.stringify(config)); }, [config]);
  const update = <K extends keyof BuildingConfig>(key: K, value: BuildingConfig[K]) => setConfig(current => ({ ...current, [key]: value }));
  const chooseView = (next: View) => { setView(next); setCameraRevision(current => current + 1); };
  const reset = () => { setConfig(defaults); chooseView("default"); };
  const snapshot = () => {
    if (!canvas.current) return;
    const link = document.createElement("a"); link.download = "landai-concept.png"; link.href = canvas.current.toDataURL("image/png"); link.click();
  };
  const fullscreen = async () => {
    try { if (!document.fullscreenElement) await viewer.current?.requestFullscreen(); else await document.exitFullscreen(); } catch { setError("Fullscreen is not available in this browser."); }
  };
  return <div className="arch-studio">
    <div className="studio-bar">
      <div><p className="eyebrow">Real-time architectural visualization</p><h2>Shape your future home</h2><p className="subtext">A conceptual visualization using live dimensions from your construction plan.</p></div>
      <div><button className="studio-action" onClick={reset}><RotateCcw /> Reset</button><button className="studio-action primary" onClick={snapshot}><Download /> Snapshot</button></div>
    </div>
    <div className="arch-workspace">
      <aside className="config-panel">
        <div className="panel-heading"><SlidersHorizontal /><div><strong>Building configuration</strong><small>Changes update the model live</small></div></div>
        <label><span>Floors <b>{config.floors}</b></span><div className="stepper"><button onClick={() => update("floors", Math.max(1, config.floors - 1))}><Minus /></button><strong>{config.floors}</strong><button onClick={() => update("floors", Math.min(5, config.floors + 1))}><Plus /></button></div></label>
        <label><span>Building width <b>{config.width} ft</b></span><input type="range" min="30" max="70" step="2" value={config.width} onChange={e => update("width", +e.target.value)} /></label>
        <label><span>Building depth <b>{config.depth} ft</b></span><input type="range" min="26" max="60" step="2" value={config.depth} onChange={e => update("depth", +e.target.value)} /></label>
        <label><span>Exterior material</span><select value={config.material} onChange={e => update("material", e.target.value as MaterialName)}>{Object.keys(palettes).map(v => <option key={v}>{v}</option>)}</select></label>
        <div className="material-swatches">{Object.entries(palettes).map(([name, p]) => <button title={name} aria-label={name} className={config.material === name ? "active" : ""} style={{ backgroundColor: p.wall }} onClick={() => update("material", name as MaterialName)} key={name}>{config.material === name && <Check />}</button>)}</div>
        <label><span>Window style</span><select value={config.windows} onChange={e => update("windows", e.target.value as WindowName)}><option>Full height</option><option>Framed</option><option>Ribbon</option></select></label>
        <div className="config-row"><label><span>Balconies</span><select value={config.balcony} onChange={e => update("balcony", e.target.value as BalconyName)}><option>Glass</option><option>Metal</option><option>None</option></select></label><label><span>Roof</span><select value={config.roof} onChange={e => update("roof", e.target.value as RoofName)}><option>Flat parapet</option><option>Pergola</option><option>Pitched</option></select></label></div>
        <label><span>Landscaping</span><select value={config.garden} onChange={e => update("garden", e.target.value as GardenName)}><option>Lush</option><option>Minimal</option><option>Courtyard</option></select></label>
        <label className="quality-toggle"><span><Sparkles /> Render quality</span><button onClick={() => update("quality", config.quality === "High" ? "Performance" : "High")}><i className={config.quality === "High" ? "on" : ""} /><b>{config.quality}</b></button></label>
      </aside>
      <div className="viewport-shell" ref={viewer}>
        {!ready && !error && <Loading />}
        {error && <div className="viewer-error"><strong>3D preview unavailable</strong><span>{error}</span><button onClick={() => location.reload()}>Reload viewer</button></div>}
        <Canvas
          shadows camera={{ position: [18, 13, 20], fov: 42, near: .1, far: 180 }}
          dpr={config.quality === "High" ? [1, 1.75] : 1}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            canvas.current = gl.domElement; gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08;
            gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
            setReady(true);
          }}
          onError={() => setError("WebGL could not initialize. Try Performance quality or enable hardware acceleration.")}
        >
          <Suspense fallback={null}><Scene config={config} view={view} cameraRevision={cameraRevision} /></Suspense>
        </Canvas>
        <div className="view-presets">{(["front","side","rear","aerial"] as View[]).map(v => <button className={view === v ? "active" : ""} onClick={() => chooseView(v)} key={v}>{v}</button>)}</div>
        <div className="viewer-tools"><button title="Reset camera" onClick={() => chooseView("default")}><RotateCcw /></button><button title="Capture image" onClick={snapshot}><Camera /></button><button title="Fullscreen" onClick={fullscreen}><Expand /></button></div>
        <div className="concept-label"><span><Compass /></span><p><strong>Conceptual visualization</strong><small>Drag to orbit • Scroll to zoom • Right-drag to pan</small></p></div>
        <div className="scene-stats"><div><span>Floors</span><strong>{config.floors}</strong></div><div><span>Footprint</span><strong>{config.width} × {config.depth} ft</strong></div><div><span>Exterior</span><strong>{config.material}</strong></div><div><span>Approx. area</span><strong>{(config.width * config.depth * config.floors).toLocaleString()} sq ft</strong></div></div>
      </div>
    </div>
    <div className="planning-link"><Leaf /><p><strong>Connected to construction planning</strong><span>Your {config.width * config.depth * config.floors} sq ft concept is saved locally and available when planning your build estimate.</span></p><span>{config.quality} rendering</span></div>
  </div>;
}
