
## Change 1: Remove the Helmet — Auto-load Peatland.glb

### Current state
`src/components/ModelViewer.tsx` sets:
```
export const DEFAULT_MODEL_URL = "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf";
```
And `src/pages/Index.tsx` sets:
```
const DEFAULT_MODEL_NAME = "DamagedHelmet.glTF";
```
The Peatland.glb is already in the database:
- id: `316de7a9-d1d6-4872-a002-9bb9141e1421`
- storage_path: `1771529889392_Peatland.glb`

### Fix
On app load, `useModels` fetches all models ordered by `created_at` ascending. Since Peatland.glb is the first model uploaded, it will always appear first in the list. We add a `useEffect` in `Index.tsx` that watches the loaded models list and, if no model is yet selected, auto-selects the first model from the library. This completely removes the external helmet URL and replaces `DEFAULT_MODEL_URL` with `null` (nothing to preload).

Changes:
- **`src/components/ModelViewer.tsx`**: Remove `DEFAULT_MODEL_URL` export and the `useGLTF.preload` call at the bottom. The viewer will only load models supplied by the library.
- **`src/pages/Index.tsx`**: Remove `DEFAULT_MODEL_URL` import and `DEFAULT_MODEL_NAME` constant. Add a `useEffect` that triggers once models have loaded (`!modelsLoading && models.length > 0 && selectedModelId === null`) and calls `handleSelectModel(models[0], getPublicUrl(models[0].storage_path))`. The loading spinner already shows while the model fetches.

---

## Change 2: AR Compatibility — What Works on Each Device

### The Platform Reality

| Device | Browser | WebXR AR | Apple Quick Look |
|---|---|---|---|
| Android | Chrome | Yes (ARCore) | No |
| iPhone / iPad | Safari | No (not supported) | Yes (USDZ only) |
| iPhone / iPad | Chrome iOS | Partial | No |
| Desktop | Chrome | No | No |

**The key issue**: iOS Safari does not support the WebXR API (`navigator.xr`). The current AR button simply detects `navigator.xr`, which is always absent on iOS, so it shows "AR N/A" on every Apple device — iPhone and iPad included.

**The iOS solution**: Apple's own AR Quick Look system. Safari on iOS 12+ natively opens AR for any `<a rel="ar" href="...">` link pointing to a `.usdz` or `.reality` file. Since the models are `.glb` files, there are two options:

**Option A — Direct GLB via Quick Look (iOS 15+)**
Apple added GLB support to AR Quick Look in iOS 15 (2021). Safari recognises `.glb` files natively when linked with `rel="ar"`. This means we do not need any USDZ conversion — we can point the Quick Look anchor directly at the Supabase storage public URL of the currently loaded GLB model.

**Option B — model-viewer web component**
Google's `<model-viewer>` custom element handles both WebXR (Android) and AR Quick Look (iOS) automatically. However, it replaces the existing Three.js/R3F canvas entirely, which would be a major architecture change. We will not use this approach.

### What we will implement

**For Android (WebXR)**: The existing `handleAR` logic is kept as-is. On ARCore-supported Android devices running Chrome it initiates an immersive-ar session.

**For iOS / iPadOS (AR Quick Look)**: We detect whether the device is iOS using `navigator.platform` or user-agent check at mount time. When the AR button is tapped on iOS, instead of calling `navigator.xr.requestSession`, we programmatically click a hidden `<a rel="ar" href="{currentModelUrl}">` anchor tag. Safari will intercept this and launch AR Quick Look with the GLB model directly — no conversion needed for iOS 15+.

**AR button states**:
- Android Chrome with ARCore: gold "Enter AR" (existing WebXR flow)
- iOS Safari (iPhone/iPad): gold "AR Quick Look" (new Quick Look flow)
- Desktop browser or unsupported: greyed out "AR N/A"

### Files to change

| File | Change |
|---|---|
| `src/components/ModelViewer.tsx` | Remove `DEFAULT_MODEL_URL` export and `useGLTF.preload` at the bottom |
| `src/pages/Index.tsx` | (1) Auto-select first model from library on load; (2) Add iOS detection; (3) Add hidden AR Quick Look anchor; (4) Update `handleAR` to branch between WebXR and Quick Look; (5) Update AR button label on mobile toolbar and desktop button to reflect device capability |

No new packages required. No database changes. No edge functions needed.

### Code sketch for the AR Quick Look anchor

```tsx
// Hidden anchor for iOS AR Quick Look
<a
  ref={arQuickLookRef}
  rel="ar"
  href={modelUrl}
  style={{ display: "none" }}
>
  <img alt="AR" />
</a>

// Detection + handler
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

const handleAR = async () => {
  if (isIOS) {
    arQuickLookRef.current?.click();  // Safari intercepts → opens Quick Look
    return;
  }
  if (!arSupported) return;
  // existing WebXR flow for Android...
};
```

### Resulting AR button labels

- iOS device + model loaded → **"AR Quick Look"** (gold, active)
- iOS device + no model → **"AR N/A"** (greyed, disabled)
- Android + ARCore → **"Enter AR"** (gold, active, existing)
- Desktop → **"AR N/A"** (greyed)
