
# Plan: Floor-Level Models and Marker Pole Pins

## 1. Lower Models to Floor Level

Currently, models float at their native origin. We need to compute the model's bounding box after scaling, then apply a vertical offset so the bottom of the model sits at y=0 (the grid/floor level).

**File:** `src/components/ModelViewer.tsx` -- `SceneModel` component

- After computing `normalizedScale`, also compute a `yOffset` by finding the model's bounding box minimum Y, scaling it, and negating it so the bottom sits at y=0.
- Apply this offset to the outer `<group>` via `position={[0, yOffset, 0]}`.

## 2. Taller Marker Pole on Annotation Pins

Replace the current short line (0.1 units) with a more visible pole structure:

**File:** `src/components/AnnotationPin.tsx`

- Increase the elevation offset from `0.08` to `0.18` (pin head floats higher above surface).
- Replace the short `<Line>` with a taller pole: change line points from `[0, 0, 0] -> [0, -0.1, 0]` to `[0, 0, 0] -> [0, -0.2, 0]`.
- Add a small cone or diamond shape at the bottom of the pole (the "marker point") that visually touches the model surface, making it clear where the pin is anchored.
- The marker point will be a small inverted cone (`coneGeometry`) at the pole base, using the same gold material.

## Technical Details

### ModelViewer.tsx -- SceneModel changes
```tsx
const { normalizedScale, yOffset } = useMemo(() => {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim === 0 ? 1 : 4 / maxDim;
  const yOff = -box.min.y * scale;
  return { normalizedScale: scale, yOffset: yOff };
}, [scene]);

// Apply:
<group scale={[normalizedScale, normalizedScale, normalizedScale]} position={[0, yOffset, 0]}>
```

### AnnotationPin.tsx -- Pole and marker point
```tsx
// Elevation: +0.18 above surface
<group position={[pos[0], pos[1] + 0.18, pos[2]]}>
  {/* Sphere head (existing, unchanged) */}
  {/* Ring (existing, unchanged) */}
  
  {/* Taller pole line */}
  <Line points={[[0, 0, 0], [0, -0.2, 0]]} ... />
  
  {/* Marker point (inverted cone at pole base) */}
  <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
    <coneGeometry args={[0.015, 0.04, 8]} />
    <meshStandardMaterial color={goldDim} metalness={0.7} roughness={0.3} />
  </mesh>
</group>
```

This gives each pin a clear "stake" appearance: a pointed tip touching the surface, a thin pole rising up, and the sphere/ring marker at the top.
