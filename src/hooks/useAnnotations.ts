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
  const [error, setError] = useState<string | null>(null);

  const fetchAnnotations = useCallback(async () => {
    if (!modelId) { setAnnotations([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from("annotations")
      .select("id, label, description, position_x, position_y, position_z, media_url, video_url, tooltip_type, linked_model_id")
      .eq("model_id", modelId)
      .order("created_at", { ascending: true });

    if (fetchErr) {
      console.error("Failed to fetch annotations:", fetchErr.message);
      setError(fetchErr.message);
    }
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
    tooltip_type?: string,
    linked_model_id?: string,
  ): Promise<Annotation | null> => {
    if (!modelId) {
      setError("Cannot save annotations: no model selected.");
      return null;
    }
    setError(null);

    const { data, error: insertErr } = await supabase
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
        tooltip_type: tooltip_type || "info",
        linked_model_id: linked_model_id || null,
      })
      .select("id, label, description, position_x, position_y, position_z, media_url, video_url, tooltip_type, linked_model_id")
      .single();

    if (insertErr || !data) {
      const msg = insertErr?.message ?? "Unknown error creating annotation";
      console.error("Failed to create annotation:", msg);
      setError(msg);
      return null;
    }

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
    tooltip_type?: string,
    linked_model_id?: string,
  ): Promise<boolean> => {
    setError(null);
    const { error: updateErr } = await supabase
      .from("annotations")
      .update({
        label,
        description: description || null,
        media_url: media_url || null,
        video_url: video_url || null,
        tooltip_type: tooltip_type || "info",
        linked_model_id: linked_model_id || null,
      })
      .eq("id", id);

    if (updateErr) {
      console.error("Failed to update annotation:", updateErr.message);
      setError(updateErr.message);
      return false;
    }

    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, label, description, media_url, video_url, tooltip_type: tooltip_type as Annotation["tooltip_type"], linked_model_id }
          : a
      )
    );
    return true;
  }, []);

  const deleteAnnotation = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    const { error: deleteErr } = await supabase
      .from("annotations")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("Failed to delete annotation:", deleteErr.message);
      setError(deleteErr.message);
      return false;
    }

    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    return true;
  }, []);

  const clearAll = useCallback(async (): Promise<boolean> => {
    if (!modelId) return false;
    setError(null);
    const { error: deleteErr } = await supabase
      .from("annotations")
      .delete()
      .eq("model_id", modelId);

    if (deleteErr) {
      console.error("Failed to clear annotations:", deleteErr.message);
      setError(deleteErr.message);
      return false;
    }

    setAnnotations([]);
    return true;
  }, [modelId]);

  return {
    annotations,
    loading,
    error,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAll,
    refetch: fetchAnnotations,
  };
}
