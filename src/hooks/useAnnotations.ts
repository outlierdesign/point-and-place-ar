import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Annotation } from "@/components/AnnotationPin";
import { useAuth } from "@/hooks/useAuth";

// Convert DB row → Annotation
function rowToAnnotation(row: {
  id: string;
  label: string;
  description: string | null;
  position_x: number;
  position_y: number;
  position_z: number;
  media_url?: string | null;
  video_url?: string | null;
  tooltip_type?: string | null;
  linked_model_id?: string | null;
}): Annotation {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    position: [row.position_x, row.position_y, row.position_z],
    media_url: row.media_url ?? undefined,
    video_url: row.video_url ?? undefined,
    tooltip_type: (row.tooltip_type === "link" ? "link" : "info") as Annotation["tooltip_type"],
    linked_model_id: row.linked_model_id ?? undefined,
  };
}

export function useAnnotations(modelId: string | null) {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnnotations = useCallback(async () => {
    if (!modelId) { setAnnotations([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("annotations")
      .select("id, label, description, position_x, position_y, position_z, media_url, video_url")
      .eq("model_id", modelId)
      .order("created_at", { ascending: true });
    setAnnotations((data ?? []).map(rowToAnnotation));
    setLoading(false);
  }, [modelId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const addAnnotation = useCallback(async (
    position: [number, number, number],
    label: string,
    description: string,
    media_url?: string,
    video_url?: string,
  ): Promise<Annotation | null> => {
    if (!modelId) return null;

    const { data, error } = await supabase
      .from("annotations")
      .insert({
        model_id: modelId,
        user_id: user?.id ?? null,
        label: label || "Point of Interest",
        description: description || null,
        position_x: position[0],
        position_y: position[1],
        position_z: position[2],
        media_url: media_url || null,
        video_url: video_url || null,
      })
      .select("id, label, description, position_x, position_y, position_z, media_url, video_url")
      .single();

    if (error || !data) return null;
    const ann = rowToAnnotation(data);
    setAnnotations((prev) => [...prev, ann]);
    return ann;
  }, [modelId, user]);

  const updateAnnotation = useCallback(async (
    id: string,
    label: string,
    description: string,
    media_url?: string,
    video_url?: string,
  ) => {
    await supabase
      .from("annotations")
      .update({
        label,
        description: description || null,
        media_url: media_url || null,
        video_url: video_url || null,
      })
      .eq("id", id);
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, label, description, media_url, video_url } : a
      )
    );
  }, []);

  const deleteAnnotation = useCallback(async (id: string) => {
    await supabase.from("annotations").delete().eq("id", id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    if (!modelId) return;
    await supabase.from("annotations").delete().eq("model_id", modelId);
    setAnnotations([]);
  }, [modelId]);

  return {
    annotations,
    loading,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAll,
    refetch: fetchAnnotations,
  };
}
