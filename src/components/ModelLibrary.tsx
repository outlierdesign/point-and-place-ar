import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, Trash2, CheckCircle2, Loader2, Box } from "lucide-react";

export interface ModelRecord {
  id: string;
  name: string;
  storage_path: string;
  file_size: number | null;
  created_at: string;
}

interface ModelLibraryProps {
  models: ModelRecord[];
  selectedModelId: string | null;
  onSelectModel: (model: ModelRecord, url: string) => void;
  onRefresh: () => void;
}

export default function ModelLibrary({
  models,
  selectedModelId,
  onSelectModel,
  onRefresh,
}: ModelLibraryProps) {
  const { isAdmin } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPublicUrl = (storagePath: string) => {
    const { data } = supabase.storage.from("models").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleUpload = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "gltf" && ext !== "glb") {
      setUploadError(`Unsupported type ".${ext}". Use .gltf or .glb`);
      return;
    }
    if (models.length >= 6) {
      setUploadError("Maximum 6 models allowed. Delete one first.");
      return;
    }
    setUploadError(null);
    setUploading(true);

    const path = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const { error: uploadErr } = await supabase.storage
      .from("models")
      .upload(path, file);

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from("models").insert({
      name: file.name,
      storage_path: path,
      file_size: file.size,
    });

    if (dbErr) {
      setUploadError(dbErr.message);
      await supabase.storage.from("models").remove([path]);
    } else {
      onRefresh();
    }

    setUploading(false);
  }, [models.length, onRefresh]);

  const handleDelete = async (model: ModelRecord) => {
    setDeletingId(model.id);
    await supabase.storage.from("models").remove([model.storage_path]);
    await supabase.from("models").delete().eq("id", model.id);
    onRefresh();
    setDeletingId(null);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="glass-panel flex flex-col h-full rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--glass-border))" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--cyan))", boxShadow: "0 0 6px hsl(var(--cyan))" }} />
          <span className="font-mono text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--cyan))" }}>
            Models
          </span>
          <span className="ml-auto font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {models.length} / 6
          </span>
        </div>

        {isAdmin && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gltf,.glb"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
            />
            <button
              className={`w-full py-2 px-3 rounded flex items-center gap-2 transition-all duration-200 ${
                uploading || models.length >= 6 ? "opacity-50 cursor-not-allowed btn-ghost-cyan" : "btn-ghost-cyan"
              }`}
              onClick={() => !uploading && models.length < 6 && fileInputRef.current?.click()}
              disabled={uploading || models.length >= 6}
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              <span>{uploading ? "Uploading..." : "Upload Model"}</span>
            </button>

            {uploadError && (
              <div className="mt-2 font-mono text-xs px-2 py-1.5 rounded fade-in" style={{ color: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.3)" }}>
                {uploadError}
              </div>
            )}
          </>
        )}
      </div>

      {/* Model list */}
      <div className="flex-1 overflow-y-auto py-2">
        {models.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <Box size={28} style={{ color: "hsl(var(--muted-foreground))" }} />
            <p className="font-mono text-xs text-center leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
              {isAdmin ? "No models yet.\nUpload your first model." : "No models available."}
            </p>
          </div>
        ) : (
          models.map((model) => {
            const isSelected = selectedModelId === model.id;
            return (
              <div
                key={model.id}
                className="mx-2 mb-1 rounded cursor-pointer transition-all duration-150"
                style={{
                  background: isSelected ? "hsl(185 100% 50% / 0.08)" : "transparent",
                  border: `1px solid ${isSelected ? "hsl(185 100% 50% / 0.3)" : "transparent"}`,
                }}
                onClick={() => onSelectModel(model, getPublicUrl(model.storage_path))}
              >
                <div className="flex items-start gap-2 p-3">
                  {isSelected ? (
                    <CheckCircle2 size={11} style={{ color: "hsl(var(--cyan))", marginTop: 2, flexShrink: 0 }} />
                  ) : (
                    <Box size={11} style={{ color: "hsl(var(--muted-foreground))", marginTop: 2, flexShrink: 0 }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {model.name}
                    </div>
                    <div className="font-mono mt-0.5" style={{ color: "hsl(var(--muted-foreground))", fontSize: 9 }}>
                      {formatSize(model.file_size)} · {new Date(model.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      className="p-1 rounded hover:bg-red-500/10 transition-colors flex-shrink-0 ml-1"
                      style={{ color: "hsl(var(--destructive))" }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(model); }}
                      disabled={deletingId === model.id}
                      title="Delete model"
                    >
                      {deletingId === model.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Trash2 size={11} />
                      }
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
