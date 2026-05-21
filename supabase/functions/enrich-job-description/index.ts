// Background job-description enricher.
// Strategy: plain fetch + HTML extraction only. If extraction yields < 200 chars
// or the fetch fails, mark the job with description_enriched = false so the UI
// hides AI feature buttons (ATS, Cover Letter, Tailor Resume) for that job.
// No external scraping API is used — keeps this cost-free.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_DESC_LENGTH = 200;
const MAX_DESC_LENGTH = 8000;
const PER_FETCH_TIMEOUT_MS = 12_000;
const MAX_JOBS_PER_RUN = 50;

// ──────────────────────────────────── HTML extraction ────────────────────────────────────
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFromHtml(html: string): string {
  // Try common job-description containers first
  const patterns = [
    /<div[^>]*class="[^"]*(?:job-description|job_description|jobDescription|description-text|posting-description|content-intro|opening-content|gh-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*class="[^"]*(?:job-description|description|posting)[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /<div[^>]*id="(?:job-description|description|posting-description|content)"[^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const text = stripHtml(m[1]);
      if (text.length >= MIN_DESC_LENGTH) return text.slice(0, MAX_DESC_LENGTH);
    }
  }
  // Fallback: strip everything and use the largest text blob
  const fullText = stripHtml(html);
  return fullText.slice(0, MAX_DESC_LENGTH);
}

async function plainFetch(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SociaxBot/1.0; +https://sociax.tech/bot)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    const html = await res.text();
    const extracted = extractFromHtml(html);
    return extracted.length >= MIN_DESC_LENGTH ? extracted : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Firecrawl fallback removed — plain fetch only.

// ──────────────────────────────────── Handler ────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(supabaseUrl, serviceKey);

  // Optional: caller may pass specific job_ids; otherwise scan for jobs needing enrichment
  let jobIds: string[] = [];
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.job_ids)) jobIds = body.job_ids.slice(0, MAX_JOBS_PER_RUN);
  } catch {
    /* no body */
  }

  let candidates: { id: string; external_apply_link: string; description: string }[] = [];

  if (jobIds.length > 0) {
    const { data, error } = await admin
      .from("jobs")
      .select("id, external_apply_link, description")
      .in("id", jobIds)
      .eq("description_enriched", false);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    candidates = data ?? [];
  } else {
    const { data, error } = await admin
      .from("jobs")
      .select("id, external_apply_link, description")
      .eq("description_enriched", false)
      .order("created_at", { ascending: false })
      .limit(MAX_JOBS_PER_RUN);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    candidates = data ?? [];
  }

  const stats = { processed: 0, scraped: 0, marked_already_ok: 0, failed: 0 };

  const work = async () => {
    for (const job of candidates) {
      stats.processed++;

      // If existing description is already long enough, just flip the flag.
      if ((job.description || "").length >= MIN_DESC_LENGTH) {
        await admin
          .from("jobs")
          .update({ description_enriched: true, description_source: "original" })
          .eq("id", job.id);
        stats.marked_already_ok++;
        continue;
      }

      if (!job.external_apply_link) {
        await admin
          .from("jobs")
          .update({ description_enriched: false })
          .eq("id", job.id);
        stats.failed++;
        continue;
      }

      // Plain fetch only — no fallback.
      const extracted = await plainFetch(job.external_apply_link);

      if (extracted) {
        await admin
          .from("jobs")
          .update({
            description: extracted,
            description_enriched: true,
            description_source: "scraped",
          })
          .eq("id", job.id);
        stats.scraped++;
      } else {
        // Mark as attempted so we don't keep retrying — also keeps AI buttons hidden
        await admin
          .from("jobs")
          .update({ description_enriched: false })
          .eq("id", job.id);
        stats.failed++;
      }
    }
    console.log(`[enrich-job-description] done`, stats);
  };

  // Run in background so the caller (ingest function) returns fast
  // @ts-ignore EdgeRuntime is provided by Supabase
  EdgeRuntime.waitUntil(work());

  return new Response(
    JSON.stringify({ success: true, queued: candidates.length }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
