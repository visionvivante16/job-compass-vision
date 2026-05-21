// Cron trigger: invoked weekly by pg_cron (Sundays 00:00 UTC).
// Runs ATS auto-extract from existing jobs, then full discovery+validation.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  console.log("[CRON-ATS-DISCOVERY] Starting weekly ATS discovery cycle");

  const results: Array<{ step: string; ok: boolean; status?: number; body?: string; error?: string }> = [];

  // Step 1: extract any new slugs from existing JSearch/Muse/Arbeitnow jobs
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/ats-extract-from-existing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ trigger_type: "scheduled" }),
    });
    const body = await r.text();
    results.push({ step: "extract", ok: r.ok, status: r.status, body: body.slice(0, 300) });
  } catch (e) {
    results.push({ step: "extract", ok: false, error: String(e) });
  }

  // Step 2: validate all known slugs and activate those returning >=1 job
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/ats-discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ trigger_type: "scheduled" }),
    });
    const body = await r.text();
    results.push({ step: "discover", ok: r.ok, status: r.status, body: body.slice(0, 300) });
  } catch (e) {
    results.push({ step: "discover", ok: false, error: String(e) });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
