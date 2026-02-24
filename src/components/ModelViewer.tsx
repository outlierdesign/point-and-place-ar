import { useRef, useCallback, useMemo, useEffect } from "react";
import { Canvas, useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  ContactShadows,
  useGLTF,
  Bounds,
} from "@react-three/drei";
import * as THREE from "three";
import AnnotationPin, { Annotation } from "./AnnotationPin";

function SceneModel({
  url,
  isPlacingMode,
  onPlace,
}: {
  url: string;
  isPlacingMode: boolean;
  onPlace: (pos: [number, number, number]) => void;
}) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  // Compute a uniform scale so the model fits within ~4 world units
  const { normalizedScale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim === 0 ? 1 : 4 / maxDim;
    // Place model bottom on the grid plane (y = -1.2)
    const yOff = -box.min.y * scale - 1.2;
    return { normalizedScale: scale, yOffset: yOff };
  }, [scene]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isPlacingMode) return;
      e.stopPropagation();
      const p = e.point;
      onPlace([
        parseFloat(p.x.toFixed(3)),
        parseFloat(p.y.toFixed(3)),
        parseFloat(p.z.toFixed(3)),
      ]);
    },
    [isPlacingMode, onPlace]
  );

  return (
    <group scale={[normalizedScale, normalizedScale, normalizedScale]} position={[0, yOffset, 0]}>
      <group ref={ref} onClick={handleClick}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function SceneBackground() {
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

function CursorSetter({ isPlacingMode }: { isPlacingMode: boolean }) {
  const { gl } = useThree();
  gl.domElement.style.cursor = isPlacingMode ? "crosshair" : "grab";
  return null;
}

function KeyboardControls({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const velocity = useRef(new THREE.Vector3());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        keys.current.add(e.key);
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useFrame((_, delta) => {
    const accel = 8;
    const damping = 0.88;
    const target = new THREE.Vector3();

    if (enabled && keys.current.size > 0) {
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

  return null;
}

interface ModelViewerProps {
  modelUrl: string;
  modelKey: string;
  annotations: Annotation[];
  selectedId: string | null;
  isPlacingMode: boolean;
  onPlace: (pos: [number, number, number]) => void;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

export default function ModelViewer({
  modelUrl,
  modelKey,
  annotations,
  selectedId,
  isPlacingMode,
  onPlace,
  onSelectAnnotation,
  onDeleteAnnotation,
}: ModelViewerProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2, 6], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "transparent" }}
    >
      <SceneBackground />
      <CursorSetter isPlacingMode={isPlacingMode} />
      <KeyboardControls enabled={!isPlacingMode} />

      <Bounds fit clip observe margin={1.5}>
        <SceneModel
          key={modelKey}
          url={modelUrl}
          isPlacingMode={isPlacingMode}
          onPlace={onPlace}
        />
      </Bounds>

      {annotations.map((ann) => (
        <AnnotationPin
          key={ann.id}
          annotation={ann}
          selected={selectedId === ann.id}
          onSelect={onSelectAnnotation}
          onDelete={onDeleteAnnotation}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={0.2}
        maxDistance={200}
        enabled={!isPlacingMode}
      />
    </Canvas>
  );
}
