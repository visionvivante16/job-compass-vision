// ATS Auto-Discovery
// Validates known/seeded company slugs against Greenhouse, Lever, and Ashby
// public job board APIs. Slugs returning >=1 job become "active"; empties or
// errors become "inactive". Slugs are seeded from a curated list and can also
// be auto-extracted from existing JSearch/Muse/Arbeitnow ingests via the
// ats-extract-from-existing function. Admin-only or service-role triggered.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ───────────── Curated seed list (~150 well-known companies on each platform) ─────────────
const SEED_COMPANIES: Array<{ slug: string; name: string; platform: "greenhouse" | "lever" | "ashby" }> = [
  // Greenhouse
  { slug: "airbnb", name: "Airbnb", platform: "greenhouse" },
  { slug: "stripe", name: "Stripe", platform: "greenhouse" },
  { slug: "doordash", name: "DoorDash", platform: "greenhouse" },
  { slug: "instacart", name: "Instacart", platform: "greenhouse" },
  { slug: "robinhood", name: "Robinhood", platform: "greenhouse" },
  { slug: "coinbase", name: "Coinbase", platform: "greenhouse" },
  { slug: "discord", name: "Discord", platform: "greenhouse" },
  { slug: "reddit", name: "Reddit", platform: "greenhouse" },
  { slug: "cloudflare", name: "Cloudflare", platform: "greenhouse" },
  { slug: "snowflake", name: "Snowflake", platform: "greenhouse" },
  { slug: "datadog", name: "Datadog", platform: "greenhouse" },
  { slug: "pinterest", name: "Pinterest", platform: "greenhouse" },
  { slug: "lyft", name: "Lyft", platform: "greenhouse" },
  { slug: "twitch", name: "Twitch", platform: "greenhouse" },
  { slug: "asana", name: "Asana", platform: "greenhouse" },
  { slug: "elastic", name: "Elastic", platform: "greenhouse" },
  { slug: "gitlab", name: "GitLab", platform: "greenhouse" },
  { slug: "hashicorp", name: "HashiCorp", platform: "greenhouse" },
  { slug: "atlassian", name: "Atlassian", platform: "greenhouse" },
  { slug: "shopify", name: "Shopify", platform: "greenhouse" },
  { slug: "okta", name: "Okta", platform: "greenhouse" },
  { slug: "twilio", name: "Twilio", platform: "greenhouse" },
  { slug: "mongodb", name: "MongoDB", platform: "greenhouse" },
  { slug: "redis", name: "Redis", platform: "greenhouse" },
  { slug: "confluent", name: "Confluent", platform: "greenhouse" },
  { slug: "sendgrid", name: "SendGrid", platform: "greenhouse" },
  { slug: "duolingo", name: "Duolingo", platform: "greenhouse" },
  { slug: "square", name: "Square", platform: "greenhouse" },
  { slug: "segment", name: "Segment", platform: "greenhouse" },
  { slug: "lever", name: "Lever", platform: "greenhouse" },
  { slug: "intercom", name: "Intercom", platform: "greenhouse" },
  { slug: "samsara", name: "Samsara", platform: "greenhouse" },
  { slug: "carta", name: "Carta", platform: "greenhouse" },
  { slug: "brex", name: "Brex", platform: "greenhouse" },
  { slug: "ramp", name: "Ramp", platform: "greenhouse" },
  { slug: "mercury", name: "Mercury", platform: "greenhouse" },
  { slug: "anthropic", name: "Anthropic", platform: "greenhouse" },
  { slug: "openai", name: "OpenAI", platform: "greenhouse" },
  { slug: "scaleai", name: "Scale AI", platform: "greenhouse" },
  { slug: "rubrik", name: "Rubrik", platform: "greenhouse" },
  { slug: "fivetran", name: "Fivetran", platform: "greenhouse" },
  { slug: "dbtlabs", name: "dbt Labs", platform: "greenhouse" },
  { slug: "vercel", name: "Vercel", platform: "greenhouse" },
  { slug: "deel", name: "Deel", platform: "greenhouse" },
  { slug: "rippling", name: "Rippling", platform: "greenhouse" },
  { slug: "gusto", name: "Gusto", platform: "greenhouse" },
  { slug: "plaid", name: "Plaid", platform: "greenhouse" },
  { slug: "affirm", name: "Affirm", platform: "greenhouse" },
  { slug: "chime", name: "Chime", platform: "greenhouse" },
  { slug: "klaviyo", name: "Klaviyo", platform: "greenhouse" },
  { slug: "wayfair", name: "Wayfair", platform: "greenhouse" },
  { slug: "mongodbinc", name: "MongoDB Inc", platform: "greenhouse" },
  { slug: "hubspot", name: "HubSpot", platform: "greenhouse" },
  { slug: "zoominfo", name: "ZoomInfo", platform: "greenhouse" },
  { slug: "drift", name: "Drift", platform: "greenhouse" },
  { slug: "outreach", name: "Outreach", platform: "greenhouse" },
  { slug: "salesloft", name: "Salesloft", platform: "greenhouse" },
  { slug: "amplitude", name: "Amplitude", platform: "greenhouse" },
  { slug: "mixpanel", name: "Mixpanel", platform: "greenhouse" },
  { slug: "heap", name: "Heap", platform: "greenhouse" },
  { slug: "fullstory", name: "FullStory", platform: "greenhouse" },
  { slug: "sentry", name: "Sentry", platform: "greenhouse" },
  { slug: "newrelic", name: "New Relic", platform: "greenhouse" },
  { slug: "honeycomb", name: "Honeycomb", platform: "greenhouse" },
  { slug: "launchdarkly", name: "LaunchDarkly", platform: "greenhouse" },
  { slug: "auth0", name: "Auth0", platform: "greenhouse" },
  { slug: "1password", name: "1Password", platform: "greenhouse" },
  { slug: "lastpass", name: "LastPass", platform: "greenhouse" },
  { slug: "snyk", name: "Snyk", platform: "greenhouse" },
  { slug: "vimeo", name: "Vimeo", platform: "greenhouse" },
  { slug: "yelp", name: "Yelp", platform: "greenhouse" },
  { slug: "etsy", name: "Etsy", platform: "greenhouse" },
  { slug: "peloton", name: "Peloton", platform: "greenhouse" },
  { slug: "betterment", name: "Betterment", platform: "greenhouse" },
  { slug: "wealthfront", name: "Wealthfront", platform: "greenhouse" },

  // Lever
  { slug: "netflix", name: "Netflix", platform: "lever" },
  { slug: "figma", name: "Figma", platform: "lever" },
  { slug: "notion", name: "Notion", platform: "lever" },
  { slug: "loom", name: "Loom", platform: "lever" },
  { slug: "miro", name: "Miro", platform: "lever" },
  { slug: "canva", name: "Canva", platform: "lever" },
  { slug: "spotify", name: "Spotify", platform: "lever" },
  { slug: "palantir", name: "Palantir", platform: "lever" },
  { slug: "kraken", name: "Kraken", platform: "lever" },
  { slug: "chess", name: "Chess.com", platform: "lever" },
  { slug: "patreon", name: "Patreon", platform: "lever" },
  { slug: "calendly", name: "Calendly", platform: "lever" },
  { slug: "kickstarter", name: "Kickstarter", platform: "lever" },
  { slug: "thumbtack", name: "Thumbtack", platform: "lever" },
  { slug: "zapier", name: "Zapier", platform: "lever" },
  { slug: "buffer", name: "Buffer", platform: "lever" },
  { slug: "automattic", name: "Automattic", platform: "lever" },
  { slug: "github", name: "GitHub", platform: "lever" },
  { slug: "circleci", name: "CircleCI", platform: "lever" },
  { slug: "linear", name: "Linear", platform: "lever" },
  { slug: "rapid7", name: "Rapid7", platform: "lever" },
  { slug: "tanium", name: "Tanium", platform: "lever" },
  { slug: "auth0", name: "Auth0", platform: "lever" },
  { slug: "ironclad", name: "Ironclad", platform: "lever" },
  { slug: "convoy", name: "Convoy", platform: "lever" },
  { slug: "flexport", name: "Flexport", platform: "lever" },
  { slug: "checkr", name: "Checkr", platform: "lever" },
  { slug: "clearco", name: "Clearco", platform: "lever" },
  { slug: "chime-financial", name: "Chime Financial", platform: "lever" },
  { slug: "wisetack", name: "Wisetack", platform: "lever" },
  { slug: "alloy", name: "Alloy", platform: "lever" },
  { slug: "modern-treasury", name: "Modern Treasury", platform: "lever" },
  { slug: "highnote", name: "Highnote", platform: "lever" },
  { slug: "nylas", name: "Nylas", platform: "lever" },
  { slug: "scribd", name: "Scribd", platform: "lever" },
  { slug: "eventbrite", name: "Eventbrite", platform: "lever" },
  { slug: "khan-academy", name: "Khan Academy", platform: "lever" },
  { slug: "course-hero", name: "Course Hero", platform: "lever" },
  { slug: "udemy", name: "Udemy", platform: "lever" },
  { slug: "skillshare", name: "Skillshare", platform: "lever" },

  // Ashby
  { slug: "openai", name: "OpenAI", platform: "ashby" },
  { slug: "ramp", name: "Ramp", platform: "ashby" },
  { slug: "linear", name: "Linear", platform: "ashby" },
  { slug: "vercel", name: "Vercel", platform: "ashby" },
  { slug: "deel", name: "Deel", platform: "ashby" },
  { slug: "modal", name: "Modal", platform: "ashby" },
  { slug: "perplexity", name: "Perplexity", platform: "ashby" },
  { slug: "harvey", name: "Harvey", platform: "ashby" },
  { slug: "cresta", name: "Cresta", platform: "ashby" },
  { slug: "writer", name: "Writer", platform: "ashby" },
  { slug: "anthropic", name: "Anthropic", platform: "ashby" },
  { slug: "supabase", name: "Supabase", platform: "ashby" },
  { slug: "neon", name: "Neon", platform: "ashby" },
  { slug: "railway", name: "Railway", platform: "ashby" },
  { slug: "replit", name: "Replit", platform: "ashby" },
  { slug: "cursor", name: "Cursor", platform: "ashby" },
  { slug: "ashby", name: "Ashby", platform: "ashby" },
  { slug: "mercor", name: "Mercor", platform: "ashby" },
  { slug: "runwayml", name: "Runway", platform: "ashby" },
  { slug: "elevenlabs", name: "ElevenLabs", platform: "ashby" },
  { slug: "huggingface", name: "Hugging Face", platform: "ashby" },
  { slug: "cohere", name: "Cohere", platform: "ashby" },
  { slug: "groq", name: "Groq", platform: "ashby" },
  { slug: "scale", name: "Scale AI", platform: "ashby" },
  { slug: "fly-io", name: "Fly.io", platform: "ashby" },
  { slug: "warp", name: "Warp", platform: "ashby" },
  { slug: "raycast", name: "Raycast", platform: "ashby" },
  { slug: "arc", name: "The Browser Company", platform: "ashby" },
];

// ───────────── Per-platform validators ─────────────
async function validateGreenhouse(slug: string): Promise<{ ok: boolean; jobCount: number; companyName?: string }> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, jobCount: 0 };
    const json = await res.json();
    const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
    return { ok: jobs.length > 0, jobCount: jobs.length };
  } catch {
    return { ok: false, jobCount: 0 };
  }
}

async function validateLever(slug: string): Promise<{ ok: boolean; jobCount: number; companyName?: string }> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, jobCount: 0 };
    const json = await res.json();
    const jobs = Array.isArray(json) ? json : [];
    return { ok: jobs.length > 0, jobCount: jobs.length };
  } catch {
    return { ok: false, jobCount: 0 };
  }
}

async function validateAshby(slug: string): Promise<{ ok: boolean; jobCount: number; companyName?: string }> {
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, jobCount: 0 };
    const json = await res.json();
    const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
    return { ok: jobs.length > 0, jobCount: jobs.length };
  } catch {
    return { ok: false, jobCount: 0 };
  }
}

async function validateSlug(platform: string, slug: string) {
  if (platform === "greenhouse") return validateGreenhouse(slug);
  if (platform === "lever") return validateLever(slug);
  if (platform === "ashby") return validateAshby(slug);
  return { ok: false, jobCount: 0 };
}

// ───────────── Main handler ─────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth check (admin or service role)
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  let triggeredBy: string | null = null;
  let triggerType = "manual";

  if (token === SERVICE_KEY) {
    triggerType = "scheduled";
  } else {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdminRes } = await userClient.rpc("is_admin");
    if (!isAdminRes) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    triggeredBy = userData.user.id;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Create discovery run
  const { data: runRow } = await admin
    .from("ats_discovery_runs")
    .insert({ trigger_type: triggerType, triggered_by: triggeredBy, status: "running" })
    .select("id")
    .single();
  const runId = runRow?.id;
  const startedAt = Date.now();

  const stats = {
    total_candidates: 0,
    total_validated: 0,
    total_added: 0,
    total_activated: 0,
    total_deactivated: 0,
    errors: [] as Array<{ slug: string; platform: string; error: string }>,
    added: [] as Array<{ slug: string; platform: string; jobs: number }>,
  };

  const backgroundWork = async () => {
    console.log(`[ats-discover] Starting discovery run ${runId}`);

    // Step 1: Insert any seed companies that don't exist yet
    for (const seed of SEED_COMPANIES) {
      const { data: existing } = await admin
        .from("ats_companies")
        .select("id")
        .eq("ats_platform", seed.platform)
        .eq("slug", seed.slug)
        .maybeSingle();

      if (!existing) {
        await admin.from("ats_companies").insert({
          slug: seed.slug,
          company_name: seed.name,
          ats_platform: seed.platform,
          status: "pending",
          auto_discovered: false,
        });
        stats.total_added++;
      }
    }

    // Step 2: Validate every pending or active company
    const { data: companies } = await admin
      .from("ats_companies")
      .select("id, slug, ats_platform, status, company_name")
      .in("status", ["pending", "active", "inactive"])
      .order("date_added", { ascending: false });

    if (!companies) {
      console.error("[ats-discover] No companies to validate");
    } else {
      stats.total_candidates = companies.length;

      // Validate in batches of 8 to avoid hammering APIs
      const BATCH = 8;
      for (let i = 0; i < companies.length; i += BATCH) {
        const slice = companies.slice(i, i + BATCH);
        await Promise.all(
          slice.map(async (c) => {
            try {
              const result = await validateSlug(c.ats_platform, c.slug);
              stats.total_validated++;
              const newStatus = result.ok ? "active" : "inactive";

              if (newStatus === "active" && c.status !== "active") stats.total_activated++;
              if (newStatus === "inactive" && c.status === "active") stats.total_deactivated++;

              await admin
                .from("ats_companies")
                .update({
                  status: newStatus,
                  last_checked: new Date().toISOString(),
                  jobs_found_last_run: result.jobCount,
                })
                .eq("id", c.id);

              if (result.ok && c.status !== "active") {
                stats.added.push({ slug: c.slug, platform: c.ats_platform, jobs: result.jobCount });
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              stats.errors.push({ slug: c.slug, platform: c.ats_platform, error: msg });
            }
          })
        );

        // Persist progress
        await admin
          .from("ats_discovery_runs")
          .update({
            total_candidates: stats.total_candidates,
            total_validated: stats.total_validated,
            total_added: stats.total_added,
            total_activated: stats.total_activated,
            total_deactivated: stats.total_deactivated,
            details: { recently_added: stats.added.slice(-30) },
          })
          .eq("id", runId);
      }
    }

    await admin
      .from("ats_discovery_runs")
      .update({
        status: stats.errors.length > 0 ? "completed_with_errors" : "completed",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        total_candidates: stats.total_candidates,
        total_validated: stats.total_validated,
        total_added: stats.total_added,
        total_activated: stats.total_activated,
        total_deactivated: stats.total_deactivated,
        errors: stats.errors.slice(0, 50),
        details: { recently_added: stats.added.slice(-50) },
      })
      .eq("id", runId);

    console.log(
      `[ats-discover] Run ${runId} complete: ${stats.total_added} added, ${stats.total_activated} activated, ${stats.total_deactivated} deactivated`
    );
  };

  // @ts-ignore EdgeRuntime
  EdgeRuntime.waitUntil(backgroundWork());

  return new Response(
    JSON.stringify({
      success: true,
      run_id: runId,
      message: "Discovery started in background — check admin dashboard",
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
