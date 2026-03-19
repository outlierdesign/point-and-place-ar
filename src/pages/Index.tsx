import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from "react";
import { Layers, Crosshair, Info, Maximize2, FolderOpen, X, LogOut, LogIn, MapPin, Download, Loader2, ArrowLeft, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ModelViewer from "@/components/ModelViewer";
import AnnotationPanel from "@/components/AnnotationPanel";
import ModelLibrary from "@/components/ModelLibrary";
import { Annotation } from "@/components/AnnotationPin";
import { useAuth } from "@/hooks/useAuth";
import { useModels } from "@/hooks/useModels";
import { useAnnotations } from "@/hooks/useAnnotations";
import { ModelRecord } from "@/components/ModelLibrary";
import { supabase } from "@/integrations/supabase/client";
import ModelLoadingOverlay from "@/components/ModelLoadingOverlay";
import { useProgressiveModel } from "@/hooks/useProgressiveModel";

function buildLinkedAnnotations(
  annotations: Annotation[],
  models: ModelRecord[],
  currentModelId: string | null
): Annotation[] {
  const nameToId = new Map<string, string>();
  for (const m of models) {
    if (m.id === currentModelId) continue;
    const normalised = m.name.replace(/\.glb$/i, "").trim().toLowerCase();
    nameToId.set(normalised, m.id);
  }
  return annotations.map((ann) => {
    const normLabel = ann.label.trim().toLowerCase();
    const matchedId = nameToId.get(normLabel);
    if (matchedId) {
      return { ...ann, linked_model_id: matchedId };
    }
    return ann;
  });
}

export default function Index() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { models, loading: modelsLoading, refetch: refetchModels } = useModels();

  const [parentModelId, setParentModelId] = useState<string | null>(null);
  const [zoomTarget, setZoomTarget] = useState<{ position: [number, number, number] } | null>(null);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [pendingChildModelId, setPendingChildModelId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [pendingPos, setPendingPos] = useState<[number, number, number] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newTooltipType, setNewTooltipType] = useState<"info" | "link">("info");
  const [newLinkedModelId, setNewLinkedModelId] = useState("");
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const { progress: modelProgress, isReady: modelReady, blobUrl: modelBlobUrl } = useProgressiveModel({ url: modelUrl });
  const [modelKey, setModelKey] = useState("default");
  const [modelName, setModelName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const arQuickLookRef = useRef<HTMLAnchorElement>(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const modelUrlIsPublic = !!modelUrl && modelUrl.startsWith("https://");
  const iosArAvailable = isIOS && modelUrlIsPublic;

  const getPublicUrl = useCallback((storagePath: string) => {
    const { data } = supabase.storage.from("models").getPublicUrl(storagePath);
    return data.publicUrl;
  }, []);

  const { annotations, addAnnotation, updateAnnotation, deleteAnnotation, clearAll } = useAnnotations(selectedModelId);

  const linkedModelIds = useMemo(() => {
    const ids = new Set<string>();
    models.forEach((m) => { if (m.id !== selectedModelId) ids.add(m.id); });
    return ids;
  }, [models, selectedModelId]);

  const enrichedAnnotations = useMemo(
    () => buildLinkedAnnotations(annotations, models, selectedModelId),
    [annotations, models, selectedModelId]
  );

  const handleExploreLinked = useCallback(
    (modelId: string, position: [number, number, number]) => {
      setPendingChildModelId(modelId);
      setZoomTarget({ position });
      setTimeout(() => setFadeOpacity(1), 400);
    },
    []
  );

  const handleZoomComplete = useCallback(() => {
    if (!pendingChildModelId) return;
    const model = models.find((m) => m.id === pendingChildModelId);
    if (!model) return;
    if (!parentModelId) setParentModelId(selectedModelId);
    const url = getPublicUrl(model.storage_path);
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
    setZoomTarget(null);
    setPendingChildModelId(null);
    setTimeout(() => setFadeOpacity(0), 300);
  }, [pendingChildModelId, models, getPublicUrl, parentModelId, selectedModelId]);

  const handleBackToParent = useCallback(() => {
    if (!parentModelId) return;
    const model = models.find((m) => m.id === parentModelId);
    if (!model) return;
    setFadeOpacity(1);
    setTimeout(() => {
      const url = getPublicUrl(model.storage_path);
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
      setParentModelId(null);
      setTimeout(() => setFadeOpacity(0), 300);
    }, 400);
  }, [parentModelId, models, getPublicUrl]);

  // Auto-select parent model on first load
  useEffect(() => {
    if (!modelsLoading && models.length > 0 && selectedModelId === null && modelUrl === null) {
      const overview = models.find((m) =>
        m.name.toLowerCase().startsWith("glashapullagh jan 2025")
      );
      const first = overview || models[0];
      const url = getPublicUrl(first.storage_path);
      setSelectedModelId(first.id);
      setModelUrl(url);
      setModelKey(`db_${first.id}`);
      setModelName(first.name);
    }
  }, [modelsLoading, models, selectedModelId, modelUrl, getPublicUrl]);

  // Check AR support
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then((supported) => setArSupported(supported)).catch(() => setArSupported(false));
    } else {
      setArSupported(false);
    }
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPlacingMode(false);
        setSelectedId(null);
        setPendingPos(null);
        setModelsOpen(false);
        setAnnotationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const loadFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setLoadError("Only .glb files are supported");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setModelUrl(url);
    setModelKey(file.name + "_" + Date.now());
    setModelName(file.name);
    setSelectedModelId(null);
    setParentModelId(null);
    setSelectedId(null);
    setIsPlacingMode(false);
    setPendingPos(null);
    setLoadError(null);
  }, []);

  const handleSelectModel = useCallback((model: ModelRecord) => {
    const url = getPublicUrl(model.storage_path);
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
    setParentModelId(null);
    setLoadError(null);
    setModelsOpen(false);
  }, [getPublicUrl]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = "";
  }, [loadFile]);

  const handlePlace = useCallback((pos: [number, number, number]) => {
    setPendingPos(pos);
  }, []);

  const confirmAnnotation = useCallback(async () => {
    if (!pendingPos || !newLabel.trim()) return;
    await addAnnotation(
      pendingPos, newLabel.trim(), newDesc.trim(),
      newTooltipType === "info" ? newMediaUrl.trim() : undefined,
      newTooltipType === "info" ? newVideoUrl.trim() : undefined,
      newTooltipType,
      newTooltipType === "link" ? newLinkedModelId : undefined,
    );
    setPendingPos(null);
    setNewLabel("");
    setNewDesc("");
    setNewMediaUrl("");
    setNewVideoUrl("");
    setNewTooltipType("info");
    setNewLinkedModelId("");
    setIsPlacingMode(false);
  }, [pendingPos, newLabel, newDesc, newMediaUrl, newVideoUrl, newTooltipType, newLinkedModelId, addAnnotation]);

  const handleAR = useCallback(() => {
    if (iosArAvailable && modelUrl) {
      if (arQuickLookRef.current) {
        arQuickLookRef.current.setAttribute("href", modelUrl);
        arQuickLookRef.current.click();
      }
      return;
    }
    if (!arSupported || !modelUrl) return;
    navigator.xr?.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test", "local-floor"],
      optionalFeatures: ["dom-overlay"],
    }).catch(console.error);
  }, [arSupported, modelUrl, iosArAvailable]);

  const handleExportUSDZ = useCallback(async () => {
    if (!modelUrl) return;
    setExporting(true);
    try {
      const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(modelBlobUrl || modelUrl, resolve, undefined, reject);
      });
      const exporter = new USDZExporter();
      const result = await (exporter as any).parse(gltf.scene);
      const arraybuffer = result instanceof ArrayBuffer ? result : new ArrayBuffer(0);
      const blob = new Blob([arraybuffer], { type: "model/vnd.usdz+zip" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = (modelName || "model").replace(/\.glb$/i, "") + ".usdz";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("USDZ export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [modelUrl, modelBlobUrl, modelName]);

  const copyEmbedUrl = useCallback(() => {
    if (!selectedModelId) return;
    const url = `${window.location.origin}/embed/${selectedModelId}`;
    navigator.clipboard.writeText(url).then(() => alert("Embed URL copied!"));
  }, [selectedModelId]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-background"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input ref={fileInputRef} type="file" accept=".glb" className="hidden" onChange={handleFileInput} />
      <a ref={arQuickLookRef} rel="ar" className="hidden"><img /></a>

      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-cyan-500/50 rounded-lg m-4">
          <div className="text-center">
            <FolderOpen className="mx-auto mb-2 text-cyan-400" size={48} />
            <p className="text-cyan-300 tracking-widest uppercase text-sm">Drop .glb file here</p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {modelUrl && !modelReady && (
        <ModelLoadingOverlay progress={modelProgress} modelName={modelName} />
      )}

      {/* 3D Canvas */}
      {modelUrl && modelReady ? (
        <ModelViewer
          modelUrl={modelUrl}
          originalUrl={modelUrl}
          modelKey={modelKey}
          annotations={enrichedAnnotations}
          selectedId={selectedId}
          isPlacingMode={isPlacingMode}
          onPlace={handlePlace}
          onSelectAnnotation={setSelectedId}
          onDeleteAnnotation={deleteAnnotation}
          onExploreLinked={handleExploreLinked}
          linkedModelIds={linkedModelIds}
          zoomTarget={zoomTarget}
          onZoomComplete={handleZoomComplete}
        />
      ) : !modelUrl ? (
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground tracking-widest uppercase text-sm">
              {modelsLoading ? "Loading models..." : "No model loaded"}
            </p>
            {!modelsLoading && (
              <button className="glass-panel px-4 py-2 text-cyan-400 hover:text-cyan-300 transition-colors tracking-widest uppercase text-xs" onClick={() => setModelsOpen(true)}>
                Open Model Library
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Fade overlay for transitions */}
      <div
        className="absolute inset-0 z-30 pointer-events-none"
        style={{
          background: "hsl(var(--background))",
          opacity: fadeOpacity,
          transition: "opacity 0.5s ease-in-out",
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-start justify-between">
        <div className="flex flex-col gap-2">
          {modelName && (
            <div className="glass-panel px-3 py-1.5 fade-in">
              <h1 className="text-xs tracking-widest uppercase text-foreground/80">{modelName}</h1>
            </div>
          )}
          {parentModelId && (
            <button
              className="glass-panel btn-ghost-cyan px-3 py-2 flex items-center gap-2 fade-in"
              onClick={handleBackToParent}
            >
              <ArrowLeft size={12} />
              <span className="tracking-widest uppercase text-xs">Back to Overview</span>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button className="glass-panel btn-ghost-cyan p-2" onClick={() => navigate("/admin")} title="Admin Panel">
              <Info size={14} />
            </button>
          )}
          {user ? (
            <button className="glass-panel btn-ghost-cyan p-2" onClick={signOut} title="Sign Out">
              <LogOut size={14} />
            </button>
          ) : (
            <button className="glass-panel btn-ghost-cyan p-2" onClick={() => navigate("/auth")} title="Sign In">
              <LogIn size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Controls hint */}
      {isPlacingMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 fade-in">
          <p className="text-xs tracking-widest uppercase text-cyan-400">
            Click on the model to place a pin
          </p>
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 border-red-500/30">
          <p className="text-xs tracking-widest uppercase text-red-400">{loadError}</p>
        </div>
      )}

      {/* Bottom dock */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
        <div className="flex justify-center">
          <div className="glass-panel px-2 py-2 flex gap-1 items-center">
            {/* MODELS */}
            <button
              className={`btn-ghost-cyan px-3 py-2 flex flex-col items-center gap-1 ${modelsOpen ? "text-cyan-400" : ""}`}
              onClick={() => { setModelsOpen(!modelsOpen); setAnnotationsOpen(false); }}
              title="Model Library"
            >
              <Layers size={16} />
              <span className="text-[10px] tracking-widest uppercase">Models</span>
            </button>

            {/* PINS */}
            {modelUrl && (
              <button
                className={`btn-ghost-cyan px-3 py-2 flex flex-col items-center gap-1 ${annotationsOpen ? "text-cyan-400" : ""}`}
                onClick={() => { setAnnotationsOpen(!annotationsOpen); setModelsOpen(false); }}
                title="Annotations"
              >
                <MapPin size={16} />
                <span className="text-[10px] tracking-widest uppercase">Pins</span>
              </button>
            )}

            {/* PLACE PIN */}
            {modelUrl && user && (
              <button
                className={`btn-ghost-cyan px-3 py-2 flex flex-col items-center gap-1 ${isPlacingMode ? "text-cyan-400 bg-cyan-400/10" : ""}`}
                onClick={() => setIsPlacingMode(!isPlacingMode)}
                title={isPlacingMode ? "Cancel Placing" : "Place Pin"}
              >
                <Crosshair size={16} />
                <span className="text-[10px] tracking-widest uppercase">{isPlacingMode ? "Cancel" : "Place"}</span>
              </button>
            )}

            {/* AR */}
            {modelUrl && (arSupported || iosArAvailable) && (
              <button className="btn-ghost-cyan px-3 py-2 flex flex-col items-center gap-1" onClick={handleAR} title="View in AR">
                <Maximize2 size={16} />
                <span className="text-[10px] tracking-widest uppercase">AR</span>
              </button>
            )}

            {/* EXPORT USDZ */}
            {modelUrl && (
              <button className="btn-ghost-cyan px-3 py-2 flex flex-col items-center gap-1" onClick={handleExportUSDZ} disabled={exporting} title="Export USDZ">
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span className="text-[10px] tracking-widest uppercase">Export</span>
              </button>
            )}

            {/* LOCAL FILE */}
            <button className="btn-ghost-cyan px-3 py-2 flex flex-col items-center gap-1" onClick={() => fileInputRef.current?.click()} title="Load local file">
              <FolderOpen size={16} />
              <span className="text-[10px] tracking-widest uppercase">Local</span>
            </button>

            {/* EMBED */}
            {selectedModelId && (
              <button className="btn-ghost-cyan px-3 py-2 flex flex-col items-center gap-1" onClick={copyEmbedUrl} title="Copy embed URL">
                <Info size={16} />
                <span className="text-[10px] tracking-widest uppercase">Embed</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Model Library Panel */}
      {modelsOpen && (
        <div className="absolute top-0 left-0 bottom-0 z-20 w-80 max-w-[85vw]">
          <ModelLibrary
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={(model, _url) => handleSelectModel(model)}
            onRefresh={refetchModels}
            onClose={() => setModelsOpen(false)}
          />
        </div>
      )}

      {/* Annotation Panel */}
      {annotationsOpen && (
        <div className="absolute top-0 right-0 bottom-0 z-20 w-80 max-w-[85vw]">
          <AnnotationPanel
            annotations={enrichedAnnotations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={deleteAnnotation}
            onUpdate={updateAnnotation}
            onClose={() => setAnnotationsOpen(false)}
            isPlacingMode={isPlacingMode}
            onTogglePlacingMode={() => setIsPlacingMode(!isPlacingMode)}
            onClearAll={clearAll}
            isReadOnly={!user}
            models={models}
            currentModelId={selectedModelId}
          />
        </div>
      )}

      {/* New annotation modal */}
      {pendingPos && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-panel p-6 w-96 max-w-[90vw] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm tracking-widest uppercase text-foreground">New Pin</h2>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => { setPendingPos(null); setNewLabel(""); setNewDesc(""); setNewMediaUrl(""); setNewVideoUrl(""); setNewTooltipType("info"); setNewLinkedModelId(""); }}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Label *"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 h-20 resize-none"
              />

              {/* Tooltip Type Radio */}
              <div className="flex gap-4 py-1">
                <label className={`flex items-center gap-2 cursor-pointer text-xs tracking-wider uppercase ${newTooltipType === "info" ? "text-foreground" : "text-muted-foreground"}`}>
                  <input
                    type="radio"
                    name="new-tooltip-type"
                    checked={newTooltipType === "info"}
                    onChange={() => setNewTooltipType("info")}
                    className="accent-cyan-400"
                  />
                  <Info size={12} /> Info
                </label>
                <label className={`flex items-center gap-2 cursor-pointer text-xs tracking-wider uppercase ${newTooltipType === "link" ? "text-foreground" : "text-muted-foreground"}`}>
                  <input
                    type="radio"
                    name="new-tooltip-type"
                    checked={newTooltipType === "link"}
                    onChange={() => setNewTooltipType("link")}
                    className="accent-cyan-400"
                  />
                  <Link2 size={12} /> Link to Model
                </label>
              </div>

              {newTooltipType === "info" ? (
                <>
                  <input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
                  />
                  <input
                    type="url"
                    placeholder="Video URL (optional)"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
                  />
                </>
              ) : (
                <select
                  value={newLinkedModelId}
                  onChange={(e) => setNewLinkedModelId(e.target.value)}
                  className="w-full bg-background/50 border border-border/50 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">Select a model...</option>
                  {models.filter((m) => m.id !== selectedModelId).map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setPendingPos(null); setNewLabel(""); setNewDesc(""); setNewMediaUrl(""); setNewVideoUrl(""); setNewTooltipType("info"); setNewLinkedModelId(""); }}
              >
                Cancel
              </button>
              <button
                className="glass-panel btn-ghost-cyan px-4 py-2 text-xs tracking-widest uppercase disabled:opacity-50"
                disabled={!newLabel.trim() || (newTooltipType === "link" && !newLinkedModelId)}
                onClick={confirmAnnotation}
              >
                Save Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
