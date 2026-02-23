
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', true);

CREATE POLICY "Anyone can read exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exports');

CREATE POLICY "Service role can write exports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exports');
