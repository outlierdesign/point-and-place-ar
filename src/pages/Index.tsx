import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { Layers, Crosshair, Info, Maximize2, FolderOpen, X, LogOut, LogIn, ShieldCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ModelViewer, { DEFAULT_MODEL_URL } from "@/components/ModelViewer";
import AnnotationPanel from "@/components/AnnotationPanel";
import ModelLibrary from "@/components/ModelLibrary";
import { Annotation } from "@/components/AnnotationPin";
import { useAuth } from "@/hooks/useAuth";
import { useModels } from "@/hooks/useModels";
import { useAnnotations } from "@/hooks/useAnnotations";
import { ModelRecord } from "@/components/ModelLibrary";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_MODEL_NAME = "DamagedHelmet.glTF";

export default function Index() {
  const { user, isAdmin, loading: authLoading, signOut, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const { models, loading: modelsLoading, refetch: refetchModels } = useModels();

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [pendingPos, setPendingPos] = useState<[number, number, number] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [arSupported, setArSupported] = useState<boolean | null>(null);

  // Claim admin state
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Model display state
  const [modelUrl, setModelUrl] = useState(DEFAULT_MODEL_URL);
  const [modelKey, setModelKey] = useState("default");
  const [modelName, setModelName] = useState(DEFAULT_MODEL_NAME);
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const { annotations, addAnnotation, updateAnnotation, deleteAnnotation, clearAll } =
    useAnnotations(selectedModelId);

  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then(setArSupported);
    } else {
      setArSupported(false);
    }
  }, []);

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

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const loadFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "gltf" && ext !== "glb") {
      setLoadError(`Unsupported file type ".${ext}". Please drop a .gltf or .glb file.`);
      return;
    }
    setLoadError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSelectedModelId(null);
    setSelectedId(null);
    setModelUrl(url);
    setModelKey(`custom_${Date.now()}`);
    setModelName(file.name);
  }, []);

  const handleSelectModel = useCallback((model: ModelRecord, url: string) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSelectedId(null);
    setIsPlacingMode(false);
    setPendingPos(null);
    setSelectedModelId(model.id);
    setModelUrl(url);
    setModelKey(`db_${model.id}`);
    setModelName(model.name);
    setLoadError(null);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
      e.target.value = "";
    },
    [loadFile]
  );

  const handlePlace = useCallback((pos: [number, number, number]) => {
    setPendingPos(pos);
    setIsPlacingMode(false);
    setNewLabel("");
    setNewDesc("");
  }, []);

  const confirmAnnotation = async () => {
    if (!pendingPos) return;
    const ann = await addAnnotation(pendingPos, newLabel, newDesc);
    if (ann) setSelectedId(ann.id);
    setPendingPos(null);
  };

  const handleClaimAdmin = async () => {
    setClaiming(true);
    setClaimError(null);
    const { error } = await supabase.rpc("claim_admin" as never);
    if (error) {
      setClaimError(error.message);
    } else {
      await refreshAuth();
    }
    setClaiming(false);
  };

  const handleAR = async () => {
    if (!arSupported) return;
    try {
      const session = await (navigator.xr as unknown as { requestSession: (type: string, opts: object) => Promise<{ end: () => void }> }).requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
      });
      session.end();
      alert("AR session started! Full AR integration requires a mobile device with ARCore/ARKit support.");
    } catch {
      alert("Could not start AR session. Please use a compatible mobile device.");
    }
  };

  const embedUrl = selectedModelId
    ? `${window.location.origin}/embed/${selectedModelId}`
    : null;

  const copyEmbedUrl = () => {
    if (embedUrl) {
      navigator.clipboard.writeText(
        `<iframe src="${embedUrl}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`
      );
      alert("Embed code copied to clipboard!");
    }
  };

  if (authLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
        <div className="w-6 h-6 border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--gold))", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen flex overflow-hidden relative"
      style={{ background: "hsl(var(--background))" }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input ref={fileInputRef} type="file" accept=".gltf,.glb" className="hidden" onChange={handleFileInput} />

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--gold))", borderTopColor: "transparent" }} />
                <div className="font-mono text-xs tracking-widest" style={{ color: "hsl(var(--gold))" }}>LOADING MODEL...</div>
              </div>
            </div>
          }
        >
          <ModelViewer
            modelUrl={modelUrl}
            modelKey={modelKey}
            annotations={annotations}
            selectedId={selectedId}
            isPlacingMode={isPlacingMode}
            onPlace={handlePlace}
            onSelectAnnotation={setSelectedId}
            onDeleteAnnotation={deleteAnnotation}
          />
        </Suspense>
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center fade-in pointer-events-none" style={{ background: "hsl(var(--muted) / 0.85)", backdropFilter: "blur(8px)" }}>
          <div className="flex flex-col items-center gap-4 p-12" style={{ border: "2px dashed hsl(var(--gold))", boxShadow: "0 0 40px hsl(var(--gold) / 0.2)" }}>
            <FolderOpen size={40} style={{ color: "hsl(var(--gold))", filter: "drop-shadow(0 0 12px hsl(36 58% 41% / 0.6))" }} />
            <div className="font-mono font-bold tracking-widest uppercase" style={{ color: "hsl(var(--gold))" }}>Drop Model Here</div>
            <div className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Supports .gltf and .glb files</div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3">
        <div className="glass-panel flex items-center gap-3 px-4 py-2">
          <Layers size={14} style={{ color: "hsl(var(--gold))" }} />
          <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--foreground))" }}>
            Acres Ireland
          </span>
          <div className="w-px h-3 mx-1" style={{ background: "hsl(var(--glass-border))" }} />
          <span className="font-mono text-xs max-w-48 truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
            {modelName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button className="glass-panel btn-ghost-cyan px-3 py-2 flex items-center gap-2" onClick={() => fileInputRef.current?.click()} title="Load a local GLTF or GLB file">
              <FolderOpen size={12} />
              <span className="tracking-widest uppercase text-xs">Load Local</span>
            </button>
          )}

          {embedUrl && (
            <button className="glass-panel btn-ghost-cyan px-3 py-2 flex items-center gap-2" onClick={copyEmbedUrl} title="Copy embed code">
              <span className="text-xs tracking-widest uppercase">&lt;/&gt; Embed</span>
            </button>
          )}

          <button
            className={`glass-panel px-3 py-2 flex items-center gap-2 text-xs transition-all duration-200 ${arSupported ? "btn-ghost-cyan" : "opacity-40 cursor-not-allowed"}`}
            onClick={handleAR}
            disabled={!arSupported}
            title={arSupported ? "Enter AR mode" : "AR not supported on this device"}
          >
            <Crosshair size={12} />
            <span className="tracking-widest uppercase">
              {arSupported === null ? "Checking..." : arSupported ? "Enter AR" : "AR N/A"}
            </span>
          </button>

          <button className="glass-panel p-2" style={{ color: "hsl(var(--muted-foreground))" }}>
            <Maximize2 size={14} />
          </button>

          {user ? (
            <button
              className="glass-panel btn-ghost-cyan px-3 py-2 flex items-center gap-2"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut size={12} />
              <span className="tracking-widest uppercase text-xs">Sign Out</span>
            </button>
          ) : (
            <button
              className="glass-panel btn-ghost-cyan px-3 py-2 flex items-center gap-2"
              onClick={() => navigate("/auth")}
              title="Sign in"
            >
              <LogIn size={12} />
              <span className="tracking-widest uppercase text-xs">Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom-left controls hint */}
      <div className="absolute bottom-5 left-5 z-20 glass-panel px-3 py-2">
        <div className="font-mono space-y-1" style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>
          <div><span style={{ color: "hsl(var(--gold))" }}>Drag</span> — Orbit</div>
          <div><span style={{ color: "hsl(var(--gold))" }}>Scroll</span> — Zoom</div>
          <div><span style={{ color: "hsl(var(--gold))" }}>Right drag</span> — Pan</div>
          {isAdmin && (
            <div style={{ borderTop: "1px solid hsl(var(--glass-border))", paddingTop: 4, marginTop: 2 }}>
              <span style={{ color: "hsl(var(--gold))" }}>Drop</span> .gltf / .glb to load
            </div>
          )}
          {isPlacingMode && (
            <div className="fade-in" style={{ color: "hsl(var(--gold))" }}>Click model to place pin</div>
          )}
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 glass-panel px-4 py-3 flex items-center gap-3 fade-in" style={{ borderColor: "hsl(var(--destructive) / 0.5)" }}>
          <X size={12} style={{ color: "hsl(var(--destructive))" }} />
          <span className="font-mono text-xs" style={{ color: "hsl(var(--foreground))" }}>{loadError}</span>
          <button onClick={() => setLoadError(null)} className="ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>
            <X size={10} />
          </button>
        </div>
      )}

      {/* Left panel — Model Library */}
      <div className="absolute left-5 top-16 bottom-5 z-20 w-56 flex flex-col gap-2">
        <ModelLibrary
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModel}
          onRefresh={refetchModels}
        />

        {/* Claim Admin — first-run only */}
        {user && !isAdmin && (
          <div className="glass-panel p-3 space-y-2">
            <p className="font-mono text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}>
              No admin yet? Claim access to upload models.
            </p>
            {claimError && (
              <p className="font-mono text-xs" style={{ color: "hsl(var(--destructive))", fontSize: 10 }}>{claimError}</p>
            )}
            <button
              className="btn-cyan w-full py-2 flex items-center justify-center gap-2 text-xs"
              onClick={handleClaimAdmin}
              disabled={claiming}
            >
              {claiming ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
              {claiming ? "Claiming..." : "Claim Admin Access"}
            </button>
          </div>
        )}
      </div>

      {/* Right panel — Annotations */}
      <div className="absolute right-5 top-16 bottom-5 z-20 w-64 flex flex-col">
        <AnnotationPanel
          annotations={annotations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={deleteAnnotation}
          onUpdate={updateAnnotation}
          isPlacingMode={isPlacingMode}
          onTogglePlacingMode={() => setIsPlacingMode((v) => !v)}
          onClearAll={clearAll}
        />
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
            <div className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Position: {pendingPos.map((v) => v.toFixed(3)).join(", ")}
            </div>
            <input
              className="w-full bg-transparent border px-3 py-2 font-mono text-sm outline-none"
              style={{ borderColor: "hsl(var(--glass-border))", color: "hsl(var(--foreground))", fontSize: 13 }}
              placeholder="Label (e.g. Visor, Damage Point)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "hsl(var(--gold))")}
              onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && confirmAnnotation()}
            />
            <textarea
              className="w-full bg-transparent border px-3 py-2 font-mono text-xs outline-none resize-none"
              style={{ borderColor: "hsl(var(--glass-border))", color: "hsl(var(--muted-foreground))", fontSize: 11, height: 64 }}
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "hsl(var(--gold))")}
              onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
            />
            <div className="flex gap-2">
              <button className="btn-cyan flex-1 py-2" onClick={confirmAnnotation}>Place Pin</button>
              <button className="btn-ghost-cyan px-4 py-2" onClick={() => setPendingPos(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
