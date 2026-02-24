
# Fix: Anchor Annotation Pins to the Model

## Problem
Annotations are rendered at the scene root level, but the model is inside a transformed group (`scale` + `yOffset` + `Bounds`). When the model's position changes, annotations stay at their old world-space coordinates, causing them to float in mid-air.

## Solution
Move annotation rendering **inside** the model's transform group so they always track with the model. Convert click positions from world space to the model group's local space before storing.

## Changes

### 1. `src/components/ModelViewer.tsx`

**Move annotations inside SceneModel's group:**
- Pass `annotations`, `selectedId`, `onSelectAnnotation`, `onDeleteAnnotation` as props to `SceneModel`
- Render `AnnotationPin` components inside the same `<group>` that has the scale/position transforms
- In the click handler, convert `e.point` (world space) to the group's local space using `ref.current.worldToLocal(point.clone())` before calling `onPlace`

**Before:**
```text
<Bounds>
  <SceneModel ... />     <-- model inside transforms
</Bounds>
{annotations.map(...)}   <-- annotations at scene root (misaligned!)
```

**After:**
```text
<Bounds>
  <SceneModel ... annotations={annotations} ...>
    {/* model + annotations inside same transform group */}
  </SceneModel>
</Bounds>
```

### 2. Click Position Conversion

In `SceneModel.handleClick`, use the group ref's `worldToLocal()` to convert the world-space intersection point into the model group's local coordinate space before storing:

```text
const localPoint = ref.current.worldToLocal(e.point.clone());
onPlace([localPoint.x, localPoint.y, localPoint.z]);
```

This ensures stored positions are always relative to the model, not the scene.

### 3. Existing Annotation Migration

Existing annotations in the database were placed using raw `e.point` world coordinates from a previous model transform. Since the model transform has changed multiple times, these old positions will still be off. Two options:

- **Option A (recommended):** Since the annotations appear to be development/test data, clear them and re-place them with the corrected coordinate system.
- **Option B:** Add a one-time migration that transforms old coordinates, but this requires knowing the exact previous transform -- fragile and error-prone.

## Technical Summary

| File | Change |
|------|--------|
| `src/components/ModelViewer.tsx` | Move annotation rendering into `SceneModel`, convert click points to local space using `worldToLocal()` |
| No other files need changes | `AnnotationPin.tsx` and `useAnnotations.ts` remain unchanged |
