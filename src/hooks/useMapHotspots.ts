import { useMemo } from "react";
import { useModels } from "@/hooks/useModels";

export interface MapHotspot {
  modelId: string;
  label: string;
  position: [number, number, number];
  description?: string;
}

/* Hotspot positions in the overview model's local coordinate space.
   Use Shift+Click in the map view to log coordinates, then paste here. */
const HOTSPOT_POSITIONS: Record<string, [number, number, number]> = {
  "Peatland.glb":         [0.0, 0.5, -0.3],
  "Composite Dams.glb":   [-0.6, 0.5, 0.4],
  "Stone Dam.glb":        [0.5, 0.5, 0.5],
};

const OVERVIEW_MODEL_PREFIX = "Glashapullagh Jan 2025";

export function useMapHotspots() {
  const { models, loading } = useModels();

  const hotspots = useMemo<MapHotspot[]>(() => {
    if (loading || models.length === 0) return [];
    return models
      .filter((m) => !m.name.startsWith(OVERVIEW_MODEL_PREFIX))
      .map((m) => {
        const pos =
          HOTSPOT_POSITIONS[m.name] ??
          HOTSPOT_POSITIONS[m.name.replace(/\.glb$/i, "") + ".glb"] ??
          [Math.random() * 3 - 1.5, 0.5, Math.random() * 3 - 1.5];
        return {
          modelId: m.id,
          label: m.name.replace(/\.glb$/i, ""),
          position: pos as [number, number, number],
        };
      });
  }, [models, loading]);

  /* Prefer the cropped variant (smaller file, less GPU memory). */
  const overviewModel = useMemo(() => {
    const cropped = models.find(
      (m) =>
        m.name.toLowerCase().includes("cropped") &&
        m.name.startsWith(OVERVIEW_MODEL_PREFIX)
    );
    if (cropped) return cropped;
    return models.find((m) => m.name.startsWith(OVERVIEW_MODEL_PREFIX)) ?? null;
  }, [models]);

  return { hotspots, overviewModel, loading };
}
