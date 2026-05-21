// Cron trigger: invoked by pg_cron daily.
// Fans out to all four ingest sources in parallel using the service role key.
// No external auth required (called only from same Supabase project via pg_net).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCES = ["ingest-jsearch"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  console.log(`[CRON-TRIGGER-INGEST] Invoking ${SOURCES.length} ingest sources with service role`);

  const results = await Promise.all(
    SOURCES.map(async (fn) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ trigger_type: "scheduled" }),
        });
        const body = await res.text();
        console.log(`[CRON-TRIGGER-INGEST] ${fn} responded ${res.status}`);
        return { source: fn, ok: res.ok, status: res.status, body: body.slice(0, 300) };
      } catch (err) {
        console.error(`[CRON-TRIGGER-INGEST] ${fn} error:`, err);
        return { source: fn, ok: false, error: String(err) };
      }
    })
  );

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
