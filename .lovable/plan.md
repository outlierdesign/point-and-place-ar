
## Root Cause: Two Bugs in AnnotationPin.tsx

### Bug 1 — forwardRef Crashes the Canvas

The previous fix wrapped `AnnotationPin` in `forwardRef<THREE.Group, ...>`. React Three Fiber identifies scene components by checking whether they are plain functions. A `forwardRef`-wrapped component is an object `{ $$typeof: Symbol(react.forward_ref), render: fn }`, not a function — so R3F throws `Component3 is not a function` when it tries to call it during the render loop.

The ref was added to silence a console warning, but the warning was harmless. The fix is to revert `AnnotationPin` back to a plain named `export default function`.

### Bug 2 — Lightboxes Trapped Inside `<Html>`

The photo and video lightboxes are currently rendered as children of `<Html>` from `@react-three/drei`. The `<Html>` component creates a `<div>` that is absolutely positioned inside the Canvas's own overlay container, which:
- Has `pointer-events: none` on ancestor elements in some configurations
- Is clipped by the canvas bounds
- Has a stacking context that prevents `position: fixed` from working relative to the viewport

This is why the lightboxes appear to do nothing — they render, but are invisible or unclickable, trapped inside the canvas overlay.

The fix is to use `ReactDOM.createPortal` to render the lightboxes directly into `document.body`, completely outside the canvas DOM subtree. The lightbox state (`lightboxOpen`, `videoOpen`) remains in the component, but the rendered JSX is portalled out.

## Files to Change

### `src/components/AnnotationPin.tsx`

Two changes:

1. **Remove `forwardRef`**: Change back to a plain `export default function AnnotationPin(...)` — no ref forwarding needed. Remove `forwardRef` from the import.

2. **Portal the lightboxes**: Import `ReactDOM` from `react-dom`. Move the Photo Lightbox and Video Lightbox `<div>` blocks out of `<Html>` and wrap them in `ReactDOM.createPortal(..., document.body)`. They remain conditionally rendered by the same state flags, but now mount into `document.body` directly, giving `position: fixed` the correct viewport context and full pointer-events access.

The final structure looks like:

```
AnnotationPin (plain function, no forwardRef)
  └─ <group>
       ├─ <mesh> (sphere pin)
       ├─ <mesh> (ring)
       ├─ <Line>
       └─ <Html>  ← only label, thumbnail, play button
  
  // Outside Canvas DOM — rendered via portal:
  ReactDOM.createPortal(<PhotoLightbox />, document.body)
  ReactDOM.createPortal(<VideoLightbox />, document.body)
```

No database changes, no other files need editing.
