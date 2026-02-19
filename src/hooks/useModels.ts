import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ModelRecord } from "@/components/ModelLibrary";

export function useModels() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("models")
      .select("id, name, storage_path, file_size, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: true })
      .limit(6);
    setModels((data as ModelRecord[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, refetch: fetchModels };
}
