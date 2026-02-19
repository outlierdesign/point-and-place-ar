import { useState } from "react";
import { Annotation } from "./AnnotationPin";
import { Trash2, Tag, ChevronRight, MapPin, Plus } from "lucide-react";

interface AnnotationPanelProps {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, label: string, description: string) => void;
  isPlacingMode: boolean;
  onTogglePlacingMode: () => void;
  onClearAll: () => void;
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
}: AnnotationPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const startEdit = (ann: Annotation) => {
    setEditingId(ann.id);
    setEditLabel(ann.label);
    setEditDesc(ann.description);
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdate(editingId, editLabel, editDesc);
      setEditingId(null);
    }
  };

  return (
    <div className="glass-panel flex flex-col h-full rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--glass-border))" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--cyan))", boxShadow: "0 0 6px hsl(var(--cyan))" }} />
          <span className="font-mono text-xs font-semibold tracking-widest uppercase" style={{ color: "hsl(var(--cyan))" }}>
            Annotations
          </span>
          <span className="ml-auto font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {annotations.length} / 20
          </span>
        </div>

        <button
          onClick={onTogglePlacingMode}
          className={`w-full py-2 px-3 rounded flex items-center gap-2 transition-all duration-200 ${
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

      {/* Annotation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <MapPin size={28} style={{ color: "hsl(var(--muted-foreground))" }} />
            <p className="font-mono text-xs text-center leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
              No annotations yet.<br />Enable placing mode and click on the model.
            </p>
          </div>
        ) : (
          annotations.map((ann) => (
            <div
              key={ann.id}
              className={`mx-2 mb-1 rounded cursor-pointer transition-all duration-150 ${
                selectedId === ann.id ? "fade-in" : ""
              }`}
              style={{
                background: selectedId === ann.id ? "hsl(185 100% 50% / 0.08)" : "transparent",
                border: `1px solid ${selectedId === ann.id ? "hsl(185 100% 50% / 0.3)" : "transparent"}`,
              }}
              onClick={() => onSelect(ann.id)}
            >
              {editingId === ann.id ? (
                <div className="p-3 space-y-2">
                  <input
                    className="w-full bg-transparent border rounded px-2 py-1 font-mono text-xs outline-none focus:border-cyan-400"
                    style={{
                      borderColor: "hsl(var(--glass-border))",
                      color: "hsl(var(--foreground))",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                    }}
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Label..."
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <textarea
                    className="w-full bg-transparent border rounded px-2 py-1 font-mono text-xs outline-none resize-none"
                    style={{
                      borderColor: "hsl(var(--glass-border))",
                      color: "hsl(200, 15%, 65%)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      height: 52,
                    }}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description..."
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn-cyan px-3 py-1 rounded text-xs flex-1"
                      onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                    >
                      Save
                    </button>
                    <button
                      className="btn-ghost-cyan px-3 py-1 rounded text-xs"
                      onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3">
                  <Tag size={11} style={{ color: "hsl(var(--cyan))", marginTop: 2, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {ann.label || "Untitled"}
                    </div>
                    {ann.description && (
                      <div className="font-mono text-xs truncate mt-0.5" style={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}>
                        {ann.description}
                      </div>
                    )}
                    <div className="font-mono mt-1" style={{ color: "hsl(var(--muted-foreground))", fontSize: 9 }}>
                      {ann.position.map((v) => v.toFixed(2)).join(", ")}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                    <button
                      className="p-1 rounded hover:bg-white/5 transition-colors"
                      style={{ color: "hsl(var(--cyan))" }}
                      onClick={(e) => { e.stopPropagation(); startEdit(ann); }}
                      title="Edit"
                    >
                      <ChevronRight size={12} />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-red-500/10 transition-colors"
                      style={{ color: "hsl(var(--destructive))" }}
                      onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {annotations.length > 0 && (
        <div className="px-4 py-3 border-t" style={{ borderColor: "hsl(var(--glass-border))" }}>
          <button
            className="btn-ghost-cyan w-full py-1.5 rounded text-xs flex items-center justify-center gap-2"
            onClick={onClearAll}
            style={{ color: "hsl(var(--destructive))", borderColor: "hsl(var(--destructive) / 0.3)" }}
          >
            <Trash2 size={10} />
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
