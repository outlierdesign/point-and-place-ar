
ALTER TABLE public.annotations
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT;
