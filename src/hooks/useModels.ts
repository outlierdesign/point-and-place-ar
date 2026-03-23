import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelRecord } from "@/components/ModelLibrary";

/**
 * DRACO-optimised models served from Vercel public directory.
 * IDs match the database records so annotations (with FK) work correctly.
 */
const LOCAL_MODELS: ModelRecord[] = [
  {
    id: "a1b2c3d4-0001-4000-8000-000000000001",
    name: "Geotextile",
    storage_path: "/models/Geotextile.glb",
    file_size: 1228800,
    created_at: "2026-03-22T12:33:00Z",
    thumbnail_path: null,
  },
  {
    id: "a1b2c3d4-0002-4000-8000-000000000002",
    name: "Reprofiling Peat",
    storage_path: "/models/Reprofiling_Peat.glb",
    file_size: 3100000,
    created_at: "2026-03-22T12:37:00Z",
    thumbnail_path: null,
  },
  {
    id: "a1b2c3d4-0003-4000-8000-000000000003",
    name: "Stone Dams",
    storage_path: "/models/Stone_Dams.glb",
    file_size: 1750000,
    created_at: "2026-03-22T12:39:00Z",
    thumbnail_path: null,
  },
  {
    id: "a1b2c3d4-0004-4000-8000-000000000004",
    name: "Timber Dams",
    storage_path: "/models/Timber_Dams.glb",
    file_size: 1750000,
    created_at: "2026-03-22T12:25:00Z",
    thumbnail_path: null,
  },
  {
    id: "a1b2c3d4-0005-4000-8000-000000000005",
    name: "Coir Logs",
    storage_path: "/models/Coir_Logs.glb",
    file_size: 2570000,
    created_at: "2026-03-23T11:56:00Z",
    thumbnail_path: null,
  },
  {
    id: "a1b2c3d4-0006-4000-8000-000000000006",
    name: "Composite Timber Dam",
    storage_path: "/models/Composite_Timber_Dam.glb",
    file_size: 2860000,
    created_at: "2026-03-23T11:52:00Z",
    thumbnail_path: null,
  },
  {
    id: "a1b2c3d4-0007-4000-8000-000000000007",
    name: "Glashapullagh Restoration Area",
    storage_path: "/models/Glashapullagh_Restoration_Area.glb",
    file_size: 3760000,
    created_at: "2026-03-23T11:40:00Z",
    thumbnail_path: null,
  },
];

export function useModels() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("models")
      .select("id, name, storage_path, file_size, created_at, thumbnail_path")
      .eq("is_public", true)
      .order("created_at", { ascending: true })
      .limit(50);

    const dbModels = (data as ModelRecord[]) ?? [];

    // Use DB records; add local overrides for models that share DB IDs
    // (local paths load faster via Vercel CDN)
    const dbIds = new Set(dbModels.map((m) => m.id));
    const localOverrides = new Map(LOCAL_MODELS.map((m) => [m.id, m]));

    // Replace DB records with local versions where available (faster CDN path)
    const merged = dbModels.map((m) => localOverrides.get(m.id) ?? m);

    // Add any local models not already in DB results
    for (const lm of LOCAL_MODELS) {
      if (!dbIds.has(lm.id)) merged.push(lm);
    }

    setModels(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, refetch: fetchModels };
}
