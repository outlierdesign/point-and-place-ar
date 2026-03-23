import { useEffect, useState, Suspense } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ModelViewer from "@/components/ModelViewer";
import { Annotation } from "@/components/AnnotationPin";
import { ModelRecord } from "@/components/ModelLibrary";
import { useProgressiveModel } from "@/hooks/useProgressiveModel";
import { Info, X, Layers } from "lucide-react";

function rowToAnnotation(row: {
  id: string; label: string; description: string | null;
  position_x: number; position_y: number; position_z: number;
  media_url?: string | null; video_url?: string | null;
}): Annotation {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? "",
    position: [row.position_x, row.position_y, row.position_z],
    media_url: row.media_url ?? undefined,
    video_url: row.video_url ?? undefined,
  };
}

let idCounter = 0;
const genId = () => `ann_${Date.now()}_${idCounter++}`;

export default function Embed() {
  const { modelId } = useParams<{ modelId: string }>();
  const [model, setModel] = useState<ModelRecord | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const { isReady: modelReady, blobUrl: modelBlobUrl, arrayBuffer: modelArrayBuffer } = useProgressiveModel({ url: modelUrl });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [pendingPos, setPendingPos] = useState<[number, number, number] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!modelId) return;
    (async () => {
      const { data: m } = await supabase
        .from("models")
        .select("id, name, storage_path, file_size, created_at")
        .eq("id", modelId)
        .eq("is_public", true)
        .maybeSingle();

      if (!m) { setNotFound(true); return; }
      setModel(m as ModelRecord);
      const sp = (m as ModelRecord).storage_path;
      const base = window.location.pathname.startsWith('/viewer') ? '/viewer' : '';
      const resolvedUrl = sp.startsWith('/models/') ? `${base}${sp}` : supabase.storage.from("models").getPublicUrl(sp).data.publicUrl;
      setModelUrl(resolvedUrl);

      const { data: anns } = await supabase
        .from("annotations")
        .select("id, label, description, position_x, position_y, position_z, media_url, video_url")
        .eq("model_id", modelId)
        .order("created_at", { ascending: true });
      setAnnotations((anns ?? []).map(rowToAnnotation));
    })();
  }, [modelId]);

  const handlePlace = (pos: [number, number, number]) => {
    setPendingPos(pos);
    setIsPlacingMode(false);
    setNewLabel("");
    setNewDesc("");
  };

  const confirmAnnotation = async () => {
    if (!pendingPos || !modelId) return;
    const { data } = await supabase
      .from("annotations")
      .insert({
        model_id: modelId,
        user_id: null,
        label: newLabel || "Point of Interest",
        description: newDesc || null,
        position_x: pendingPos[0],
        position_y: pendingPos[1],
        position_z: pendingPos[2],
      })
      .select("id, label, description, position_x, position_y, position_z")
      .single();

    if (data) {
      const ann = rowToAnnotation(data);
      setAnnotations((prev) => [...prev, ann]);
      setSelectedId(ann.id);
    }
    setPendingPos(null);
  };

  if (notFound) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
        <div className="font-mono text-xs text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
          Model not found or unavailable.
        </div>
      </div>
    );
  }

  if (!modelUrl) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--gold))", borderTopColor: "transparent" }} />
          <div className="font-mono text-xs tracking-widest" style={{ color: "hsl(var(--gold))" }}>LOADING...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex overflow-hidden relative" style={{ background: "hsl(var(--background))" }}>
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div />}>
          {modelReady && <ModelViewer
            modelUrl={modelBlobUrl || modelUrl}
            originalUrl={modelUrl}
            arrayBuffer={modelArrayBuffer}
            modelKey={`embed_${modelId}`}
            annotations={annotations}
            selectedId={selectedId}
            isPlacingMode={isPlacingMode}
            onPlace={handlePlace}
            onSelectAnnotation={setSelectedId}
            onDeleteAnnotation={() => {}}
          />}
        </Suspense>
      </div>

      {/* Minimal top bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between">
        <div className="glass-panel flex items-center gap-2 px-3 py-1.5">
          <Layers size={12} style={{ color: "hsl(var(--gold))" }} />
          <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--foreground))" }}>
            {model?.name ?? "Model Viewer"}
          </span>
        </div>

        {/* Embed is view-only — no add pin button */}
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 left-3 z-20 glass-panel px-3 py-2">
        <div className="font-mono space-y-0.5" style={{ fontSize: 9, color: "hsl(var(--muted-foreground))" }}>
          <div><span style={{ color: "hsl(var(--gold))" }}>Drag</span> — Orbit</div>
          <div><span style={{ color: "hsl(var(--gold))" }}>Scroll</span> — Zoom</div>
          <div><span style={{ color: "hsl(var(--gold))" }}>Right drag</span> — Pan</div>
        </div>
      </div>

      {/* Pending annotation modal */}
      {pendingPos && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "hsl(var(--muted) / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="glass-panel p-6 w-80 fade-in space-y-4">
            <div className="flex items-center gap-2">
              <Info size={14} style={{ color: "hsl(var(--gold))" }} />
              <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--gold))" }}>
                New Annotation
              </span>
            </div>
            <input
              className="w-full bg-transparent border px-3 py-2 font-mono text-sm outline-none"
              style={{ borderColor: "hsl(var(--glass-border))", color: "hsl(var(--foreground))", fontSize: 13 }}
              placeholder="Label (e.g. Field boundary, Gate)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "hsl(var(--gold))")}
              onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && confirmAnnotation()}
            />
            <textarea
              className="w-full bg-transparent border px-3 py-2 font-mono text-xs outline-none resize-none"
              style={{ borderColor: "hsl(var(--glass-border))", color: "hsl(var(--muted-foreground))", fontSize: 11, height: 56 }}
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "hsl(var(--gold))")}
              onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
            />
            <div className="flex gap-2">
              <button className="btn-cyan flex-1 py-2" onClick={confirmAnnotation}>Place Pin</button>
              <button className="btn-ghost-cyan px-4 py-2" onClick={() => setPendingPos(null)}>
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
