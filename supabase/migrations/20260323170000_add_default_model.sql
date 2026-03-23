-- Add is_default flag to models so admins can pick which model loads first.
-- Only one model should be the default at a time; a trigger enforces this.

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Ensure at most one default model at a time
CREATE OR REPLACE FUNCTION public.enforce_single_default_model()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.models SET is_default = false WHERE id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_default ON public.models;
CREATE TRIGGER enforce_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.models
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_default_model();

-- Set the Glashapullagh Restoration Area as the initial default
UPDATE public.models
  SET is_default = true
  WHERE storage_path = '/models/Glashapullagh_Restoration_Area.glb';
