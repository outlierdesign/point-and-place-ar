
## Tooltip Redesign: Collapsed Node + Expand on Click

### Problem
The current tooltip in `AnnotationPin.tsx` always renders the full label, description, thumbnail, and video button inside an `<Html>` element with `distanceFactor={6}`. Because `distanceFactor` scales the HTML relative to the camera distance, at close zoom the text becomes enormous and obstructive. There's no way to dismiss it.

### Solution: Two-State Annotation Node

Redesign the annotation so it has two visual states:

**Collapsed (default)** — A small, compact node icon. Just the sphere pin + ring that already exists in the 3D scene, with a tiny HTML label badge showing only the annotation title at a much smaller scale. This stays unobtrusive at any zoom level.

**Expanded (click to toggle)** — Clicking the node opens a neat tooltip card that shows the full label, description, photo thumbnail, and video button. Clicking the node again (or clicking elsewhere) collapses it back.

---

### Implementation Details

#### `src/components/AnnotationPin.tsx`

**State changes:**
- Replace the `selected` prop-driven display with a local `expanded` boolean state, toggled on click.
- Keep `selected` for the gold glow on the sphere/ring but decouple it from the tooltip open/close.

**Collapsed state HTML:**
- A very small pill badge — just the annotation number or a dot icon — using `distanceFactor={8}` (smaller = physically smaller in scene space).
- Font size: `9px`, padding `2px 6px`, no description, no media.
- A subtle "+" icon or circle indicator so users know it's clickable.

**Expanded state HTML:**
- Full card with label, description, photo thumbnail, and video button.
- Uses `distanceFactor={6}` (same as now) but capped `maxWidth: 180px`.
- Font sizes reduced: label at `11px` (down from implicit ~14px), description at `9px`.
- An "×" close button in the top-right corner of the card.

**Click behaviour:**
- Clicking the sphere mesh → `onSelect(id)` AND toggle `expanded`.
- Clicking the label badge → same toggle.
- Clicking the "×" close button → collapse without deselecting.

**`distanceFactor` approach:**
The key insight is that `distanceFactor` in `@react-three/drei` `<Html>` makes the element scale proportionally with distance — closer = bigger. The current value of `6` is too large for close zoom. We split into two `<Html>` elements:
1. A persistent tiny dot/badge at `distanceFactor={5}` — always visible, never obtrusive.
2. A conditionally rendered expanded card at `distanceFactor={5}` positioned slightly offset.

**Reduced font sizes:**
- Label: `11px → 10px` in expanded, badge shows at `8px`
- Description: `10px → 9px`
- Video button: `9px → 8px`

---

### Visual Structure

```text
COLLAPSED:
  [●]  ← 3D sphere mesh (gold dot)
  [6ft long planks +]  ← tiny HTML badge (8px, compact)

EXPANDED (after click):
  [●]
  ┌──────────────────┐
  │ 6ft long planks ×│  ← 10px bold gold, close button
  │ Bury these at... │  ← 9px muted
  │ [photo thumb]    │
  │ [▶ Play Video]   │
  └──────────────────┘
```

---

### Files to Change

Only **`src/components/AnnotationPin.tsx`** needs editing:

1. Add local `expanded` state (`useState(false)`).
2. Toggle `expanded` in the sphere `onClick` handler alongside `onSelect`.
3. Replace the single always-on tooltip `<Html>` block with:
   - A compact badge `<Html>` that is always rendered (collapsed view) — shows label + "+" if not expanded, "×" if expanded.
   - A full card `<Html>` that is conditionally rendered only when `expanded === true`.
4. Reduce all font sizes by ~1–2px across the expanded card.
5. Keep lightbox portals exactly as-is inside the expanded `<Html>`.

No database changes, no other files need editing.
