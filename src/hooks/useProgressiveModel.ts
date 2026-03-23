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
 * Streams a GLB model with download progress, then exposes a blob URL
 * that can be passed directly to useGLTF / ModelViewer.
 *
 * This avoids a double-download: the model is fetched once via
 * ReadableStream (for byte-level progress), accumulated into a Blob,
 * and served from an in-memory object URL.
 *
 * For blob: URLs (local file drops) the hook skips prefetch entirely.
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setIsReady(false);
    setBlobUrl(null);
    setArrayBuffer(null);
    setProgress({ loaded: 0, total: 0, percent: 0, phase: "idle", label: "" });
  }, []);

  // Clean up previous blob URL
  const revokePreviousBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!url) {
      revokePreviousBlob();
      reset();
      return;
    }

    // Skip if same URL already loaded
    if (url === lastUrlRef.current && isReady) return;

    lastUrlRef.current = url;

    // Blob URLs (local file drops) are already in memory — skip prefetch
    if (url.startsWith("blob:")) {
      revokePreviousBlob();
      setBlobUrl(url);
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
      setBlobUrl(null);

      try {
        const response = await fetch(url!, { signal: controller.signal, cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body) {
          // No streaming support — fall back to arrayBuffer
          const buffer = await response.arrayBuffer();
          if (!cancelled) {
            revokePreviousBlob();
            const blob = new Blob([buffer], { type: "model/gltf-binary" });
            const newBlobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = newBlobUrl;
            setBlobUrl(newBlobUrl);
            setArrayBuffer(buffer);
            setIsReady(true);
            setProgress({
              loaded: buffer.byteLength,
              total: buffer.byteLength,
              percent: 100,
              phase: "complete",
              label: "",
            });
          }
          return;
        }

        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;

          if (!cancelled) {
            setProgress({
              loaded,
              total: total || loaded,
              percent: total
                ? Math.min(Math.round((loaded / total) * 100), 100)
                : 0,
              phase: "loading",
              label: "Loading model…",
            });
          }
        }

        if (!cancelled) {
          revokePreviousBlob();
          const blob = new Blob(chunks as BlobPart[], { type: "model/gltf-binary" });
          const newBlobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = newBlobUrl;
          setBlobUrl(newBlobUrl);
          // Merge chunks into a single ArrayBuffer for direct GLTFLoader.parse()
          const mergedBuffer = new Uint8Array(loaded);
          let offset = 0;
          for (const chunk of chunks) {
            mergedBuffer.set(chunk, offset);
            offset += chunk.length;
          }
          setArrayBuffer(mergedBuffer.buffer);
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
          // Fall back: let useGLTF try with the original URL
          setBlobUrl(null);
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
  }, [url, reset, isReady, revokePreviousBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokePreviousBlob();
    };
  }, [revokePreviousBlob]);

  return { progress, isReady, blobUrl, arrayBuffer };
}
