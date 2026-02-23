import { useRef, useCallback, useMemo } from "react";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
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
  const normalizedScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return 1;
    const targetSize = 4;
    return targetSize / maxDim;
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
    <group scale={[normalizedScale, normalizedScale, normalizedScale]}>
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
