
-- Add thumbnail_path column to models table
ALTER TABLE public.models ADD COLUMN thumbnail_path text DEFAULT NULL;

-- Create thumbnails storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can view thumbnails
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Storage RLS: only admins can upload thumbnails
CREATE POLICY "Admins can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Storage RLS: only admins can delete thumbnails
CREATE POLICY "Admins can delete thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'thumbnails'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Storage RLS: only admins can update thumbnails
CREATE POLICY "Admins can update thumbnails"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'thumbnails'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
