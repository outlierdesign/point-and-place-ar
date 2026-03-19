

# Fix Build Errors, Enable Draco, and Restore Annotation Functionality

## Build Errors (6 total)

### 1. `useProgressiveModel.ts` line 155 — TypeScript type mismatch
`Uint8Array[]` not assignable to `BlobPart[]`. Fix: cast chunks array when creating Blob.

### 2. `Index.tsx` line 304 — `exporter.parse()` expects 3-4 args
The USDZExporter `.parse()` method signature requires `(scene, onDone, onError)` or similar. Fix: check API and pass correct arguments.

### 3. `Index.tsx` line 354 — `modelName` prop doesn't exist on `ModelLoadingOverlay`
`ModelLoadingOverlayProps` only has `progress`. Fix: add `modelName` to the interface.

### 4. `Index.tsx` line 526 — `ModelLibrary` props mismatch
Index passes `loading`, `isAdmin`, `onModelsChanged`, but `ModelLibraryProps` expects `onRefresh`, `onSelectModel(model, url)`. Fix: align the props — update `ModelLibrary` interface to match what Index passes, or update Index to match the component.

### 5. `Index.tsx` line 546 — `AnnotationPanel` doesn't have `isAdmin`
`AnnotationPanelProps` expects `isPlacingMode`, `onTogglePlacingMode`, `onClearAll` but Index passes `isAdmin` instead. Fix: pass the correct props that `AnnotationPanel` expects.

## Draco Compression Support

Enable the Draco decoder in `useGLTF` so compressed models load correctly. Three.js/drei's `useGLTF` with `true` as second arg enables Draco — this is already done in the current code (`useGLTF(url, true)`). Verify this is correct and working.

## Changes

### `src/hooks/useProgressiveModel.ts`
- Line 155: Cast `chunks` to `BlobPart[]` when creating Blob: `new Blob(chunks as BlobPart[], ...)`

### `src/components/ModelLoadingOverlay.tsx`
- Add `modelName?: string` to `ModelLoadingOverlayProps`
- Display model name in the overlay

### `src/pages/Index.tsx`
- **Line ~304**: Fix `USDZExporter.parse()` call signature
- **Line ~524-532**: Fix `ModelLibrary` props — pass `onRefresh` instead of `onModelsChanged`, remove `loading`/`isAdmin`, fix `onSelectModel` signature
- **Line ~539-548**: Fix `AnnotationPanel` props — pass `isPlacingMode`, `onTogglePlacingMode`, `onClearAll`, `isReadOnly={!user}` instead of `isAdmin`

### `src/components/ModelLibrary.tsx`
- Update props interface to accept `loading`, `isAdmin`, `onModelsChanged` if needed, OR update Index to match existing interface. Will align Index to existing ModelLibrary interface since it's simpler.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useProgressiveModel.ts` | Fix Uint8Array[] type cast |
| `src/components/ModelLoadingOverlay.tsx` | Add optional `modelName` prop |
| `src/pages/Index.tsx` | Fix all prop mismatches for ModelLibrary, AnnotationPanel, and USDZExporter |
| `src/components/ModelViewer.tsx` | Draco already enabled via `useGLTF(url, true)` — no change needed |

