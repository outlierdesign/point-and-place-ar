import { useRef, useCallback, useMemo, useEffect, useState } from "react";
import { Canvas, useThree, useFrame, ThreeEvent, RootState } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  ContactShadows,
  Bounds,
} from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";
import AnnotationPin, { Annotation } from "./AnnotationPin";

/* ── Camera zoom helper (lives inside the Canvas) ── */
function CameraZoomer({
  target,
  onComplete,
}: {
  target: { position: [number, number, number]; groupMatrix: THREE.Matrix4 } | null;
  onComplete: () => void;
}) {
  const { camera } = useThree();
  const progress = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3());
  const active = useRef(false);

  useEffect(() => {
    if (!target) { active.current = false; return; }
    // Convert annotation local position → world position
    const worldPos = new THREE.Vector3(...target.position).applyMatrix4(target.groupMatrix);
    startPos.current.copy(camera.position);
    // Aim for a point partway toward the annotation (70% of the way)
    endPos.current.lerpVectors(camera.position, worldPos, 0.7);
    progress.current = 0;
    active.current = true;
  }, [target, camera]);

  useFrame((_, delta) => {
    if (!active.current) return;
    progress.current += delta / 1.2; // 1.2s duration
    if (progress.current >= 1) {
      active.current = false;
      onComplete();
      return;
    }
    // Ease-in-out
    const t = progress.current < 0.5
      ? 2 * progress.current * progress.current
      : 1 - Math.pow(-2 * progress.current + 2, 2) / 2;
    camera.position.lerpVectors(startPos.current, endPos.current, t);
  });

  return null;
}

function SceneModel({
  url,
  originalUrl,
  arrayBuffer,
  isPlacingMode,
  onPlace,
  annotations,
  selectedId,
  showLabels = true,
  onSelectAnnotation,
  onDeleteAnnotation,
  onExploreLinked,
  onVideoPlay,
  linkedModelIds,
  onGroupMatrix,
}: {
  url: string;
  originalUrl?: string;
  arrayBuffer?: ArrayBuffer | null;
  isPlacingMode: boolean;
  onPlace: (pos: [number, number, number]) => void;
  annotations: Annotation[];
  selectedId: string | null;
  showLabels?: boolean;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onExploreLinked?: (modelId: string, position: [number, number, number]) => void;
  onVideoPlay?: (videoUrl: string) => void;
  linkedModelIds?: Set<string>;
  onGroupMatrix?: (m: THREE.Matrix4) => void;
}) {
  const [scene, setScene] = useState<THREE.Group | null>(null);

  // Parse GLB from ArrayBuffer (bypasses CSP fetch restrictions on blob: URLs)
  // Falls back to URL loader if no ArrayBuffer is provided
  useEffect(() => {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();

    // Use locally-bundled Draco decoder (CSP blocks gstatic.com on proxied domains)
    const base = window.location.pathname.startsWith('/viewer') ? '/viewer' : '';
    dracoLoader.setDecoderPath(`${base}/draco/`);
    loader.setDRACOLoader(dracoLoader);

    if (originalUrl && !originalUrl.startsWith("blob:")) {
      const basePath = originalUrl.substring(0, originalUrl.lastIndexOf("/") + 1);
      loader.setResourcePath(basePath);
    }

    if (arrayBuffer) {
      // Temporarily disable createImageBitmap so GLTFParser uses TextureLoader
      // (img.src = blob:) instead of ImageBitmapLoader (fetch(blob:) — blocked by CSP)
      const origCIB = (window as any).createImageBitmap;
      (window as any).createImageBitmap = undefined;

      loader.parse(arrayBuffer, "", (gltf) => {
        (window as any).createImageBitmap = origCIB;
        setScene(gltf.scene);
      }, (err) => {
        (window as any).createImageBitmap = origCIB;
        console.error("[SceneModel] Failed to parse GLB from buffer:", err);
      });
    } else {
      // Fallback: load from URL (works on direct Vercel, local dev)
      loader.load(url, (gltf) => {
        setScene(gltf.scene);
      }, undefined, (err) => {
        console.error("[SceneModel] Failed to load GLB from URL:", err);
      });
    }

    return () => {
      dracoLoader.dispose();
    };
  }, [url, originalUrl, arrayBuffer]);
  const groupRef = useRef<THREE.Group>(null);

  const { normalizedScale, yOffset, pinScale } = useMemo(() => {
    if (!scene) return { normalizedScale: 1, yOffset: 0, pinScale: 1 };
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim === 0 ? 1 : 4 / maxDim;
    const yOff = -box.min.y * scale - 1.2;
    const pScale = maxDim === 0 ? 1 : maxDim / 4;
    return { normalizedScale: scale, yOffset: yOff, pinScale: pScale };
  }, [scene]);

  // Expose group world matrix so CameraZoomer can convert local → world
  useFrame(() => {
    if (groupRef.current && onGroupMatrix) {
      groupRef.current.updateWorldMatrix(true, false);
      onGroupMatrix(groupRef.current.matrixWorld);
    }
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isPlacingMode) return;
      e.stopPropagation();
      if (!groupRef.current) return;
      const localPoint = groupRef.current.worldToLocal(e.point.clone());
      onPlace([
        parseFloat(localPoint.x.toFixed(3)),
        parseFloat(localPoint.y.toFixed(3)),
        parseFloat(localPoint.z.toFixed(3)),
      ]);
    },
    [isPlacingMode, onPlace]
  );

  if (!scene) return null;

  return (
    <group ref={groupRef} scale={[normalizedScale, normalizedScale, normalizedScale]} position={[0, yOffset, 0]}>
      <group onClick={handleClick}>
        <primitive object={scene} />
      </group>
      {annotations.map((ann) => (
        <AnnotationPin
          key={ann.id}
          annotation={ann}
          selected={selectedId === ann.id}
          showLabel={showLabels}
          onSelect={onSelectAnnotation}
          onDelete={onDeleteAnnotation}
          onExploreLinked={onExploreLinked}
          onVideoPlay={onVideoPlay}
          isLinked={!!(ann.linked_model_id && linkedModelIds?.has(ann.linked_model_id))}
          pinScale={pinScale}
        />
      ))}
    </group>
  );
}

function SceneBackground() {
  return (
    <>
      {/* Dark scene background colour so the canvas isn't pure black */}
      <color attach="background" args={["#0a1e2e"]} />
      <fog attach="fog" args={["#0a1e2e", 20, 40]} />

      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#b1e1ff", "#0a1e2e", 0.5]} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
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
    </>
  );
}

function CursorSetter({ isPlacingMode }: { isPlacingMode: boolean }) {
  const { gl } = useThree();
  gl.domElement.style.cursor = isPlacingMode ? "crosshair" : "grab";
  return null;
}

/* CanvasResizeFix removed — resize is now handled outside the Canvas via
   ResizeObserver on containerRef + onCreated callback (see ModelViewer). */

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
  originalUrl?: string;
  arrayBuffer?: ArrayBuffer | null;
  modelKey: string;
  annotations: Annotation[];
  selectedId: string | null;
  isPlacingMode: boolean;
  showLabels?: boolean;
  onPlace: (pos: [number, number, number]) => void;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onExploreLinked?: (modelId: string, position: [number, number, number]) => void;
  onVideoPlay?: (videoUrl: string) => void;
  linkedModelIds?: Set<string>;
  zoomTarget?: { position: [number, number, number] } | null;
  onZoomComplete?: () => void;
}

export default function ModelViewer({
  modelUrl,
  originalUrl,
  arrayBuffer,
  modelKey,
  annotations,
  selectedId,
  isPlacingMode,
  showLabels = true,
  onPlace,
  onSelectAnnotation,
  onDeleteAnnotation,
  onExploreLinked,
  onVideoPlay,
  linkedModelIds,
  zoomTarget,
  onZoomComplete,
}: ModelViewerProps) {
  const groupMatrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const r3fSetRef = useRef<((state: any) => void) | null>(null);

  const zoomData = useMemo(() => {
    if (!zoomTarget) return null;
    return { position: zoomTarget.position, groupMatrix: groupMatrixRef.current };
  }, [zoomTarget]);

  /**
   * Sync canvas size with container dimensions.
   * Called from ResizeObserver, onCreated, and fallback timers.
   */
  const syncSize = useCallback(() => {
    const container = containerRef.current;
    const gl = glRef.current;
    if (!container || !gl) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const canvas = gl.domElement;

    // Only fix if the container has real dimensions and canvas is wrong
    if (w > 0 && h > 0 && (canvas.width < w * 0.5 || canvas.height < h * 0.5)) {
      gl.setSize(w, h);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";

      // Update R3F internal state (camera aspect, controls, etc.)
      if (r3fSetRef.current) {
        r3fSetRef.current({
          size: { width: w, height: h, top: 0, left: 0, updateStyle: true },
        });
      }
    }
  }, []);

  /** Capture gl renderer + R3F set function when Canvas mounts */
  const handleCreated = useCallback((state: RootState) => {
    glRef.current = state.gl;
    r3fSetRef.current = state.set;
    // Immediately try to fix size
    syncSize();
  }, [syncSize]);

  /**
   * ResizeObserver on the container div — runs OUTSIDE the Canvas.
   * This is more reliable than observing R3F's internal wrapper divs
   * because our container is a plain div with explicit dimensions.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => syncSize());
    observer.observe(container);

    // Fallback timers for slow proxy/iframe loads where the container
    // may not have its final size until after CSS/layout settles
    const timers = [50, 200, 600, 1500, 3000].map((t) =>
      setTimeout(syncSize, t)
    );

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [syncSize]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
    <Canvas
      shadows
      camera={{ position: [0, 2, 6], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "transparent" }}
      onCreated={handleCreated}
    >
      <SceneBackground />
      <CursorSetter isPlacingMode={isPlacingMode} />
      <KeyboardControls enabled={!isPlacingMode} />
      <CameraZoomer target={zoomData} onComplete={onZoomComplete ?? (() => {})} />

      <Bounds fit clip observe margin={1.5}>
        <SceneModel
          key={modelKey}
          url={modelUrl}
          originalUrl={originalUrl}
          arrayBuffer={arrayBuffer}
          isPlacingMode={isPlacingMode}
          onPlace={onPlace}
          annotations={annotations}
          selectedId={selectedId}
          showLabels={showLabels}
          onSelectAnnotation={onSelectAnnotation}
          onDeleteAnnotation={onDeleteAnnotation}
          onExploreLinked={onExploreLinked}
          onVideoPlay={onVideoPlay}
          linkedModelIds={linkedModelIds}
          onGroupMatrix={(m) => { groupMatrixRef.current.copy(m); }}
        />
      </Bounds>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={0.2}
        maxDistance={200}
        enabled={!isPlacingMode}
      />
    </Canvas>
    </div>
  );
}
