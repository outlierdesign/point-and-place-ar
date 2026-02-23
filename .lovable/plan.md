

## Export USDZ for AR Quick Look on Apple Devices

### Overview

Add a backend function that converts the currently loaded GLB model to USDZ format, and a frontend "EXPORT" button in the bottom dock. On iOS/iPadOS, this will open the USDZ directly in AR Quick Look. On other devices, it will download the file.

This is a plain GLB-to-USDZ conversion (no annotation baking) -- keeping it simple and reliable.

---

### Architecture

```text
User taps "EXPORT" in bottom dock
        |
        v
Frontend calls edge function: export-usdz?model_id=xxx
        |
        v
Edge function:
  1. Checks if a cached USDZ already exists in the "exports" bucket
  2. If not, fetches GLB from "models" bucket
  3. Converts GLB to USDZ using Three.js USDZExporter (runs on CPU, no GPU needed)
  4. Uploads USDZ to "exports" bucket
  5. Returns public URL
        |
        v
Frontend receives USDZ URL:
  - iOS: updates the AR Quick Look anchor href and clicks it (launches native AR)
  - Other: triggers a file download
```

---

### Changes

#### 1. New storage bucket: `exports`

A public bucket for cached USDZ files. Created via SQL migration.

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', true);

CREATE POLICY "Anyone can read exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exports');

CREATE POLICY "Service role can write exports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exports');
```

#### 2. New edge function: `export-usdz`

File: `supabase/functions/export-usdz/index.ts`

- Accepts `model_id` query parameter
- Fetches the model record from the `models` table to get `storage_path`
- Checks if `exports/{model_id}.usdz` already exists; if so, returns its public URL immediately
- Otherwise, downloads the GLB from the `models` bucket
- Uses Three.js (imported via `npm:three`) and the `USDZExporter` to convert the GLB scene to USDZ
- Uploads the result to `exports/{model_id}.usdz`
- Returns JSON: `{ url: "https://.../{model_id}.usdz" }`

Config addition to `supabase/config.toml`:
```toml
[functions.export-usdz]
verify_jwt = false
```

#### 3. Frontend: `src/pages/Index.tsx`

- Add `Download` icon import from lucide-react
- Add `exporting` boolean state for loading feedback
- Add `handleExportUSDZ` function that:
  - Calls the edge function with `selectedModelId`
  - On iOS: sets the AR Quick Look anchor's `href` to the returned USDZ URL and clicks it
  - On other devices: opens the URL in a new tab (triggers download)
- Add an "EXPORT" button to the bottom dock (between AR and LOCAL/EMBED), visible when a library model is selected
- The button shows a spinner while exporting

---

### Technical Details

**Three.js in Deno edge functions**: Three.js can be imported via `npm:three` in Deno. The `GLTFLoader` requires a minimal DOM shim (just `document` and `TextDecoder`) which can be polyfilled. The `USDZExporter` operates purely on the scene graph -- no WebGL context needed.

**Caching**: Once a USDZ is generated for a model, it is stored permanently in the `exports` bucket. Subsequent export requests for the same model return the cached file instantly. If a model is re-uploaded (new `storage_path`), the old USDZ remains valid until manually cleared.

**File sizes**: USDZ files are typically slightly larger than GLB due to the ZIP container format with uncompressed assets. A 10MB GLB may produce a 12-15MB USDZ.

### Files to Create / Change

| File | Action |
|---|---|
| SQL migration | Create `exports` bucket + RLS policies |
| `supabase/functions/export-usdz/index.ts` | New edge function for GLB-to-USDZ conversion |
| `supabase/config.toml` | Add `[functions.export-usdz]` config (auto-managed) |
| `src/pages/Index.tsx` | Add EXPORT button to bottom dock + handler logic |

