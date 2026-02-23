

## Fix AR Quick Look "Object Can't Be Viewed" Error

### Root Cause Analysis

There are three separate issues preventing AR Quick Look from working:

**Issue 1: Content-Type headers on the GLB file URL**
When Safari opens a GLB via AR Quick Look, it checks the `Content-Type` response header. The storage bucket serves files with whatever MIME type was set at upload time. If the GLB was uploaded without specifying `Content-Type: model/gltf-binary`, it may be served as `application/octet-stream`, which Safari rejects with "object can't be viewed."

**Issue 2: The hidden anchor's zero dimensions**
The current anchor has `width: 0, height: 0`. While this works on some iOS versions, Apple's documentation recommends keeping the element at least 1x1 pixel. Some Safari versions ignore zero-dimension elements even if they're in the DOM.

**Issue 3: The export edge function is not reachable**
The `export-usdz` function deploys but returns 404. The `config.toml` only contains the project ID and has no function configuration. This needs `verify_jwt = false` to be called without authentication from the frontend.

---

### Fix Plan

#### 1. Fix the AR Quick Look anchor in `src/pages/Index.tsx`

- Change the anchor's hidden style from `width: 0, height: 0` to `width: 1, height: 1` with `clip: rect(0,0,0,0)` (the standard visually-hidden pattern that keeps the element "real" for Safari)
- Ensure the `<img>` child has a proper transparent PNG data URI (already done in last diff -- confirmed correct)

#### 2. Bypass the edge function for QUICK LOOK -- use direct model URL

The "QUICK LOOK" button (handleAR) already uses the direct storage URL. The problem is likely the Content-Type of the stored GLB file. Two fixes:

**a) Add a `#.usdz` fragment to the URL**
Apple's AR Quick Look documentation states that appending `#.usdz` to any URL forces Safari to treat it as an AR model, regardless of the Content-Type header. This is the simplest and most reliable fix:

```tsx
// Before
anchor.href = modelUrl;

// After  
anchor.href = modelUrl + "#.usdz";
```

This single change should resolve the "object can't be viewed" error without needing any server-side changes.

**b) Update the anchor href dynamically**
Currently the anchor's `href` is set statically via JSX (`href={modelUrlIsPublic ? modelUrl! : undefined}`). When the user taps QUICK LOOK, the `handleAR` function clicks the anchor but doesn't update the href. The href should always include the `#.usdz` suffix.

#### 3. Fix the EXPORT button flow

The EXPORT button calls the edge function which isn't working. Two options:

**Option A (simpler)**: Skip the edge function entirely for now. The EXPORT button can directly use the model's public storage URL with a `#.usdz` suffix for iOS, or trigger a download for other platforms. This removes the server-side dependency.

**Option B**: Fix the edge function deployment. This requires the config.toml to have `[functions.export-usdz] verify_jwt = false`, but since config.toml is auto-managed, we'd need to validate JWT in code instead and call without auth requirement.

Recommend **Option A** since the edge function's only job currently is to re-upload the GLB (no actual conversion).

#### 4. Simplify the export/AR flow

Merge the QUICK LOOK and EXPORT buttons into a cleaner flow:
- On iOS: the existing "QUICK LOOK" button opens AR Quick Look using the direct URL with `#.usdz`
- The "EXPORT" button triggers a standard download of the GLB file (works on all platforms)
- Remove the edge function dependency for now

---

### Changes Summary

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Fix anchor hidden style (use clip instead of zero dimensions); append `#.usdz` to AR Quick Look URLs; simplify EXPORT to direct download without edge function |

### Technical Detail

The `#.usdz` URL fragment trick is documented by Apple:
- Safari checks the URL (including fragment) to determine if it should launch AR Quick Look
- The fragment does not affect the actual HTTP request (fragments are never sent to the server)
- The server still returns the GLB binary, but Safari treats it as an AR-compatible model
- This works with both GLB and USDZ files on iOS 15+
