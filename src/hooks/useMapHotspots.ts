import { useMemo } from "react";
import { useModels } from "@/hooks/useModels";

export interface MapHotspot {
  modelId: string;
  label: string;
  position: [number, number, number];
  description?: string;
}

// Hardcoded positions on the Glashapullagh overview model.
// To find new positions: hold Shift + Click on the overview model
// and check the browser console for logged coordinates.
const HOTSPOT_POSITIONS: Record<string, [number, number, number]> = {
  "Peatland.glb":         [1.2, 0.8, -0.5],
  "Composite Dams.glb":   [-1.5, 0.6, 1.0],
  "Stone Dam.glb":        [0.3, 0.7, 1.8],
};

// The overview model prefix — models matching this are excluded from hotspots.
// We prefer the "cropped" variant (smaller file, less GPU memory).
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

  // Prefer the cropped version of the overview model (smaller, less GPU memory).
  // Fall back to the full version if cropped is not available.
  const overviewModel = useMemo(() => {
    const cropped = models.find((m) =>
      m.name.toLowerCase().includes("cropped") &&
      m.name.startsWith(OVERVIEW_MODEL_PREFIX)
    );
    if (cropped) return cropped;
    return models.find((m) => m.name.startsWith(OVERVIEW_MODEL_PREFIX)) ?? null;
  }, [models]);

  return { hotspots, overviewModel, loading };
}
