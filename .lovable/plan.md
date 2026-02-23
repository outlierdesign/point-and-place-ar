

## Fix Model Scaling and Zoom for Large Models

### Problem

The "Glashapullagh Jan 2025 cropped" model is very large in world units, so it fills the entire 3D canvas. The current settings prevent zooming out far enough to see the full model because:

- The camera's maximum zoom-out distance is capped at 20 units
- The field of view is a narrow 45 degrees
- The model is centered but not scaled down to fit the viewport
- The camera starts very close at only 3 units away

### Solution

Two changes in `src/components/ModelViewer.tsx`:

**1. Auto-fit the model to the viewport**

Replace the bare `<Center>` wrapper with a version that automatically scales any model to fit within a consistent bounding sphere. After loading, the model's bounding box is measured, and it is uniformly scaled so that even massive terrain models appear at a manageable size in the viewer.

This uses drei's `<Bounds>` component which automatically adjusts the camera to fit the model, combined with a manual scale normalization to keep all models at a consistent visual size regardless of their original dimensions.

**2. Increase zoom range and widen field of view**

| Setting | Current | New |
|---|---|---|
| Camera FOV | 45 | 50 |
| Camera start position | [0, 0.5, 3] | [0, 2, 6] |
| OrbitControls maxDistance | 20 | 200 |
| OrbitControls minDistance | 0.5 | 0.2 |

**3. Scale the grid and shadows to match**

Increase the grid size and shadow scale so they remain visible when zoomed out on large models.

---

### Technical Details

**File: `src/components/ModelViewer.tsx`**

In the `SceneModel` component:
- After loading the GLB scene, compute its bounding box using `THREE.Box3`
- Calculate the maximum dimension of the model
- Apply a uniform scale factor so the model fits within roughly 4 world units (a comfortable viewing size)
- This means small models stay the same size, but large terrain models like Glashapullagh get scaled down automatically

In the `Canvas` and `OrbitControls`:
- Widen FOV from 45 to 50 for a broader view
- Pull the camera back from `[0, 0.5, 3]` to `[0, 2, 6]`
- Increase `maxDistance` from 20 to 200 so users can zoom out much further
- Decrease `minDistance` from 0.5 to 0.2 for closer inspection

In `SceneBackground`:
- Increase grid size from 20x20 to 40x40
- Increase grid `fadeDistance` from 12 to 25
- Increase `ContactShadows` scale from 6 to 15

