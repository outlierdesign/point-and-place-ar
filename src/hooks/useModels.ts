import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelRecord } from "@/components/ModelLibrary";

/**
 * Fetches the public model catalogue from Supabase.
 *
 * Local (Vercel-hosted) models are already registered in the `models`
 * table with real UUIDs so annotations foreign-keys work correctly.
 */
export function useModels() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("models")
      .select("id, name, storage_path, file_size, created_at, thumbnail_path")
      .eq("is_public", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch models:", error.message);
    }

    setModels((data as ModelRecord[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, refetch: fetchModels };
}
