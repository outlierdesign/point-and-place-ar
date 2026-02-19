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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const goldBright = "#A7782B";
  const goldDim = "#7a5720";

  const linePoints: [number, number, number][] = [[0, 0, 0], [0, -0.15, 0]];

  return (
    <>
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

        {/* HTML Label — no lightboxes here */}
        <Html
          position={[0.1, 0.08, 0]}
          distanceFactor={6}
          zIndexRange={[100, 0]}
          occlude={false}
        >
          <div
            className={`annotation-label fade-in ${selected ? "selected" : ""}`}
            onClick={(e) => { e.stopPropagation(); onSelect(annotation.id); }}
            style={{ userSelect: "none", maxWidth: 200, minWidth: 120 }}
          >
            {/* Label */}
            <div style={{
              color: "#C9954E",
              fontWeight: 600,
              marginBottom: 4,
              fontFamily: "'Red Hat Display', sans-serif",
              wordBreak: "break-word",
              whiteSpace: "normal",
              lineHeight: 1.3,
            }}>
              {annotation.label}
            </div>

            {/* Description */}
            {annotation.description && (
              <div style={{
                color: "hsl(42 30% 68%)",
                fontSize: 10,
                wordBreak: "break-word",
                whiteSpace: "normal",
                lineHeight: 1.4,
                marginBottom: (annotation.media_url || annotation.video_url) ? 6 : 0,
              }}>
                {annotation.description}
              </div>
            )}

            {/* Thumbnail preview */}
            {annotation.media_url && (
              <div style={{ marginTop: 4 }}>
                <img
                  src={annotation.media_url}
                  alt="Annotation media"
                  style={{
                    width: "100%",
                    maxHeight: 90,
                    objectFit: "cover",
                    cursor: "pointer",
                    border: "1px solid #7a572080",
                    display: "block",
                  }}
                  onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                />
              </div>
            )}

            {/* Video link button */}
            {annotation.video_url && (
              <button
                onClick={(e) => { e.stopPropagation(); setVideoOpen(true); }}
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(167,120,43,0.18)",
                  border: "1px solid #A7782B60",
                  color: "#C9954E",
                  fontFamily: "'Red Hat Display', sans-serif",
                  fontSize: 9,
                  padding: "3px 7px",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                ▶ Play Video
              </button>
            )}
          </div>
        </Html>
      </group>

      {/* Photo Lightbox — portalled to document.body */}
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

      {/* Video Lightbox — portalled to document.body */}
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
    </>
  );
}
