
## What We're Building

Two things are needed:

**1. A self-service admin upgrade flow** — right now, uploading models requires your account to have the `admin` role, but that role can only be assigned by running raw SQL. We'll add a secure way for you to elevate your own account to admin directly from the app (or provide clear in-app instructions), so model uploading works without touching the database directly.

**2. A full brand redesign** — replacing the current cyan-on-dark "tech" theme with the Acres Ireland identity across every screen: main viewer, embed view, and auth page.

---

## Brand Specification

| Token | Value |
|---|---|
| Body background | `#192C20` (dark green) |
| Panel / card | `#113B29` (deep green) |
| Gold accent | `#A7782B` |
| Footer / darkest | `#122017` |
| Display font | Red Hat Display (Google Fonts) |
| Body / UI font | Epilogue (Google Fonts) |
| Serif / quotes | Cambo (Google Fonts) |
| Button style | Gold fill `#A7782B`, no border-radius, Epilogue 13px |

---

## Technical Plan

### Step 1 — Admin Self-Grant Mechanism

The `user_roles` table currently has no INSERT policy, so only a database-level operation can make someone admin. We will add a **secure database function** (`claim_admin`) that checks if there are zero existing admins and, if so, grants the caller admin status. This means you can sign up and become admin via a button in the app — but only if no admin exists yet. This is the standard "first-run" pattern.

A migration will:
- Create a `public.claim_admin()` function with `SECURITY DEFINER`
- The function grants `admin` to `auth.uid()` only when the `user_roles` table has no existing admin

The UI will show a "Claim Admin Access" button on the Model Library panel when the user is logged in but not yet admin, and no admins exist. Once clicked, it calls the function and refreshes the role.

### Step 2 — Font Loading

Update `index.html` to load from Google Fonts:
- `Red Hat Display` (weights 400, 500, 600, 700)
- `Epilogue` (weights 300, 400, 500, 600, 700)
- `Cambo` (weight 400)

### Step 3 — CSS Design Tokens (`src/index.css`)

Replace the current cyan/dark-space tokens with the Acres Ireland palette:

```text
--background:    #192C20  (dark green body)
--card:          #113B29  (deep green panels)
--primary:       #A7782B  (gold accent)
--foreground:    #E8DFC8  (warm off-white text)
--border:        #2A4A35  (subtle green border)
--muted:         #122017  (darkest, footer)
```

All `hsl(var(--cyan))` references in CSS utility classes (`glass-panel`, `btn-cyan`, `btn-ghost-cyan`, `annotation-label`, glow keyframes) will be updated to use the gold token.

The `scanline` effect will be removed (not appropriate for this brand).

### Step 4 — Tailwind Config (`tailwind.config.ts`)

Remove the `cyan` and `glass` custom colour tokens. Add a `gold` token pointing to the new CSS variable.

### Step 5 — Button Style Update

The `btn-cyan` class (used on all primary CTAs) will be renamed/updated in CSS to produce:
- Background: `#A7782B`
- Color: white or `#192C20`
- `border-radius: 0` (square corners)
- `font-family: 'Epilogue', sans-serif`
- `font-size: 13px`

The `btn-ghost-cyan` (outline/ghost buttons) will use a gold border and gold text on transparent background.

### Step 6 — Component Styling Sweep

All inline `hsl(var(--cyan))` style references across these files will be updated to `hsl(var(--gold))` or the equivalent hex:

- `src/pages/Index.tsx` — top bar, controls hint, loading spinner, drag overlay
- `src/components/ModelLibrary.tsx` — header dot, selected state ring, upload button
- `src/components/AnnotationPanel.tsx` — header, pin toggle button, item selection highlight
- `src/components/AnnotationPin.tsx` — sphere colour, ring colour, line, label border
- `src/pages/Auth.tsx` — logo icon, input focus border, sign-in button, link hover
- `src/pages/Embed.tsx` — top bar, controls hint, loading spinner, modal

### Step 7 — Typography

Body font changed from `Space Grotesk` to `Epilogue`. Monospace labels changed from `JetBrains Mono` to `Red Hat Display` (as a display/label font). The `.font-mono` class will be repointed.

---

## Files Changed

| File | Change |
|---|---|
| `index.html` | Add Google Fonts import for Red Hat Display, Epilogue, Cambo |
| `src/index.css` | Replace all colour tokens, font families, remove scanline, update button/glass styles |
| `tailwind.config.ts` | Update custom colour tokens |
| `src/pages/Index.tsx` | Update all inline colour refs |
| `src/pages/Auth.tsx` | Update all inline colour refs |
| `src/pages/Embed.tsx` | Update all inline colour refs |
| `src/components/ModelLibrary.tsx` | Update colours + add Claim Admin button |
| `src/components/AnnotationPanel.tsx` | Update colours |
| `src/components/AnnotationPin.tsx` | Update pin/sphere/label colours |
| New DB migration | Add `claim_admin()` security-definer function + INSERT policy on `user_roles` |
