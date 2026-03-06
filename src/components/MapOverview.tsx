import { useRef, useCallback, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  ContactShadows,
  useGLTF,
  Bounds,
} from "@react-three/drei";
import * as THREE from "three";
import HotspotMarker from "./HotspotMarker";
import { MapHotspot } from "@/hooks/useMapHotspots";

/* ── Terrain Model ── */
function TerrainModel({
  url,
  hotspots,
  onExplore,
  onDebugClick,
}: {
  url: string;
  hotspots: MapHotspot[];
  onExplore: (modelId: string) => void;
  onDebugClick: (pos: [number, number, number]) => void;
}) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  const { normalizedScale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim === 0 ? 1 : 4 / maxDim;
    const yOff = -box.min.y * scale - 1.2;
    return { normalizedScale: scale, yOffset: yOff };
  }, [scene]);

  const handleClick = useCallback(
    (e: any) => {
      if (!e.shiftKey) return;
      e.stopPropagation();
      if (!groupRef.current) return;
      const local = groupRef.current.worldToLocal(e.point.clone());
      const pos: [number, number, number] = [
        parseFloat(local.x.toFixed(3)),
        parseFloat(local.y.toFixed(3)),
        parseFloat(local.z.toFixed(3)),
      ];
      onDebugClick(pos);
    },
    [onDebugClick]
  );

  return (
    <group
      ref={groupRef}
      scale={[normalizedScale, normalizedScale, normalizedScale]}
      position={[0, yOffset, 0]}
    >
      <group onClick={handleClick}>
        <primitive object={scene} />
      </group>

      {hotspots.map((hs) => (
        <HotspotMarker
          key={hs.modelId}
          position={hs.position}
          label={hs.label}
          modelId={hs.modelId}
          onExplore={onExplore}
        />
      ))}
    </group>
  );
}

/* ── Background (matches ModelViewer style) ── */
function MapBackground() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, 3, -3]} intensity={0.8} color="#00d4ff" />
      <pointLight position={[5, -2, 5]} intensity={0.4} color="#0080ff" />
      <Grid
        position={[0, -1.2, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.4}
        cellColor="#0d3344"
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor="#00a8cc"
        fadeDistance={25}
        fadeStrength={1.5}
        infiniteGrid
      />
      <ContactShadows
        position={[0, -1.19, 0]}
        opacity={0.5}
        scale={15}
        blur={2}
        far={3}
        color="#001824"
      />
      <Environment preset="night" />
    </>
  );
}

/* ── Keyboard Controls ── */
function KeyboardNav() {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const velocity = useRef(new THREE.Vector3());

  const onDown = useCallback((e: KeyboardEvent) => {
    if (
      ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
    ) {
      keys.current.add(e.key);
    }
  }, []);
  const onUp = useCallback((e: KeyboardEvent) => keys.current.delete(e.key), []);

  useFrame((_, delta) => {
    const accel = 8;
    const damping = 0.88;
    const target = new THREE.Vector3();
    if (keys.current.size > 0) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      if (keys.current.has("w") || keys.current.has("ArrowUp")) target.addScaledVector(forward, 1);
      if (keys.current.has("s") || keys.current.has("ArrowDown")) target.addScaledVector(forward, -1);
      if (keys.current.has("a") || keys.current.has("ArrowLeft")) target.addScaledVector(right, -1);
      if (keys.current.has("d") || keys.current.has("ArrowRight")) target.addScaledVector(right, 1);
      if (target.lengthSq() > 0) target.normalize();
      velocity.current.addScaledVector(target, accel * delta);
    }
    velocity.current.multiplyScalar(damping);
    if (velocity.current.lengthSq() > 0.00001) {
      camera.position.addScaledVector(velocity.current, delta);
    }
  });

  // Attach listeners
  useThree(({ gl }) => {
    const el = gl.domElement.ownerDocument;
    el.addEventListener("keydown", onDown);
    el.addEventListener("keyup", onUp);
    return () => {
      el.removeEventListener("keydown", onDown);
      el.removeEventListener("keyup", onUp);
    };
  });

  return null;
}

/* ── Main Export ── */
interface MapOverviewProps {
  overviewUrl: string;
  hotspots: MapHotspot[];
  onExplore: (modelId: string) => void;
}

export default function MapOverview({
  overviewUrl,
  hotspots,
  onExplore,
}: MapOverviewProps) {
  const handleDebugClick = useCallback((pos: [number, number, number]) => {
    console.log(
      "%c[MAP DEBUG] Shift+Click position:",
      "color:#ffb347;font-weight:bold",
      JSON.stringify(pos)
    );
    // Copy to clipboard for easy pasting into HOTSPOT_POSITIONS
    navigator.clipboard?.writeText(JSON.stringify(pos)).catch(() => {});
  }, []);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 8], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "transparent", cursor: "grab" }}
    >
      <MapBackground />
      <KeyboardNav />
      <Bounds fit clip observe margin={1.8}>
        <TerrainModel
          url={overviewUrl}
          hotspots={hotspots}
          onExplore={onExplore}
          onDebugClick={handleDebugClick}
        />
      </Bounds>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={0.5}
        maxDistance={200}
      />
    </Canvas>
  );
}
