import { useState } from "react";
import { Annotation, TooltipType } from "./AnnotationPin";
import { ModelRecord } from "./ModelLibrary";
import { Trash2, Tag, MapPin, Plus, ChevronDown, ChevronRight, Pencil, Check, X, Image, Film, Link2, Info } from "lucide-react";

interface AnnotationPanelProps {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, label: string, description: string, media_url?: string, video_url?: string, tooltip_type?: string, linked_model_id?: string) => void;
  isPlacingMode: boolean;
  onTogglePlacingMode: () => void;
  onClearAll: () => void;
  onClose?: () => void;
  isReadOnly?: boolean;
  models?: ModelRecord[];
  currentModelId?: string | null;
}

export default function AnnotationPanel({
  annotations,
  selectedId,
  onSelect,
  onDelete,
  onUpdate,
  isPlacingMode,
  onTogglePlacingMode,
  onClearAll,
  onClose,
  isReadOnly = false,
  models = [],
  currentModelId,
}: AnnotationPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMediaUrl, setEditMediaUrl] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");

  const startEdit = (ann: Annotation) => {
    setEditingId(ann.id);
    setEditLabel(ann.label);
    setEditDesc(ann.description);
    setEditMediaUrl(ann.media_url ?? "");
    setEditVideoUrl(ann.video_url ?? "");
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdate(editingId, editLabel, editDesc, editMediaUrl || undefined, editVideoUrl || undefined);
      setEditingId(null);
    }
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="glass-panel flex flex-col overflow-hidden" style={{ maxHeight: "100%" }}>
      {/* Header — always visible, click to collapse */}
      <div
        className="px-4 py-3 flex items-center gap-2 select-none"
        style={{ borderBottom: collapsed ? "none" : "1px solid hsl(var(--glass-border))" }}
      >
        <div
          className="flex items-center gap-2 flex-1 cursor-pointer"
          onClick={() => setCollapsed((v) => !v)}
        >
          <div className="w-2 h-2 flex-shrink-0" style={{ background: "hsl(var(--gold))" }} />
          <span className="font-mono text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--gold))" }}>
            Annotations
          </span>
          <span className="ml-auto font-mono text-xs mr-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            {annotations.length} / 20
          </span>
          {collapsed
            ? <ChevronRight size={12} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
            : <ChevronDown size={12} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 transition-colors hover:bg-white/5 flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} title="Close">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <>
          {/* Add button — hidden for read-only users */}
          {!isReadOnly && (
            <div className="px-3 py-2" style={{ borderBottom: "1px solid hsl(var(--glass-border))" }}>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePlacingMode(); }}
                className={`w-full py-2 px-3 flex items-center gap-2 transition-all duration-200 ${
                  isPlacingMode ? "btn-cyan" : "btn-ghost-cyan"
                }`}
              >
                <Plus size={12} />
                <span>{isPlacingMode ? "Click model to place..." : "Add Annotation"}</span>
                {isPlacingMode && (
                  <span className="ml-auto" style={{ fontSize: 9, opacity: 0.7 }}>ESC to cancel</span>
                )}
              </button>
            </div>
          )}

          {/* Annotation list */}
          <div className="flex-1 overflow-y-auto py-2" style={{ maxHeight: "calc(100vh - 220px)" }}>
            {annotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 px-4">
                <MapPin size={28} style={{ color: "hsl(var(--muted-foreground))" }} />
                <p className="font-mono text-xs text-center leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
                  No annotations yet.<br />Enable placing mode and click on the model.
                </p>
              </div>
            ) : (
              annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="mx-2 mb-1 cursor-pointer transition-all duration-150"
                  style={{
                    background: selectedId === ann.id ? "hsl(var(--gold) / 0.08)" : "transparent",
                    border: `1px solid ${selectedId === ann.id ? "hsl(var(--gold) / 0.35)" : "transparent"}`,
                  }}
                  onClick={() => onSelect(ann.id)}
                >
                  {editingId === ann.id ? (
                    /* ── Edit mode ── */
                    <div className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        className="w-full bg-transparent border px-2 py-1.5 font-mono text-xs outline-none"
                        style={{ borderColor: "hsl(var(--glass-border))", color: "hsl(var(--foreground))", fontSize: 11 }}
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Label..."
                        autoFocus
                        onFocus={(e) => (e.target.style.borderColor = "hsl(var(--gold))")}
                        onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
                      />
                      <textarea
                        className="w-full bg-transparent border px-2 py-1.5 font-mono text-xs outline-none resize-none"
                        style={{ borderColor: "hsl(var(--glass-border))", color: "hsl(var(--muted-foreground))", fontSize: 10, height: 52 }}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description..."
                        onFocus={(e) => (e.target.style.borderColor = "hsl(var(--gold))")}
                        onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
                      />
                      {/* Media URL */}
                      <div className="flex items-center gap-1.5">
                        <Image size={10} style={{ color: "hsl(var(--gold))", flexShrink: 0 }} />
                        <input
                          className="flex-1 bg-transparent border px-2 py-1 font-mono outline-none"
                          style={{ borderColor: "hsl(var(--glass-border))", color: "hsl(var(--muted-foreground))", fontSize: 10 }}
                          value={editMediaUrl}
                          onChange={(e) => setEditMediaUrl(e.target.value)}
                          placeholder="Photo URL (https://...)"
                          onFocus={(e) => (e.target.style.borderColor = "hsl(var(--gold))")}
                          onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
                        />
                      </div>
                      {/* Video URL */}
                      <div className="flex items-center gap-1.5">
                        <Film size={10} style={{ color: "hsl(var(--gold))", flexShrink: 0 }} />
                        <input
                          className="flex-1 bg-transparent border px-2 py-1 font-mono outline-none"
                          style={{ borderColor: "hsl(var(--glass-border))", color: "hsl(var(--muted-foreground))", fontSize: 10 }}
                          value={editVideoUrl}
                          onChange={(e) => setEditVideoUrl(e.target.value)}
                          placeholder="Video URL (YouTube, Vimeo...)"
                          onFocus={(e) => (e.target.style.borderColor = "hsl(var(--gold))")}
                          onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
                        />
                      </div>
                      {/* Save / Cancel */}
                      <div className="flex gap-2 pt-1">
                        <button
                          className="btn-cyan flex-1 py-1.5 text-xs flex items-center justify-center gap-1"
                          onClick={saveEdit}
                        >
                          <Check size={10} /> Save
                        </button>
                        <button
                          className="btn-ghost-cyan px-3 py-1.5 text-xs flex items-center gap-1"
                          onClick={cancelEdit}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div className="flex items-start gap-2 p-3 group">
                      <Tag size={11} style={{ color: "hsl(var(--gold))", marginTop: 2, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-semibold" style={{ color: "hsl(var(--foreground))", wordBreak: "break-word" }}>
                          {ann.label || "Untitled"}
                        </div>
                        {ann.description && (
                          <div className="font-mono text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))", fontSize: 10, wordBreak: "break-word" }}>
                            {ann.description}
                          </div>
                        )}
                        {/* Media/video indicators */}
                        <div className="flex gap-2 mt-1">
                          {ann.media_url && (
                            <span className="flex items-center gap-0.5" style={{ color: "hsl(var(--gold))", fontSize: 9 }}>
                              <Image size={8} /> Photo
                            </span>
                          )}
                          {ann.video_url && (
                            <span className="flex items-center gap-0.5" style={{ color: "hsl(var(--gold))", fontSize: 9 }}>
                              <Film size={8} /> Video
                            </span>
                          )}
                        </div>
                        <div className="font-mono mt-1" style={{ color: "hsl(var(--muted-foreground))", fontSize: 9 }}>
                          {ann.position.map((v) => v.toFixed(2)).join(", ")}
                        </div>
                      </div>
                      {/* Action buttons — hidden for read-only users */}
                      {!isReadOnly && (
                        <div className={`flex gap-1 ml-1 flex-shrink-0 ${selectedId === ann.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                          <button
                            className="p-1 transition-colors hover:bg-white/5"
                            style={{ color: "hsl(var(--gold))" }}
                            onClick={(e) => { e.stopPropagation(); startEdit(ann); }}
                            title="Edit"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            className="p-1 transition-colors hover:bg-red-500/10"
                            style={{ color: "hsl(var(--destructive))" }}
                            onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer — hidden for read-only users */}
          {!isReadOnly && annotations.length > 0 && (
            <div className="px-4 py-3" style={{ borderTop: "1px solid hsl(var(--glass-border))" }}>
              <button
                className="btn-ghost-cyan w-full py-1.5 text-xs flex items-center justify-center gap-2"
                onClick={onClearAll}
                style={{ color: "hsl(var(--destructive))", borderColor: "hsl(var(--destructive) / 0.3)" }}
              >
                <Trash2 size={10} />
                Clear All
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
