// Cron trigger: invoked by pg_cron with a tier param.
// Tier 1 (top performers) every 4h, Tier 2 every 12h, Tier 3 once daily.
// Falls back to "all active" if no tier specified (manual run / legacy cron).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let tier: number | null = null;
  try {
    const body = await req.json();
    if (body?.tier && [1, 2, 3].includes(Number(body.tier))) tier = Number(body.tier);
  } catch { /* no body */ }

  console.log(`[CRON-ATS-INGEST] Triggering tier=${tier ?? "all"}`);

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/ats-ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        trigger_type: tier ? `scheduled_tier${tier}` : "scheduled",
        ...(tier ? { tier } : {}),
      }),
    });
    const body = await r.text();
    console.log(`[CRON-ATS-INGEST] ats-ingest responded ${r.status}`);
    return new Response(JSON.stringify({ ok: r.ok, status: r.status, tier, body: body.slice(0, 500) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[CRON-ATS-INGEST] error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
