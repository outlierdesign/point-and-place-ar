import { type ModelLoadingProgress } from "@/hooks/useProgressiveModel";

interface ModelLoadingOverlayProps {
  progress: ModelLoadingProgress;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/**
 * Displays a progress bar while a 3D model downloads.
 * Styled to match the Acres Ireland glass-panel design system.
 *
 * Place as a sibling to the Canvas inside a relative wrapper.
 */
export default function ModelLoadingOverlay({
  progress,
}: ModelLoadingOverlayProps) {
  if (progress.phase !== "loading") return null;

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div
        className="glass-panel px-5 py-3"
        style={{ minWidth: 260 }}
      >
        {/* Label + size */}
        <div className="flex justify-between items-center mb-2">
          <span
            className="font-mono text-xs font-semibold tracking-widest uppercase"
            style={{ color: "hsl(var(--gold))" }}
          >
            {progress.label}
          </span>
          {progress.total > 0 && (
            <span
              className="font-mono ml-4"
              style={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
            >
              {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: "hsl(var(--glass-border))" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress.percent}%`,
              background: "hsl(var(--gold))",
              boxShadow: "0 0 8px hsl(var(--gold) / 0.5)",
            }}
          />
        </div>

        {/* Percentage */}
        {progress.total > 0 && (
          <div
            className="font-mono mt-1.5 text-right"
            style={{ color: "hsl(var(--muted-foreground))", fontSize: 9 }}
          >
            {progress.percent}%
          </div>
        )}
      </div>
    </div>
  );
}
