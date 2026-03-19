import { useRef, useCallback, useMemo, useEffect } from "react";
import { Canvas, useThree, useFrame, ThreeEvent, useLoader } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
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
  isPlacingMode,
  onPlace,
  annotations,
  selectedId,
  onSelectAnnotation,
  onDeleteAnnotation,
  onExploreLinked,
  linkedModelIds,
  onGroupMatrix,
}: {
  url: string;
  originalUrl?: string;
  isPlacingMode: boolean;
  onPlace: (pos: [number, number, number]) => void;
  annotations: Annotation[];
  selectedId: string | null;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onExploreLinked?: (modelId: string, position: [number, number, number]) => void;
  linkedModelIds?: Set<string>;
  onGroupMatrix?: (m: THREE.Matrix4) => void;
}) {
  // Use useLoader with GLTFLoader to set resource path for texture resolution
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    (loader as GLTFLoader).setDRACOLoader(dracoLoader);
    // Set resource path to original URL directory so textures resolve correctly
    if (originalUrl && !originalUrl.startsWith("blob:")) {
      const basePath = originalUrl.substring(0, originalUrl.lastIndexOf("/") + 1);
      (loader as GLTFLoader).setResourcePath(basePath);
    }
  });
  const scene = gltf.scene;
  const groupRef = useRef<THREE.Group>(null);

  const { normalizedScale, yOffset, pinScale } = useMemo(() => {
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
          onSelect={onSelectAnnotation}
          onDelete={onDeleteAnnotation}
          onExploreLinked={onExploreLinked}
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
  originalUrl?: string;
  modelKey: string;
  annotations: Annotation[];
  selectedId: string | null;
  isPlacingMode: boolean;
  onPlace: (pos: [number, number, number]) => void;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onExploreLinked?: (modelId: string, position: [number, number, number]) => void;
  linkedModelIds?: Set<string>;
  zoomTarget?: { position: [number, number, number] } | null;
  onZoomComplete?: () => void;
}

export default function ModelViewer({
  modelUrl,
  originalUrl,
  modelKey,
  annotations,
  selectedId,
  isPlacingMode,
  onPlace,
  onSelectAnnotation,
  onDeleteAnnotation,
  onExploreLinked,
  linkedModelIds,
  zoomTarget,
  onZoomComplete,
}: ModelViewerProps) {
  const groupMatrixRef = useRef<THREE.Matrix4>(new THREE.Matrix4());

  const zoomData = useMemo(() => {
    if (!zoomTarget) return null;
    return { position: zoomTarget.position, groupMatrix: groupMatrixRef.current };
  }, [zoomTarget]);

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
      <CameraZoomer target={zoomData} onComplete={onZoomComplete ?? (() => {})} />

      <Bounds fit clip observe margin={1.5}>
        <SceneModel
          key={modelKey}
          url={modelUrl}
          originalUrl={originalUrl}
          isPlacingMode={isPlacingMode}
          onPlace={onPlace}
          annotations={annotations}
          selectedId={selectedId}
          onSelectAnnotation={onSelectAnnotation}
          onDeleteAnnotation={onDeleteAnnotation}
          onExploreLinked={onExploreLinked}
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
  );
}
