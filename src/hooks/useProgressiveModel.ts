import { useState, useEffect, useCallback, useRef } from "react";

export interface ModelLoadingProgress {
  /** Bytes downloaded so far */
  loaded: number;
  /** Total bytes (from Content-Length, 0 if unknown) */
  total: number;
  /** Percentage 0-100 */
  percent: number;
  /** Current loading phase */
  phase: "idle" | "loading" | "complete";
  /** Human-readable label */
  label: string;
}

interface UseProgressiveModelOptions {
  /** The model URL to load (from Supabase storage or a blob URL) */
  url: string | null;
}

/**
 * Prefetches a GLB model URL with download progress tracking.
 *
 * This hook streams the model into the browser cache so that when
 * useGLTF (Three.js GLTFLoader) requests the same URL, it hits
 * the HTTP cache and loads instantly.
 *
 * Works with both Supabase public URLs and local blob: URLs.
 * For blob: URLs, progress tracking is skipped (already in memory).
 */
export function useProgressiveModel({ url }: UseProgressiveModelOptions) {
  const [progress, setProgress] = useState<ModelLoadingProgress>({
    loaded: 0,
    total: 0,
    percent: 0,
    phase: "idle",
    label: "",
  });
  const [isReady, setIsReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setIsReady(false);
    setProgress({ loaded: 0, total: 0, percent: 0, phase: "idle", label: "" });
  }, []);

  useEffect(() => {
    if (!url) {
      reset();
      return;
    }

    // Skip if same URL already loaded
    if (url === lastUrlRef.current && isReady) return;
    lastUrlRef.current = url;

    // Blob URLs (local file drops) are already in memory — skip prefetch
    if (url.startsWith("blob:")) {
      setIsReady(true);
      setProgress({ loaded: 0, total: 0, percent: 100, phase: "complete", label: "" });
      return;
    }

    let cancelled = false;
    abortRef.current?.abort();

    async function prefetch() {
      const controller = new AbortController();
      abortRef.current = controller;

      setProgress({
        loaded: 0,
        total: 0,
        percent: 0,
        phase: "loading",
        label: "Loading model…",
      });
      setIsReady(false);

      try {
        const response = await fetch(url!, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body) {
          // No streaming support — just await the full response
          await response.arrayBuffer();
          if (!cancelled) {
            setIsReady(true);
            setProgress({
              loaded: total,
              total,
              percent: 100,
              phase: "complete",
              label: "",
            });
          }
          return;
        }

        const reader = response.body.getReader();
        let loaded = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          loaded += value.length;

          if (!cancelled) {
            setProgress({
              loaded,
              total: total || loaded,
              percent: total ? Math.min(Math.round((loaded / total) * 100), 100) : 0,
              phase: "loading",
              label: "Loading model…",
            });
          }
        }

        if (!cancelled) {
          setIsReady(true);
          setProgress({
            loaded,
            total: total || loaded,
            percent: 100,
            phase: "complete",
            label: "",
          });
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== "AbortError") {
          console.error("[useProgressiveModel] Failed to prefetch:", err);
          // Still mark as ready so useGLTF can try (it has its own error handling)
          setIsReady(true);
          setProgress((prev) => ({
            ...prev,
            phase: "complete",
            label: "",
          }));
        }
      }
    }

    prefetch();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [url, reset, isReady]);

  return { progress, isReady };
}
