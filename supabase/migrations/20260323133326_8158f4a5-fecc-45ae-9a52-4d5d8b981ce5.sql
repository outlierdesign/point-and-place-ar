
INSERT INTO public.models (id, name, storage_path, file_size, is_public) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Geotextile', '/models/Geotextile.glb', 1228800, true),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Reprofiling Peat', '/models/Reprofiling_Peat.glb', 3100000, true),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Stone Dams', '/models/Stone_Dams.glb', 1750000, true),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Timber Dams', '/models/Timber_Dams.glb', 1750000, true),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Coir Logs', '/models/Coir_Logs.glb', 2570000, true),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Composite Timber Dam', '/models/Composite_Timber_Dam.glb', 2860000, true),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Glashapullagh Restoration Area', '/models/Glashapullagh_Restoration_Area.glb', 3760000, true)
ON CONFLICT (id) DO NOTHING;
