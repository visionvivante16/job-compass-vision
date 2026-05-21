import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 50;
const TIMEOUT_MS = 8000;

async function checkLink(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JobPulseBot/1.0; +https://sociax.tech)",
      },
    });
    clearTimeout(timer);

    // 404, 410 Gone, or 403 (many ATS block HEAD) → retry with GET
    if (res.status === 405 || res.status === 403) {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
      const res2 = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller2.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; JobPulseBot/1.0; +https://sociax.tech)",
        },
      });
      clearTimeout(timer2);
      return res2.status !== 404 && res2.status !== 410;
    }

    return res.status !== 404 && res.status !== 410;
  } catch {
    // Network error or timeout — don't archive, could be temporary
    return true;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const offset = body.offset ?? 0;
    const limit = body.limit ?? BATCH_SIZE;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);

    // Fetch active jobs
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id, external_apply_link")
      .eq("is_published", true)
      .eq("is_archived", false)
      .is("deleted_at", null)
      .gte("posted_date", cutoff.toISOString())
      .order("posted_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!jobs?.length) {
      return new Response(
        JSON.stringify({ checked: 0, archived: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiredIds: string[] = [];

    // Check links in parallel (batches of 10)
    for (let i = 0; i < jobs.length; i += 10) {
      const batch = jobs.slice(i, i + 10);
      const results = await Promise.all(
        batch.map(async (job) => {
          const alive = await checkLink(job.external_apply_link);
          return { id: job.id, alive };
        })
      );
      for (const r of results) {
        if (!r.alive) expiredIds.push(r.id);
      }
    }

    // Archive expired jobs
    if (expiredIds.length > 0) {
      const { error: archiveError } = await supabase
        .from("jobs")
        .update({ is_archived: true })
        .in("id", expiredIds);

      if (archiveError) throw archiveError;
    }

    console.log(`Checked ${jobs.length} jobs, archived ${expiredIds.length} expired links`);

    return new Response(
      JSON.stringify({
        checked: jobs.length,
        archived: expiredIds.length,
        expiredIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-expired-links error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
