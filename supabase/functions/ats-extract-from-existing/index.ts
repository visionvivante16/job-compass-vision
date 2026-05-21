// ATS Auto-Extract from Existing Jobs
// Scans the public.jobs table for external_apply_link URLs that contain
// boards.greenhouse.io/X, jobs.lever.co/X, or jobs.ashbyhq.com/X. Any company
// slug not already in ats_companies is added as 'pending'. Designed to run on
// every JSearch/Muse/Arbeitnow ingest cycle so the ATS list grows automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Extracted {
  platform: "greenhouse" | "lever" | "ashby";
  slug: string;
  company: string;
}

function extractSlugs(url: string, company: string): Extracted[] {
  const out: Extracted[] = [];
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.split("/").filter(Boolean);

    // Greenhouse: boards.greenhouse.io/<slug> or job-boards.greenhouse.io/<slug>
    if (
      (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") &&
      path[0] && /^[a-z0-9-]+$/i.test(path[0])
    ) {
      out.push({ platform: "greenhouse", slug: path[0].toLowerCase(), company });
    }

    // Lever: jobs.lever.co/<slug>
    if (host === "jobs.lever.co" && path[0] && /^[a-z0-9-]+$/i.test(path[0])) {
      out.push({ platform: "lever", slug: path[0].toLowerCase(), company });
    }

    // Ashby: jobs.ashbyhq.com/<slug>
    if (host === "jobs.ashbyhq.com" && path[0] && /^[a-z0-9-]+$/i.test(path[0])) {
      out.push({ platform: "ashby", slug: path[0].toLowerCase(), company });
    }
  } catch { /* invalid url */ }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth: admin or service role
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (token !== SERVICE_KEY) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdminRes } = await userClient.rpc("is_admin");
    if (!isAdminRes) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Pull recent jobs (last 30 days) — covers freshly ingested rows.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs, error } = await admin
    .from("jobs")
    .select("external_apply_link, company")
    .gte("created_at", cutoff)
    .limit(5000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Dedupe candidates by platform+slug
  const candidates = new Map<string, Extracted>();
  for (const row of jobs || []) {
    if (!row.external_apply_link) continue;
    const found = extractSlugs(row.external_apply_link, row.company || "");
    for (const f of found) {
      const key = `${f.platform}:${f.slug}`;
      if (!candidates.has(key)) candidates.set(key, f);
    }
  }

  let added = 0;
  let skipped = 0;
  for (const [, c] of candidates) {
    const { data: existing } = await admin
      .from("ats_companies")
      .select("id")
      .eq("ats_platform", c.platform)
      .eq("slug", c.slug)
      .maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }
    const { error: insErr } = await admin.from("ats_companies").insert({
      slug: c.slug,
      company_name: c.company || c.slug,
      ats_platform: c.platform,
      status: "pending",
      auto_discovered: true,
    });
    if (!insErr) added++;
  }

  return new Response(
    JSON.stringify({
      success: true,
      candidates_found: candidates.size,
      added,
      already_existed: skipped,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
