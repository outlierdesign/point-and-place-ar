import { useRef, useState, useCallback } from "react";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  ContactShadows,
  useGLTF,
  Center,
} from "@react-three/drei";
import * as THREE from "three";
import AnnotationPin, { Annotation } from "./AnnotationPin";

// Demo model — Damaged Helmet from Three.js examples
const MODEL_URL =
  "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf";

function DemoModel({
  isPlacingMode,
  onPlace,
}: {
  isPlacingMode: boolean;
  onPlace: (pos: [number, number, number]) => void;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const ref = useRef<THREE.Group>(null);

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
    <Center>
      <group ref={ref} onClick={handleClick}>
        <primitive
          object={scene}
          style={{ cursor: isPlacingMode ? "crosshair" : "auto" }}
        />
      </group>
    </Center>
  );
}

function SceneBackground() {
  return (
    <>
      {/* Ambient + directional light */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, 3, -3]} intensity={0.8} color="#00d4ff" />
      <pointLight position={[5, -2, 5]} intensity={0.4} color="#0080ff" />

      {/* Grid floor */}
      <Grid
        position={[0, -1.2, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.4}
        cellColor="#0d3344"
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor="#00a8cc"
        fadeDistance={12}
        fadeStrength={1.5}
        infiniteGrid
      />

      <ContactShadows
        position={[0, -1.19, 0]}
        opacity={0.5}
        scale={6}
        blur={2}
        far={3}
        color="#001824"
      />

      <Environment preset="night" />
    </>
  );
}

function ARRaycaster({
  isPlacingMode,
  onPlace,
}: {
  isPlacingMode: boolean;
  onPlace: (pos: [number, number, number]) => void;
}) {
  const { gl } = useThree();
  gl.domElement.style.cursor = isPlacingMode ? "crosshair" : "grab";
  return null;
}

interface ModelViewerProps {
  annotations: Annotation[];
  selectedId: string | null;
  isPlacingMode: boolean;
  onPlace: (pos: [number, number, number]) => void;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

export default function ModelViewer({
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
      camera={{ position: [0, 0.5, 3], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "transparent" }}
    >
      <SceneBackground />
      <ARRaycaster isPlacingMode={isPlacingMode} onPlace={onPlace} />

      <DemoModel isPlacingMode={isPlacingMode} onPlace={onPlace} />

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
        minDistance={1}
        maxDistance={10}
        enabled={!isPlacingMode}
      />
    </Canvas>
  );
}

// Preload the model
useGLTF.preload(MODEL_URL);
