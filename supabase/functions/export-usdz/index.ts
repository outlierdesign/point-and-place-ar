const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const modelId = url.searchParams.get("model_id");

    if (!modelId) {
      return new Response(
        JSON.stringify({ error: "model_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      const err = await uploadResp.text();
      return new Response(
        JSON.stringify({ error: "Failed to cache export: " + err }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Return public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/exports/${exportPath}`;
    return new Response(
      JSON.stringify({ url: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
