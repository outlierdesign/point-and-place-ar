import { useState, useCallback, useEffect, Suspense } from "react";
import { Layers, Crosshair, Info, Maximize2 } from "lucide-react";
import ModelViewer from "@/components/ModelViewer";
import AnnotationPanel from "@/components/AnnotationPanel";
import { Annotation } from "@/components/AnnotationPin";

let idCounter = 0;
const genId = () => `ann_${Date.now()}_${idCounter++}`;

export default function Index() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [pendingPos, setPendingPos] = useState<[number, number, number] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [arSupported, setArSupported] = useState<boolean | null>(null);

  // Check WebXR AR support
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then(setArSupported);
    } else {
      setArSupported(false);
    }
  }, []);

  // ESC to cancel placing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPlacingMode(false);
        setPendingPos(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handlePlace = useCallback((pos: [number, number, number]) => {
    setPendingPos(pos);
    setIsPlacingMode(false);
    setNewLabel("");
    setNewDesc("");
  }, []);

  const confirmAnnotation = () => {
    if (!pendingPos) return;
    const ann: Annotation = {
      id: genId(),
      position: pendingPos,
      label: newLabel || "Point of Interest",
      description: newDesc,
    };
    setAnnotations((prev) => [...prev, ann]);
    setSelectedId(ann.id);
    setPendingPos(null);
  };

  const handleDelete = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleUpdate = (id: string, label: string, description: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, label, description } : a))
    );
  };

  const handleClearAll = () => {
    setAnnotations([]);
    setSelectedId(null);
  };

  const handleAR = async () => {
    if (!arSupported) return;
    // Initiate WebXR AR session
    try {
      const session = await (navigator.xr as any).requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
      });
      session.end();
      alert("AR session started! Full AR integration requires a mobile device with ARCore/ARKit support.");
    } catch {
      alert("Could not start AR session. Please use a compatible mobile device.");
    }
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden relative" style={{ background: "hsl(var(--background))" }}>
      {/* Scanline overlay */}
      <div className="scanline absolute inset-0 pointer-events-none z-10" />

      {/* 3D Canvas — full background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="font-mono text-xs tracking-widest" style={{ color: "hsl(var(--cyan))" }}>
              LOADING MODEL...
            </div>
          </div>
        }>
          <ModelViewer
            annotations={annotations}
            selectedId={selectedId}
            isPlacingMode={isPlacingMode}
            onPlace={handlePlace}
            onSelectAnnotation={setSelectedId}
            onDeleteAnnotation={handleDelete}
          />
        </Suspense>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="glass-panel flex items-center gap-3 px-4 py-2 rounded-lg">
          <Layers size={14} style={{ color: "hsl(var(--cyan))" }} />
          <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--foreground))" }}>
            AR Model Viewer
          </span>
          <div className="w-px h-3 mx-1" style={{ background: "hsl(var(--glass-border))" }} />
          <span className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            DamagedHelmet.glTF
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AR Button */}
          <button
            className={`glass-panel px-3 py-2 rounded-lg flex items-center gap-2 font-mono text-xs transition-all duration-200 ${
              arSupported ? "btn-ghost-cyan" : "opacity-40 cursor-not-allowed"
            }`}
            onClick={handleAR}
            disabled={!arSupported}
            title={arSupported ? "Enter AR mode" : "AR not supported on this device"}
          >
            <Crosshair size={12} />
            <span className="tracking-widest uppercase">
              {arSupported === null ? "Checking AR..." : arSupported ? "Enter AR" : "AR Unavailable"}
            </span>
          </button>

          <button className="glass-panel p-2 rounded-lg" style={{ color: "hsl(var(--muted-foreground))" }}>
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Bottom-left: Controls hint */}
      <div className="absolute bottom-5 left-5 z-20 glass-panel px-3 py-2 rounded-lg">
        <div className="font-mono space-y-1" style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>
          <div><span style={{ color: "hsl(var(--cyan))" }}>Drag</span> — Orbit</div>
          <div><span style={{ color: "hsl(var(--cyan))" }}>Scroll</span> — Zoom</div>
          <div><span style={{ color: "hsl(var(--cyan))" }}>Right drag</span> — Pan</div>
          {isPlacingMode && (
            <div className="fade-in" style={{ color: "hsl(var(--cyan))" }}>
              Click model to place pin
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Annotations */}
      <div className="absolute right-5 top-16 bottom-5 z-20 w-64 flex flex-col">
        <AnnotationPanel
          annotations={annotations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          isPlacingMode={isPlacingMode}
          onTogglePlacingMode={() => setIsPlacingMode((v) => !v)}
          onClearAll={handleClearAll}
        />
      </div>

      {/* Pending annotation modal */}
      {pendingPos && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "hsl(220 20% 4% / 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="glass-panel rounded-xl p-6 w-80 fade-in space-y-4">
            <div className="flex items-center gap-2">
              <Info size={14} style={{ color: "hsl(var(--cyan))" }} />
              <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--cyan))" }}>
                New Annotation
              </span>
            </div>
            <div className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Position: {pendingPos.map((v) => v.toFixed(3)).join(", ")}
            </div>
            <input
              className="w-full bg-transparent border rounded px-3 py-2 font-mono text-sm outline-none"
              style={{
                borderColor: "hsl(var(--glass-border))",
                color: "hsl(var(--foreground))",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
              }}
              placeholder="Label (e.g. Visor, Damage Point)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "hsl(var(--cyan))")}
              onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && confirmAnnotation()}
            />
            <textarea
              className="w-full bg-transparent border rounded px-3 py-2 font-mono text-xs outline-none resize-none"
              style={{
                borderColor: "hsl(var(--glass-border))",
                color: "hsl(200, 15%, 65%)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                height: 64,
              }}
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "hsl(var(--cyan))")}
              onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
            />
            <div className="flex gap-2">
              <button className="btn-cyan flex-1 py-2 rounded-md" onClick={confirmAnnotation}>
                Place Pin
              </button>
              <button
                className="btn-ghost-cyan px-4 py-2 rounded-md"
                onClick={() => setPendingPos(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
