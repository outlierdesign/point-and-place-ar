import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelRecord } from "@/components/ModelLibrary";

/**
 * DRACO-optimised models served from Vercel public directory.
 * These load 85-94 % faster than the original Supabase-hosted files.
 */
const LOCAL_MODELS: ModelRecord[] = [
  {
    id: "local-geotextile",
    name: "Geotextile",
    storage_path: "/models/Geotextile.glb",
    file_size: 1228800,
    created_at: "2026-03-22T12:33:00Z",
    thumbnail_path: null,
  },
  {
    id: "local-reprofiling-peat",
    name: "Reprofiling Peat",
    storage_path: "/models/Reprofiling_Peat.glb",
    file_size: 3100000,
    created_at: "2026-03-22T12:37:00Z",
    thumbnail_path: null,
  },
  {
    id: "local-stone-dams",
    name: "Stone Dams",
    storage_path: "/models/Stone_Dams.glb",
    file_size: 1750000,
    created_at: "2026-03-22T12:39:00Z",
    thumbnail_path: null,
  },
  {
    id: "local-timber-dams",
    name: "Timber Dams",
    storage_path: "/models/Timber_Dams.glb",
    file_size: 1750000,
    created_at: "2026-03-22T12:25:00Z",
    thumbnail_path: null,
  },
  {
    id: "local-coir-logs",
    name: "Coir Logs",
    storage_path: "/models/Coir_Logs.glb",
    file_size: 2570000,
    created_at: "2026-03-23T11:56:00Z",
    thumbnail_path: null,
  },
  {
    id: "local-composite-timber-dam",
    name: "Composite Timber Dam",
    storage_path: "/models/Composite_Timber_Dam.glb",
    file_size: 2860000,
    created_at: "2026-03-23T11:52:00Z",
    thumbnail_path: null,
  },
  {
    id: "local-restoration-area",
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
      .limit(10);

    const dbModels = (data as ModelRecord[]) ?? [];

    // Merge: Supabase models first, then local DRACO-optimised models
    setModels([...dbModels, ...LOCAL_MODELS]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, refetch: fetchModels };
}
