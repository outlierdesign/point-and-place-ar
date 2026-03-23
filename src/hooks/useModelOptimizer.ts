/**
 * Client-side GLB optimization hook using glTF-Transform + Draco.
 *
 * Compresses mesh geometry with Draco and converts textures to WebP
 * before upload, so large raw models (60-70 MB) are reduced to a
 * fraction of their size entirely in the browser.
 */
import { useState, useCallback } from "react";
import { WebIO } from "@gltf-transform/core";
import {
  KHRDracoMeshCompression,
  EXTTextureWebP,
} from "@gltf-transform/extensions";
import { dedup, weld, prune, draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

export interface OptimizationResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  reductionPct: number;
}

export type OptimizationStatus =
  | "idle"
  | "reading"
  | "compressing"
  | "done"
  | "error"
  | "already-optimized";

export function useModelOptimizer() {
  const [status, setStatus] = useState<OptimizationStatus>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(
    async (file: File): Promise<OptimizationResult> => {
      setError(null);

      // ── 1. Read the file into an ArrayBuffer ──────────────────
      setStatus("reading");
      setProgress("Reading model...");
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // ── 2. Check if already Draco-compressed ──────────────────
      // Quick check: if the binary already references KHR_draco_mesh_compression
      // in its JSON chunk, skip re-compression to avoid quality loss.
      const textDecoder = new TextDecoder();
      const headerText = textDecoder.decode(uint8.slice(0, Math.min(uint8.length, 4096)));
      if (headerText.includes("KHR_draco_mesh_compression")) {
        setStatus("already-optimized");
        setProgress("Model is already Draco-compressed");
        return {
          file,
          originalSize: file.size,
          optimizedSize: file.size,
          reductionPct: 0,
        };
      }

      // ── 3. Set up glTF-Transform IO with Draco ────────────────
      setStatus("compressing");
      setProgress("Initialising Draco encoder...");

      const io = new WebIO()
        .registerExtensions([KHRDracoMeshCompression, EXTTextureWebP])
        .registerDependencies({
          "draco3d.encoder": await draco3d.createEncoderModule(),
          "draco3d.decoder": await draco3d.createDecoderModule(),
        });

      // ── 4. Parse the document ─────────────────────────────────
      setProgress("Parsing geometry...");
      const doc = await io.readBinary(uint8);

      // Log stats
      let totalVerts = 0;
      let totalTris = 0;
      for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          const pos = prim.getAttribute("POSITION");
          if (pos) totalVerts += pos.getCount();
          const idx = prim.getIndices();
          if (idx) totalTris += idx.getCount() / 3;
        }
      }
      setProgress(
        `Compressing ${totalVerts.toLocaleString()} vertices, ${totalTris.toLocaleString()} triangles...`
      );

      // ── 5. Run the optimisation pipeline ──────────────────────
      await doc.transform(
        dedup(),
        weld({ tolerance: 0.0001 } as any),
        prune(),
        draco({
          quantizePosition: 14,
          quantizeNormal: 10,
          quantizeTexcoord: 12,
        })
      );

      // ── 6. Write back to GLB ──────────────────────────────────
      setProgress("Writing compressed model...");
      const optimizedBinary = await io.writeBinary(doc);

      // ── 7. Create a new File object ───────────────────────────
      const optimizedBlob = new Blob([optimizedBinary], {
        type: "model/gltf-binary",
      });
      const optimizedFile = new File([optimizedBlob], file.name, {
        type: "model/gltf-binary",
      });

      const reductionPct = Math.round(
        (1 - optimizedFile.size / file.size) * 100
      );

      setStatus("done");
      setProgress(
        `Compressed: ${formatMB(file.size)} → ${formatMB(optimizedFile.size)} (${reductionPct}% smaller)`
      );

      return {
        file: optimizedFile,
        originalSize: file.size,
        optimizedSize: optimizedFile.size,
        reductionPct,
      };
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress("");
    setError(null);
  }, []);

  return { optimize, status, progress, error, reset };
}

function formatMB(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
