
## Mobile Responsive Redesign

### Problems Identified from the Screenshot
The current layout places both panels as absolutely-positioned fixed elements that are always visible, consuming the majority of the screen on mobile. The model canvas is barely visible behind two thick side panels. There is no off-canvas menu behaviour, the bottom hints overlay the view, and the top bar is overly wide on small screens.

### Solution Overview

The redesign targets `src/pages/Index.tsx`, `src/components/ModelLibrary.tsx`, and `src/components/AnnotationPanel.tsx`. The 3D canvas will occupy the full viewport on mobile at all times. Both side panels become off-canvas drawers that slide in from left and right respectively. A minimal bottom toolbar replaces the cluttered top-right buttons on mobile.

---

### Detailed Changes

#### 1. `src/pages/Index.tsx` — Layout restructure

**Top bar (mobile):**
- Keep the "Acres Ireland" logo badge on the left, compact.
- Replace the row of buttons (Load Local, Embed, AR, Maximize, Sign In/Out) with a single hamburger-style icon on the right that opens the Models panel, and a separate icon on the right for Annotations.
- On desktop (`md:` breakpoint and above), the top bar remains as-is.

**Side panels → Off-canvas drawers:**
- Add two boolean states: `modelsOpen` and `annotationsOpen`.
- Both panels use a CSS `translate-x` approach — they slide in over the canvas from left (Models) and right (Annotations).
- A backdrop overlay (`z-30`, semi-opaque) appears behind an open drawer and closes it on tap.
- Both drawers have an `×` close button inside the panel header.

**Bottom toolbar (mobile only, `md:hidden`):**
- A slim glassmorphic bar pinned to the bottom with 4 icon buttons:
  - `Layers` → toggle Models panel
  - `MapPin` → toggle Annotations panel
  - `Crosshair` → AR (grayed out if not supported)
  - `LogIn/LogOut` → auth

**Controls hint (mobile):**
- Hide the bottom-left controls hint on mobile (`hidden md:block`) — it's too cluttered on small screens.

**Touch/orbit for mobile:**
- The Three.js `OrbitControls` already supports touch — single finger orbit, two-finger pinch-to-zoom, and two-finger pan. No code changes needed.
- Remove `enabled={!isPlacingMode}` restriction while keeping placing mode cursor behaviour (crosshair on desktop, tap on mobile).

**AR support (mobile):**
- Keep the existing `navigator.xr` check; WebXR AR works on Chrome Android. On iOS Safari it is not yet widely supported. No code changes needed beyond surfacing the button on mobile.

---

#### 2. `src/components/ModelLibrary.tsx`

- Add a close button (`X`) to the panel header so users can close the drawer from within the panel on mobile.
- Accept an optional `onClose?: () => void` prop and render the `×` button in the header when provided.

#### 3. `src/components/AnnotationPanel.tsx`

- Same as above — accept optional `onClose?: () => void` prop and render a close `×` button in the header.

---

### Visual Structure (Mobile)

```text
┌──────────────────────────────┐
│ [≡] Acres Ireland    [☰] [📍]│  ← top bar (compact)
│                              │
│                              │
│       3D Model Canvas        │  ← full screen
│        (orbit/pinch)         │
│                              │
│                              │
│ [Models] [Pins] [AR] [Auth]  │  ← bottom toolbar (mobile only)
└──────────────────────────────┘

Models drawer (slides in from left):
┌───────────────┐
│ Models    [×] │
│ ─────────── │
│ [model cards] │
│               │
│ [Upload]      │
└───────────────┘

Annotations drawer (slides from right):
         ┌───────────────┐
         │ [×] Annotations│
         │ ────────────── │
         │ [ann list]     │
         │ [Add Ann btn]  │
         └───────────────┘
```

---

### Files to Change

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Add `modelsOpen`/`annotationsOpen` state; add mobile bottom toolbar; make panels slide off-canvas on mobile; hide controls hint on mobile |
| `src/components/ModelLibrary.tsx` | Accept `onClose?` prop; add close button to header |
| `src/components/AnnotationPanel.tsx` | Accept `onClose?` prop; add close button to header |

No database changes. No new dependencies needed — uses existing Tailwind CSS responsive utilities and CSS `transition-transform`.
