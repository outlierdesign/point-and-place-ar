/** Allowed origins for CORS. */
const ALLOWED_ORIGINS = [
  "https://glashapullagh.ie",
  "https://www.glashapullagh.ie",
  "https://point-and-place-ar.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

/** UUID v4 format check. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const url = new URL(req.url);
    const modelId = url.searchParams.get("model_id");

    // Validate model_id is a UUID
    if (!modelId || !UUID_RE.test(modelId)) {
      return new Response(
        JSON.stringify({ error: "model_id must be a valid UUID" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    };

    // 1. Check if cached export exists
    const exportPath = `${modelId}.glb`;
    const listResp = await fetch(
      `${supabaseUrl}/storage/v1/object/list/exports`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: "", search: exportPath }),
      }
    );
    const listData = await listResp.json();
    const alreadyCached = Array.isArray(listData) && listData.some((f: { name: string }) => f.name === exportPath);

    if (alreadyCached) {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/exports/${exportPath}`;
      return new Response(
        JSON.stringify({ url: publicUrl }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch model record
    const modelResp = await fetch(
      `${supabaseUrl}/rest/v1/models?id=eq.${modelId}&select=storage_path`,
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    const models = await modelResp.json();
    if (!Array.isArray(models) || models.length === 0) {
      return new Response(
        JSON.stringify({ error: "Model not found" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
    const storagePath = models[0].storage_path;

    // 3. Download GLB
    const downloadResp = await fetch(
      `${supabaseUrl}/storage/v1/object/models/${storagePath}`,
      { headers }
    );
    if (!downloadResp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download model" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
    const glbBytes = new Uint8Array(await downloadResp.arrayBuffer());

    // 4. Upload to exports bucket
    const uploadResp = await fetch(
      `${supabaseUrl}/storage/v1/object/exports/${exportPath}`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "model/gltf-binary",
          "x-upsert": "true",
        },
        body: glbBytes,
      }
    );
    if (!uploadResp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to cache export" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 5. Return public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/exports/${exportPath}`;
    return new Response(
      JSON.stringify({ url: publicUrl }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
