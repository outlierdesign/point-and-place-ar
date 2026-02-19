
-- Add claim_admin() function: grants admin to caller only if no admins exist yet (first-run pattern)
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if no admins exist yet
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'An admin already exists. Contact the existing admin.';
  END IF;

  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to claim admin access.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
