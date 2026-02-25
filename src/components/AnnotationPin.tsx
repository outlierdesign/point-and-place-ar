import { useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

export interface Annotation {
  id: string;
  position: [number, number, number];
  label: string;
  description: string;
  media_url?: string;
  video_url?: string;
}

interface AnnotationPinProps {
  annotation: Annotation;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const getVideoEmbed = (url: string) => {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return url;
};

export default function AnnotationPin({
  annotation,
  selected,
  onSelect,
}: AnnotationPinProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const goldBright = "#A7782B";
  const goldDim = "#7a5720";

  const linePoints: [number, number, number][] = [[0, 0, 0], [0, -0.1, 0]];

  const handlePinClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect(annotation.id);
    setExpanded((v) => !v);
  };

  return (
    <group position={[annotation.position[0], annotation.position[1] + 0.1, annotation.position[2]]}>
      {/* Sphere pin */}
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        onClick={handlePinClick}
      >
        <sphereGeometry args={[0.025, 16, 16]} />
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
        <ringGeometry args={[0.035, 0.045, 32]} />
        <meshBasicMaterial
          color={selected ? goldBright : goldDim}
          transparent
          opacity={selected ? 0.85 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical pole down to surface */}
      <Line
        points={linePoints}
        color={goldDim}
        lineWidth={1}
        transparent
        opacity={0.5}
      />

      {/* Marker point (inverted cone at pole base) */}
      <mesh position={[0, -0.1, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.012, 0.03, 8]} />
        <meshStandardMaterial color={goldDim} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Collapsed badge — always visible, compact */}
      <Html
        position={[0.08, 0.06, 0]}
        distanceFactor={5}
        zIndexRange={[100, 0]}
        occlude={false}
      >
        <div
          onClick={(e) => { e.stopPropagation(); onSelect(annotation.id); setExpanded((v) => !v); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            background: "rgba(15, 25, 18, 0.82)",
            border: `1px solid ${expanded ? goldBright : goldDim}`,
            borderRadius: 3,
            padding: "2px 6px",
            cursor: "pointer",
            userSelect: "none",
            backdropFilter: "blur(4px)",
            whiteSpace: "nowrap",
            transition: "border-color 0.15s",
          }}
        >
          <span style={{
            color: "#C9954E",
            fontWeight: 600,
            fontSize: "clamp(8px, 1vw, 12px)",
            fontFamily: "'Red Hat Display', sans-serif",
            letterSpacing: "0.03em",
            maxWidth: "clamp(100px, 12vw, 160px)",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {annotation.label}
          </span>
          <span style={{
            color: expanded ? "#C9954E" : "#7a5720",
            fontSize: 8,
            lineHeight: 1,
            fontWeight: 700,
            marginLeft: 1,
          }}>
            {expanded ? "×" : "+"}
          </span>
        </div>
      </Html>

      {/* Expanded card — only when expanded */}
      {expanded && (
        <Html
          position={[0.12, 0.14, 0]}
          distanceFactor={5}
          zIndexRange={[200, 0]}
          occlude={false}
        >
          <div
            style={{
              background: "rgba(12, 22, 15, 0.92)",
              border: "1px solid #A7782B60",
              borderRadius: 4,
              padding: "7px 8px",
              maxWidth: "clamp(160px, 20vw, 260px)",
              minWidth: "clamp(120px, 14vw, 180px)",
              backdropFilter: "blur(6px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              userSelect: "none",
            }}
          >
            {/* Header row: label + close */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4, marginBottom: 4 }}>
              <div style={{
                color: "#C9954E",
                fontWeight: 600,
                fontSize: "clamp(10px, 1.2vw, 14px)",
                fontFamily: "'Red Hat Display', sans-serif",
                wordBreak: "break-word",
                whiteSpace: "normal",
                lineHeight: 1.3,
                flex: 1,
              }}>
                {annotation.label}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7a5720",
                  fontSize: 12,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: "0 1px",
                  flexShrink: 0,
                }}
              >×</button>
            </div>

            {annotation.description && (
              <div style={{
                color: "hsl(42 30% 60%)",
                fontSize: "clamp(9px, 1vw, 13px)",
                wordBreak: "break-word",
                whiteSpace: "normal",
                lineHeight: 1.4,
                marginBottom: (annotation.media_url || annotation.video_url) ? 5 : 0,
              }}>
                {annotation.description}
              </div>
            )}

            {annotation.media_url && (
              <div style={{ marginTop: 4 }}>
                <img
                  src={annotation.media_url}
                  alt="Annotation media"
                  style={{
                    width: "100%",
                    maxHeight: 80,
                    objectFit: "cover",
                    cursor: "pointer",
                    border: "1px solid #7a572080",
                    display: "block",
                    borderRadius: 2,
                  }}
                  onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                />
              </div>
            )}

            {annotation.video_url && (
              <button
                onClick={(e) => { e.stopPropagation(); setVideoOpen(true); }}
                style={{
                  marginTop: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(167,120,43,0.18)",
                  border: "1px solid #A7782B60",
                  color: "#C9954E",
                  fontFamily: "'Red Hat Display', sans-serif",
                  fontSize: "clamp(8px, 0.9vw, 12px)",
                  padding: "3px 7px",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  width: "100%",
                  justifyContent: "center",
                  borderRadius: 2,
                }}
              >
                ▶ Play Video
              </button>
            )}

            {/* Photo Lightbox portal */}
            {lightboxOpen && annotation.media_url && ReactDOM.createPortal(
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(10,20,14,0.92)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(6px)",
                }}
                onClick={() => setLightboxOpen(false)}
              >
                <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
                  <img
                    src={annotation.media_url}
                    alt="Full size"
                    style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", display: "block" }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => setLightboxOpen(false)}
                    style={{
                      position: "absolute", top: -12, right: -12,
                      background: "#192C20", border: "1px solid #A7782B",
                      color: "#C9954E", width: 28, height: 28,
                      cursor: "pointer", fontSize: 14, lineHeight: 1,
                    }}
                  >×</button>
                </div>
              </div>,
              document.body
            )}

            {/* Video Lightbox portal */}
            {videoOpen && annotation.video_url && ReactDOM.createPortal(
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(10,20,14,0.92)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(6px)",
                }}
                onClick={() => setVideoOpen(false)}
              >
                <div style={{ position: "relative", width: "80vw", maxWidth: 900 }}>
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                    <iframe
                      src={getVideoEmbed(annotation.video_url)}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                      allow="autoplay; fullscreen"
                      title="Video"
                    />
                  </div>
                  <button
                    onClick={() => setVideoOpen(false)}
                    style={{
                      position: "absolute", top: -12, right: -12,
                      background: "#192C20", border: "1px solid #A7782B",
                      color: "#C9954E", width: 28, height: 28,
                      cursor: "pointer", fontSize: 14, lineHeight: 1,
                    }}
                  >×</button>
                </div>
              </div>,
              document.body
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
