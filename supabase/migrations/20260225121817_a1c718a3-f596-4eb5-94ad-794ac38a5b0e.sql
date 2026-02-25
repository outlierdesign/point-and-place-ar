
-- Drop old permissive insert policy
DROP POLICY IF EXISTS "Anyone can insert annotations" ON public.annotations;

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert annotations"
ON public.annotations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Drop old update policy
DROP POLICY IF EXISTS "Users can update own annotations" ON public.annotations;

-- Authenticated users can update any annotation
CREATE POLICY "Authenticated users can update annotations"
ON public.annotations FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Drop old delete policy
DROP POLICY IF EXISTS "Users can delete own annotations" ON public.annotations;

-- Authenticated users can delete any annotation
CREATE POLICY "Authenticated users can delete annotations"
ON public.annotations FOR DELETE
TO authenticated
USING (true);
