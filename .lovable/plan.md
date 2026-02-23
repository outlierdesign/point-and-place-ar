

## Fix AR Quick Look + Add Offline PWA Support

### Part 1: Fix the AR Quick Look / Export Button

**Current problems:**

1. The hidden `<a rel="ar">` anchor has an `<img alt="AR" />` child with no `src` attribute. Safari requires the anchor's first child to be an `<img>` with a valid `src` to recognise the link as an AR Quick Look trigger.
2. The `export-usdz` edge function does not convert to USDZ -- it just re-uploads the GLB to the `exports` bucket. While iOS 15+ can open GLB files in Quick Look, the anchor must be correctly formed.
3. The exported file URL ends in `.glb` which is fine for iOS 15+, but adding a proper `<img>` child with a 1x1 transparent PNG data URI will fix Safari's detection.

**Fixes in `src/pages/Index.tsx`:**

- Give the `<img>` child of the AR Quick Look anchor a valid `src` (a transparent 1x1 pixel data URI). This is the standard pattern recommended by Apple for programmatic AR Quick Look triggers.
- Ensure the anchor `href` always has a `.glb` or `.usdz` extension so Safari identifies it as a 3D model.

Before:
```html
<a ref={arQuickLookRef} rel="ar" href={...}>
  <img alt="AR" />
</a>
```

After:
```html
<a ref={arQuickLookRef} rel="ar" href={...}>
  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==" alt="" />
</a>
```

- Also update `handleExportUSDZ` so on iOS it sets the anchor `href` and clicks it, and on non-iOS it downloads the file correctly.

---

### Part 2: Progressive Web App (PWA) for Offline Use

**What this enables:**

- Users can install the app to their home screen from Safari (iOS) or Chrome (Android/desktop)
- The service worker caches the app shell (HTML, CSS, JS) for instant offline loading
- Models can be cached as they are viewed, so previously loaded models work offline
- AR Quick Look still works offline on iOS because the model file is served from the local cache

**Implementation:**

#### 2a. Install `vite-plugin-pwa`

Add the `vite-plugin-pwa` package as a dependency.

#### 2b. Configure `vite.config.ts`

Add the PWA plugin with:

- A manifest including app name ("Acres Ireland"), theme colour, icons
- Workbox runtime caching strategy for Supabase storage URLs (models, thumbnails) using `CacheFirst` with a size/age limit
- `navigateFallbackDenylist: [/^\/~oauth/]` to ensure OAuth redirects always hit the network
- Precaching of the app shell

```ts
import { VitePWA } from "vite-plugin-pwa";

// Inside plugins array:
VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "Acres Ireland - 3D Model Viewer",
    short_name: "Acres Ireland",
    description: "AR Landscape Actions Viewer",
    theme_color: "#0a1628",
    background_color: "#0a1628",
    display: "standalone",
    start_url: "/",
    icons: [
      { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  workbox: {
    navigateFallbackDenylist: [/^\/~oauth/],
    runtimeCaching: [
      {
        urlPattern: /\/storage\/v1\/object\/public\/(models|thumbnails|exports)\//,
        handler: "CacheFirst",
        options: {
          cacheName: "model-assets",
          expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})
```

#### 2c. Update `index.html`

Add mobile-optimised meta tags:

```html
<meta name="theme-color" content="#0a1628" />
<link rel="apple-touch-icon" href="/pwa-192x192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

#### 2d. Create PWA icons

Create placeholder icons at `public/pwa-192x192.png` and `public/pwa-512x512.png`. These can be simple branded icons with the Acres Ireland logo/text.

#### 2e. Offline indicator (optional but recommended)

Add a small banner or toast that appears when the user is offline, so they know they are working from cached data. New models from the library won't load until they reconnect, but previously viewed models will work.

---

### Files to Create / Change

| File | Action | Purpose |
|---|---|---|
| `src/pages/Index.tsx` | Modify | Fix AR Quick Look anchor (add valid img src); minor export handler tweaks |
| `vite.config.ts` | Modify | Add vite-plugin-pwa configuration with manifest and workbox caching |
| `index.html` | Modify | Add PWA meta tags (theme-color, apple-touch-icon, apple-mobile-web-app) |
| `public/pwa-192x192.png` | Create | PWA icon (192x192) |
| `public/pwa-512x512.png` | Create | PWA icon (512x512) |
| `package.json` | Modify | Add vite-plugin-pwa dependency |

### How Offline AR Works

Once the PWA is installed and a model has been viewed at least once:

1. The service worker caches the GLB file from the storage URL
2. When offline, the app loads from cache
3. The model renders in the 3D viewer from the cached GLB
4. On iOS, tapping "QUICK LOOK" points the AR anchor at the same cached URL -- Safari's AR Quick Look can still open it from the service worker cache
5. Annotations stored in the database won't sync while offline, but previously loaded annotations remain in the React Query cache for the session

