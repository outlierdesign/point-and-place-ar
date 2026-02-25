

# Plan: Fix Annotation Tool — 4 Issues

## Issue 1: No Ability to Add Imagery or Video Links

The "New Annotation" modal in `Index.tsx` (lines 543-581) only has label and description fields. Media URL and video URL fields are missing from this creation dialog. The same applies to `Embed.tsx` (lines 157-194).

Additionally, `Embed.tsx` `rowToAnnotation` (line 9-19) does not include `media_url` or `video_url` fields, so even existing annotations with media won't display them in embeds.

**Changes:**
- `src/pages/Index.tsx`: Add media URL and video URL input fields to the pending annotation modal, with state variables `newMediaUrl` and `newVideoUrl`. Pass them through to `addAnnotation`.
- `src/hooks/useAnnotations.ts`: Extend `addAnnotation` to accept optional `media_url` and `video_url` parameters and include them in the insert.
- `src/pages/Embed.tsx`: Update `rowToAnnotation` to include `media_url` and `video_url`. Update the annotation select query to fetch these fields.

## Issue 2: Tooltip Marker Reinstated in Embed

The Embed page (`Embed.tsx`) does not fetch `media_url`/`video_url` from the database, so the AnnotationPin expanded card cannot show media or video. The pin 3D geometry (pole, cone, sphere) is present in `AnnotationPin.tsx` and should render correctly. The "tooltip" behavior (collapsed badge + expanded card) is intact in the component.

The fix for this is covered by Issue 1 -- ensuring the Embed page fetches and passes all annotation fields.

## Issue 3: Responsive Textbox Sizing (10pt-14pt)

The expanded card in `AnnotationPin.tsx` uses fixed font sizes (10px label, 9px description, 8px buttons). The collapsed badge uses 8px. These should scale with the viewer/window size.

**Changes in `src/components/AnnotationPin.tsx`:**
- Use `clamp()` CSS values for font sizes: `clamp(10px, 1.2vw, 14px)` for labels, `clamp(9px, 1vw, 13px)` for descriptions, `clamp(8px, 0.9vw, 12px)` for buttons/badges.
- Increase `maxWidth` of expanded card from 180px to `clamp(160px, 20vw, 260px)` and `minWidth` from 130px to `clamp(120px, 14vw, 180px)`.
- Collapsed badge label: `clamp(8px, 1vw, 12px)`.

## Issue 4: Annotations Only Editable by Signed-In Users

Current RLS policies allow anyone (including anonymous/unauthenticated) to INSERT annotations. The user wants only authenticated users to create, update, and delete annotations. Everyone can still view them.

**Database migration:**
- Drop the existing INSERT policy ("Anyone can insert annotations").
- Create a new INSERT policy restricted to `authenticated` role.
- Update the DELETE and UPDATE policies to simply check `auth.uid() IS NOT NULL` (any signed-in user can edit any annotation, not just their own -- based on the user's requirement that annotations are editable by any signed-in user).

**Frontend changes:**
- `src/pages/Index.tsx`: Hide the "Add Annotation" placing mode and the annotation panel's edit/delete controls when the user is not signed in. Pass an `isReadOnly` prop to `AnnotationPanel`.
- `src/components/AnnotationPanel.tsx`: Accept an `isReadOnly` prop. When true, hide the "Add Annotation" button, edit/delete buttons, and "Clear All".
- `src/pages/Embed.tsx`: Remove the "Add Pin" button and placing functionality entirely (embeds are view-only for anonymous visitors). Keep annotations visible but not editable.

**New RLS policies:**
```sql
-- Drop old permissive insert
DROP POLICY "Anyone can insert annotations" ON public.annotations;

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert annotations"
ON public.annotations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can update any annotation
DROP POLICY "Users can update own annotations" ON public.annotations;
CREATE POLICY "Authenticated users can update annotations"
ON public.annotations FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Authenticated users can delete any annotation
DROP POLICY "Users can delete own annotations" ON public.annotations;
CREATE POLICY "Authenticated users can delete annotations"
ON public.annotations FOR DELETE
TO authenticated
USING (true);
```

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Add media/video URL fields to new annotation modal; pass `isReadOnly={!user}` to AnnotationPanel; hide placing mode when not signed in |
| `src/pages/Embed.tsx` | Fetch media_url/video_url in annotation query; remove placing mode UI (view-only) |
| `src/hooks/useAnnotations.ts` | Extend `addAnnotation` to accept media_url/video_url |
| `src/components/AnnotationPanel.tsx` | Add `isReadOnly` prop to hide edit controls |
| `src/components/AnnotationPin.tsx` | Use `clamp()` CSS for responsive 10-14pt font sizing on labels, descriptions, badges |
| Database migration | Update RLS policies to restrict write operations to authenticated users only |

