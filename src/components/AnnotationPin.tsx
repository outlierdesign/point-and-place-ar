import { useRef, useState } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

export interface Annotation {
  id: string;
  position: [number, number, number];
  label: string;
  description: string;
}

interface AnnotationPinProps {
  annotation: Annotation;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function AnnotationPin({
  annotation,
  selected,
  onSelect,
}: AnnotationPinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Gold: #A7782B  dimmed: #7a5720
  const goldBright = "#A7782B";
  const goldDim = "#7a5720";

  const linePoints: [number, number, number][] = [[0, 0, 0], [0, -0.15, 0]];

  return (
    <group position={annotation.position}>
      {/* Sphere pin */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onSelect(annotation.id); }}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color={selected ? goldBright : hovered ? goldBright : goldDim}
          emissive={selected ? goldBright : hovered ? goldDim : "#3d2b0d"}
          emissiveIntensity={selected ? 1.2 : hovered ? 0.8 : 0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Outer ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.055, 0.07, 32]} />
        <meshBasicMaterial
          color={selected ? goldBright : goldDim}
          transparent
          opacity={selected ? 0.85 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical line down to surface */}
      <Line
        points={linePoints}
        color={goldDim}
        lineWidth={1}
        transparent
        opacity={0.5}
      />

      {/* HTML Label */}
      <Html
        position={[0.1, 0.08, 0]}
        distanceFactor={6}
        zIndexRange={[100, 0]}
        occlude={false}
      >
        <div
          className={`annotation-label fade-in ${selected ? "selected" : ""}`}
          onClick={(e) => { e.stopPropagation(); onSelect(annotation.id); }}
          style={{ userSelect: "none" }}
        >
          <div style={{ color: "#C9954E", fontWeight: 600, marginBottom: 2, fontFamily: "'Red Hat Display', sans-serif" }}>
            #{annotation.id.slice(-3).toUpperCase()} {annotation.label}
          </div>
          {annotation.description && (
            <div style={{ color: "hsl(42 30% 68%)", fontSize: 10, maxWidth: 160 }}>
              {annotation.description}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
