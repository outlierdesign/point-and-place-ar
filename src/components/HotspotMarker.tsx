import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface HotspotMarkerProps {
  position: [number, number, number];
  label: string;
  modelId: string;
  onExplore: (modelId: string) => void;
}

export default function HotspotMarker({
  position,
  label,
  modelId,
  onExplore,
}: HotspotMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
    }
    if (ringRef.current) {
      const pulse = (Math.sin(t * 1.5) + 1) / 2;
      ringRef.current.scale.setScalar(1.2 + pulse * 0.8);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.6 - pulse * 0.5;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 32]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
        onClick={(e) => { e.stopPropagation(); onExplore(modelId); }}
      >
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={hovered ? "#ffb347" : "#00d4ff"}
          emissive={hovered ? "#ffb347" : "#00d4ff"}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
        <meshStandardMaterial color="#00a8cc" metalness={0.5} roughness={0.3} />
      </mesh>

      <Html
        position={[0, 0.35, 0]}
        center
        distanceFactor={5}
        style={{ pointerEvents: "auto", transition: "opacity 0.2s", opacity: 1 }}
      >
        <div
          onClick={(e) => { e.stopPropagation(); onExplore(modelId); }}
          onMouseEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
          onMouseLeave={() => { setHovered(false); document.body.style.cursor = "auto"; }}
          style={{
            pointerEvents: "auto",
            background: hovered ? "rgba(0,24,36,0.95)" : "rgba(0,24,36,0.8)",
            border: hovered ? "1px solid rgba(255,179,71,0.6)" : "1px solid rgba(0,212,255,0.3)",
            borderRadius: 6, padding: "6px 12px", fontFamily: "monospace", fontSize: 11,
            color: "#e0e0e0", whiteSpace: "nowrap", textAlign: "center", cursor: "pointer",
            backdropFilter: "blur(8px)",
            boxShadow: hovered ? "0 0 20px rgba(255,179,71,0.3)" : "0 0 12px rgba(0,212,255,0.2)",
          }}
        >
          <div style={{
            pointerEvents: "auto", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em",
            textTransform: "uppercase", color: hovered ? "#ffb347" : "#00d4ff",
            marginBottom: hovered ? 4 : 0,
          }}>
            {label}
          </div>
          {hovered && (
            <button
              onClick={(e) => { e.stopPropagation(); onExplore(modelId); }}
              style={{
                pointerEvents: "auto", background: "rgba(255,179,71,0.15)",
                border: "1px solid rgba(255,179,71,0.4)", borderRadius: 4,
                padding: "3px 10px", fontFamily: "monospace", fontSize: 10,
                fontWeight: 700, letterSpacing: "0.1em", color: "#ffb347",
                cursor: "pointer", textTransform: "uppercase",
              }}
            >
              Explore \u2192
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}
