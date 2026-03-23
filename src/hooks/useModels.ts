import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelRecord } from "@/components/ModelLibrary";

/**
 * Fetches the public model catalogue from Supabase.
 *
 * If the `is_default` column exists it is included so the UI can
 * highlight which model loads on first visit. The column is optional
 * — the query gracefully falls back if the migration hasn't been
 * applied yet.
 */
export function useModels() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoading(true);

    // Try fetching with is_default first; fall back if column missing
    let { data, error } = await supabase
      .from("models")
      .select("id, name, storage_path, file_size, created_at, thumbnail_path, is_default")
      .eq("is_public", true)
      .order("created_at", { ascending: true });

    if (error?.code === "42703") {
      // Column doesn't exist yet — fetch without it
      const fallback = await supabase
        .from("models")
        .select("id, name, storage_path, file_size, created_at, thumbnail_path")
        .eq("is_public", true)
        .order("created_at", { ascending: true });

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("Failed to fetch models:", error.message);
    }

    setModels((data as ModelRecord[]) ?? []);
    setLoading(false);
  }, []);

  /** Set a model as the default (clears any previous default via DB trigger). */
  const setDefaultModel = useCallback(async (modelId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("models")
      .update({ is_default: true } as any)
      .eq("id", modelId);

    if (error) {
      console.error("Failed to set default model:", error.message);
      return false;
    }

    await fetchModels();
    return true;
  }, [fetchModels]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, refetch: fetchModels, setDefaultModel };
}
