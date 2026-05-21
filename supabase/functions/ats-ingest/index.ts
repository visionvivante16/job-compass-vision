// ATS Ingest
// Pulls jobs from Greenhouse, Lever, and Ashby public job board APIs for every
// ats_companies row with status='active'. Inserts into the jobs table using the
// same dedup, location-filter, and skills-enrichment patterns as JSearch/Muse/Arbeitnow.
// Admin-only or service-role triggered.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ───────────── Skills enrichment (mirrored from ingest-jsearch) ─────────────
const COMMON_SKILLS: Record<string, string> = {
  js: "JavaScript", javascript: "JavaScript", typescript: "TypeScript", ts: "TypeScript",
  react: "React", reactjs: "React", "react.js": "React",
  angular: "Angular", vue: "Vue.js", vuejs: "Vue.js",
  node: "Node.js", nodejs: "Node.js", "node.js": "Node.js",
  python: "Python", java: "Java", "c#": "C#", csharp: "C#", "c++": "C++", cpp: "C++",
  go: "Go", golang: "Go", rust: "Rust", ruby: "Ruby", php: "PHP", swift: "Swift",
  kotlin: "Kotlin", scala: "Scala", r: "R",
  html: "HTML", css: "CSS", sass: "Sass", scss: "Sass",
  sql: "SQL", mysql: "MySQL", postgresql: "PostgreSQL", postgres: "PostgreSQL",
  mongodb: "MongoDB", redis: "Redis", elasticsearch: "Elasticsearch",
  aws: "AWS", azure: "Azure", gcp: "GCP", "google cloud": "GCP",
  docker: "Docker", kubernetes: "Kubernetes", k8s: "Kubernetes",
  terraform: "Terraform", jenkins: "Jenkins",
  git: "Git", github: "GitHub", "ci/cd": "CI/CD",
  rest: "REST APIs", graphql: "GraphQL", kafka: "Kafka", linux: "Linux",
  agile: "Agile", scrum: "Scrum", jira: "Jira", figma: "Figma",
  "machine learning": "Machine Learning", ml: "Machine Learning",
  tensorflow: "TensorFlow", pytorch: "PyTorch", pandas: "Pandas", numpy: "NumPy",
  tableau: "Tableau", "power bi": "Power BI", salesforce: "Salesforce",
  "next.js": "Next.js", nextjs: "Next.js", django: "Django", flask: "Flask",
  excel: "Excel", etl: "ETL", devops: "DevOps",
};

function enrichSkills(text: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const lower = (text || "").toLowerCase();
  const patterns = Object.keys(COMMON_SKILLS).sort((a, b) => b.length - a.length);
  for (const p of patterns) {
    const re = new RegExp(
      `(?:^|[\\s,;/|()•\\-])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,;/|()•\\-])`,
      "i"
    );
    if (re.test(lower)) {
      const skill = COMMON_SKILLS[p];
      if (!seen.has(skill.toLowerCase())) {
        result.push(skill);
        seen.add(skill.toLowerCase());
      }
    }
    if (result.length >= 12) break;
  }
  return result;
}

// ───────────── Entry-level filter ─────────────
const SENIOR_TOKENS = [
  "senior", "sr.", "staff", "principal", "lead ", "director", "vp ", "vice president",
  "head of", "manager", "architect", "executive", "chief ",
];
function isSeniorRole(title: string): boolean {
  const t = (title || "").toLowerCase();
  return SENIOR_TOKENS.some((tok) => t.includes(tok));
}

// Detect descriptions requiring 6+ years of experience
function requiresHighExperience(description: string): boolean {
  if (!description) return false;
  const patterns = [
    /\b([6-9]|[1-9]\d)\+?\s*[-–]?\s*(?:\d+\s*)?(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp\.?)?/i,
    /(?:minimum|at\s+least|requires?)\s*(?:of\s+)?([6-9]|[1-9]\d)\s*(?:years?|yrs?)/i,
    /(?:experience|exp\.?)\s*(?:required)?[\s:]+([6-9]|[1-9]\d)\+?\s*(?:years?|yrs?)/i,
  ];
  for (const p of patterns) {
    const m = description.match(p);
    if (m) {
      const num = parseInt(m[0].match(/\d+/)?.[0] || "0", 10);
      if (num > 5) return true;
    }
  }
  return false;
}

// ───────────── USA-only location filter (mirrored from src/lib/usaLocationFilter.ts) ─────────────
const US_STATES_ABBR = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);
const US_STATE_NAMES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia",
  "hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland",
  "massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada",
  "new hampshire","new jersey","new mexico","new york","north carolina","north dakota","ohio","oklahoma","oregon",
  "pennsylvania","rhode island","south carolina","south dakota","tennessee","texas","utah","vermont","virginia",
  "washington","west virginia","wisconsin","wyoming","district of columbia",
];
const NON_US_INDICATORS = [
  "canada","mexico","india","uk","united kingdom","england","scotland","wales","ireland","germany","france","spain",
  "italy","netherlands","sweden","norway","denmark","finland","switzerland","austria","belgium","portugal","poland",
  "czech","romania","hungary","greece","turkey","israel","japan","china","korea","singapore","australia",
  "new zealand","brazil","argentina","colombia","chile","philippines","indonesia","malaysia","thailand","vietnam",
  "taiwan","hong kong","dubai","uae","saudi","qatar","egypt","nigeria","kenya","south africa","ukraine","russia",
  "slovenia","croatia","serbia","estonia","latvia","lithuania","luxembourg","iceland","bulgaria","slovakia",
  "british columbia","alberta","ontario","quebec","manitoba","saskatchewan",
  "europe","asia","africa","latin america","apac","emea","global",
  // common ISO/abbrev tails
  "ie","de","fr","es","it","nl","se","no","dk","fi","ch","at","be","pt","pl","jp","cn","kr","sg","au","nz","br","mx","ca",
];
function isUSALocation(location: string | null | undefined): boolean {
  if (!location || !location.trim()) return false;
  const loc = location.trim();
  const lower = loc.toLowerCase();
  for (const indicator of NON_US_INDICATORS) {
    const re = new RegExp(`(^|[^a-z])${indicator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    if (re.test(lower)) {
      if (indicator === "mexico" && /new mexico/.test(lower)) continue;
      if (indicator === "england" && /new england/.test(lower)) continue;
      if (lower.includes(", us") || lower.includes("usa") || lower.includes("united states")) {
        if (lower.includes(";") || lower.includes("|")) return false;
        continue;
      }
      return false;
    }
  }
  if (/\bUS\b/.test(loc) || /\bUSA\b/i.test(loc) || /united states/i.test(loc)) return true;
  const stateAbbrMatch = loc.match(/,\s*([A-Z]{2})\s*(?:,\s*US)?(?:\s*\(.*\))?\s*$/);
  if (stateAbbrMatch && US_STATES_ABBR.has(stateAbbrMatch[1])) return true;
  const midStateMatch = loc.match(/,\s*([A-Z]{2})\s*,/);
  if (midStateMatch && US_STATES_ABBR.has(midStateMatch[1])) return true;
  for (const s of US_STATE_NAMES) if (lower.includes(s)) return true;
  if (/remote/i.test(loc)) {
    if (/\bUS\b/.test(loc) || /\bUSA\b/i.test(loc) || /united states/i.test(loc)) return true;
    return false;
  }
  return false;
}

// ───────────── Per-platform fetchers ─────────────
interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  apply_link: string;
  posted_date: string;
  employment_type: string;
}

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchGreenhouse(slug: string, companyName: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) throw new Error(`Greenhouse ${slug}: HTTP ${res.status}`);
  const json = await res.json();
  const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
  return jobs.map((j: any) => ({
    title: j.title || "",
    company: companyName,
    location: j.location?.name || "Remote",
    description: stripHtml(j.content || ""),
    apply_link: j.absolute_url || "",
    posted_date: j.updated_at || new Date().toISOString(),
    employment_type: "Full Time",
  })).filter((j: NormalizedJob) => j.title && j.apply_link);
}

async function fetchLever(slug: string, companyName: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Lever ${slug}: HTTP ${res.status}`);
  const arr = await res.json();
  const jobs = Array.isArray(arr) ? arr : [];
  return jobs.map((j: any) => {
    const desc =
      stripHtml(j.descriptionPlain || j.description || "") +
      (j.lists?.length
        ? "\n\n" + j.lists.map((l: any) => `${l.text || ""}\n${stripHtml(l.content || "")}`).join("\n\n")
        : "");
    const commitment = j.categories?.commitment || "";
    const empType = /intern/i.test(commitment) ? "Internship" : "Full Time";
    return {
      title: j.text || "",
      company: companyName,
      location: j.categories?.location || "Remote",
      description: desc,
      apply_link: j.hostedUrl || j.applyUrl || "",
      posted_date: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
      employment_type: empType,
    };
  }).filter((j: NormalizedJob) => j.title && j.apply_link);
}

async function fetchAshby(slug: string, companyName: string): Promise<NormalizedJob[]> {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Ashby ${slug}: HTTP ${res.status}`);
  const json = await res.json();
  const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
  return jobs.map((j: any) => ({
    title: j.title || "",
    company: companyName,
    location: j.location || (j.isRemote ? "Remote" : ""),
    description: stripHtml(j.descriptionHtml || j.descriptionPlain || ""),
    apply_link: j.jobUrl || j.applyUrl || "",
    posted_date: j.publishedAt || new Date().toISOString(),
    employment_type: /intern/i.test(j.employmentType || "") ? "Internship" : "Full Time",
  })).filter((j: NormalizedJob) => j.title && j.apply_link);
}

async function fetchPlatform(platform: string, slug: string, companyName: string): Promise<NormalizedJob[]> {
  if (platform === "greenhouse") return fetchGreenhouse(slug, companyName);
  if (platform === "lever") return fetchLever(slug, companyName);
  if (platform === "ashby") return fetchAshby(slug, companyName);
  return [];
}

// ───────────── Main handler ─────────────
// Chunked, self-invoking design:
//  - Each invocation processes BATCH_SIZE companies in parallel, then self-invokes
//    with the next offset until all companies are done.
//  - This keeps every invocation well under the edge function wall-time limit.
const BATCH_SIZE = 6;            // companies processed in parallel per invocation
const FETCH_CONCURRENCY = 6;     // parallel platform fetches inside a batch

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  let triggeredBy: string | null = null;
  let triggerType = "manual";
  let isServiceCall = false;

  if (token === SERVICE_KEY) {
    triggerType = "scheduled";
    isServiceCall = true;
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

  // Body parameters:
  //   company_id  – run a single company only
  //   run_id      – continue an in-progress run (chunked self-invocation)
  //   offset      – starting offset within the company list (chunked)
  let bodyCompanyId: string | null = null;
  let continuationRunId: string | null = null;
  let chunkOffset = 0;
  let tierFilter: number | null = null;
  try {
    const body = await req.json();
    bodyCompanyId = body?.company_id || null;
    continuationRunId = body?.run_id || null;
    chunkOffset = Number(body?.offset) || 0;
    if (body?.trigger_type) triggerType = body.trigger_type;
    if (body?.tier && [1, 2, 3].includes(Number(body.tier))) tierFilter = Number(body.tier);
  } catch { /* no body */ }

  // Either reuse an existing run row (continuation) or insert a new one (first call)
  let runId: string | null = continuationRunId;
  if (!runId) {
    const { data: runRow } = await admin
      .from("ats_ingest_runs")
      .insert({ trigger_type: triggerType, triggered_by: triggeredBy, status: "running" })
      .select("id")
      .single();
    runId = runRow?.id ?? null;
  }
  const startedAt = Date.now();


  // Probe both active AND inactive companies (stable order for chunking).
  // Skip only 'pending' (never validated) and 'failed' (permanently broken slugs).
  let companyQuery = admin
    .from("ats_companies")
    .select("id, slug, company_name, ats_platform, status, tier, consecutive_empty_runs")
    .in("status", ["active", "inactive"])
    .order("id", { ascending: true });
  if (tierFilter !== null) {
    companyQuery = admin
      .from("ats_companies")
      .select("id, slug, company_name, ats_platform, status, tier, consecutive_empty_runs")
      .eq("tier", tierFilter)
      .eq("status", "active")
      .order("id", { ascending: true });
  }
  if (bodyCompanyId) {
    companyQuery = admin
      .from("ats_companies")
      .select("id, slug, company_name, ats_platform, status, tier, consecutive_empty_runs")
      .eq("id", bodyCompanyId);
  }

  const { data: allCompanies, error: cErr } = await companyQuery;

  if (cErr || !allCompanies?.length) {
    if (runId) {
      await admin.from("ats_ingest_runs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
        errors: [{ slug: "n/a", platform: "n/a", error: cErr?.message || "No active companies" }],
      }).eq("id", runId);
    }
    return new Response(
      JSON.stringify({ error: "No active companies. Run discovery first." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Slice for this invocation's chunk
  const totalCompanies = allCompanies.length;
  const chunkEnd = Math.min(chunkOffset + BATCH_SIZE, totalCompanies);
  const companies = allCompanies.slice(chunkOffset, chunkEnd);
  const isLastChunk = chunkEnd >= totalCompanies || !!bodyCompanyId;

  // Process a single company end-to-end. Returns per-company stats delta.
  const processCompany = async (company: any) => {
    const delta = {
      total_fetched: 0,
      total_imported: 0,
      total_skipped: 0,
      total_filtered: 0,
      errors: [] as Array<{ slug: string; platform: string; error: string }>,
      per_company: null as null | { slug: string; platform: string; fetched: number; imported: number },
    };
    try {
      const jobs = await fetchPlatform(company.ats_platform, company.slug, company.company_name);
      delta.total_fetched += jobs.length;
      let importedThisCompany = 0;

      const candidates: NormalizedJob[] = [];
      for (const j of jobs) {
        if (!j.title || !j.apply_link) { delta.total_skipped++; continue; }
        if (isSeniorRole(j.title)) { delta.total_filtered++; continue; }
        if (requiresHighExperience(j.description || "")) { delta.total_filtered++; continue; }
        if (!isUSALocation(j.location)) { delta.total_filtered++; continue; }
        candidates.push(j);
      }

      const links = candidates.map((c) => c.apply_link);
      const existingLinks = new Set<string>();
      if (links.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < links.length; i += CHUNK) {
          const slice = links.slice(i, i + CHUNK);
          const { data: existingRows } = await admin
            .from("jobs")
            .select("external_apply_link")
            .in("external_apply_link", slice);
          for (const row of existingRows || []) {
            if (row.external_apply_link) existingLinks.add(row.external_apply_link);
          }
        }
      }

      const toInsert: any[] = [];
      const seenInBatch = new Set<string>();
      for (const j of candidates) {
        if (existingLinks.has(j.apply_link)) { delta.total_skipped++; continue; }
        if (seenInBatch.has(j.apply_link)) { delta.total_skipped++; continue; }
        seenInBatch.add(j.apply_link);
        const skills = enrichSkills(`${j.title} ${j.description}`);
        toInsert.push({
          title: j.title.trim(),
          company: j.company.trim(),
          location: j.location || "Remote",
          description: j.description || "",
          skills,
          external_apply_link: j.apply_link,
          employment_type: j.employment_type,
          // Always stamp posted_date as ingestion time so users see "X minutes ago"
          // for jobs we just discovered, regardless of how stale the source's date is.
          posted_date: new Date().toISOString(),
          is_published: true,
          is_archived: false,
          is_direct_apply: true,
          ingested_via: "ats_polling",
          ats_company_slug: company.slug,
        });
      }

      if (toInsert.length > 0) {
        const INSERT_CHUNK = 100;
        for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
          const slice = toInsert.slice(i, i + INSERT_CHUNK);
          const { error: insertErr, count } = await admin
            .from("jobs")
            .insert(slice, { count: "exact" });
          if (insertErr) {
            delta.errors.push({ slug: company.slug, platform: company.ats_platform, error: insertErr.message });
            delta.total_skipped += slice.length;
          } else {
            const inserted = count ?? slice.length;
            delta.total_imported += inserted;
            importedThisCompany += inserted;
          }
        }
      }

      delta.per_company = {
        slug: company.slug,
        platform: company.ats_platform,
        fetched: jobs.length,
        imported: importedThisCompany,
      };

      const newStatus =
        jobs.length > 0
          ? "active"
          : (company.status === "active" ? "inactive" : company.status);

      // Tier-tracking signals: feeds the auto-promote/demote pass at end of run
      const newConsecutiveEmpty = importedThisCompany > 0
        ? 0
        : (company.consecutive_empty_runs || 0) + 1;

      // Recalculate jobs_last_7days from actual ats_polling inserts in last 7d.
      // Cheap (1 indexed count per company per run) and self-correcting.
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: last7d } = await admin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("ats_company_slug", company.slug)
        .eq("ingested_via", "ats_polling")
        .gte("created_at", sevenDaysAgo);

      await admin
        .from("ats_companies")
        .update({
          last_checked: new Date().toISOString(),
          jobs_found_last_run: jobs.length,
          jobs_last_run: importedThisCompany,
          jobs_last_7days: last7d || 0,
          consecutive_empty_runs: newConsecutiveEmpty,
          status: newStatus,
        })
        .eq("id", company.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[ats-ingest] Error on ${company.ats_platform}/${company.slug}:`, msg);
      delta.errors.push({ slug: company.slug, platform: company.ats_platform, error: msg });
    }
    return delta;
  };

  // Fire the next chunk IMMEDIATELY (before processing this one) so the
  // self-invocation chain doesn't depend on this invocation's wall-time budget.
  // Each chunk is fully independent — it reads the merged totals from the DB.
  const dispatchNextChunk = async () => {
    if (isLastChunk) return;
    const nextOffset = chunkEnd;
    console.log(`[ats-ingest] Run ${runId} dispatching next chunk offset=${nextOffset}`);
    try {
      // Fire-and-forget; do NOT await the response body. We just need the request
      // to be sent before this invocation ends.
      await fetch(`${SUPABASE_URL}/functions/v1/ats-ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          run_id: runId,
          offset: nextOffset,
          trigger_type: triggerType,
        }),
      });
    } catch (e) {
      console.error("[ats-ingest] self-invoke error:", e);
    }
  };

  const backgroundWork = async () => {
    console.log(`[ats-ingest] Run ${runId} chunk offset=${chunkOffset} size=${companies.length} (total=${totalCompanies})`);

    // Kick off the next chunk first so the chain keeps going even if this
    // invocation is slow or runs out of wall-time.
    await dispatchNextChunk();

    // Run companies in parallel within this chunk (bounded concurrency)
    const results: Awaited<ReturnType<typeof processCompany>>[] = [];
    for (let i = 0; i < companies.length; i += FETCH_CONCURRENCY) {
      const batch = companies.slice(i, i + FETCH_CONCURRENCY);
      const out = await Promise.all(batch.map((c) => processCompany(c)));
      results.push(...out);
    }

    // Aggregate this chunk's deltas
    const chunkDelta = {
      total_fetched: 0,
      total_imported: 0,
      total_skipped: 0,
      total_filtered: 0,
      companies_processed: 0,
      errors: [] as Array<{ slug: string; platform: string; error: string }>,
      per_company: [] as Array<{ slug: string; platform: string; fetched: number; imported: number }>,
    };
    for (const d of results) {
      chunkDelta.total_fetched += d.total_fetched;
      chunkDelta.total_imported += d.total_imported;
      chunkDelta.total_skipped += d.total_skipped;
      chunkDelta.total_filtered += d.total_filtered;
      chunkDelta.companies_processed += 1;
      if (d.errors.length) chunkDelta.errors.push(...d.errors);
      if (d.per_company) chunkDelta.per_company.push(d.per_company);
    }

    // Read current run state, then write merged totals
    const { data: currentRun } = await admin
      .from("ats_ingest_runs")
      .select("companies_processed,total_fetched,total_imported,total_skipped,total_filtered,errors,details")
      .eq("id", runId)
      .single();

    const merged = {
      companies_processed: (currentRun?.companies_processed || 0) + chunkDelta.companies_processed,
      total_fetched: (currentRun?.total_fetched || 0) + chunkDelta.total_fetched,
      total_imported: (currentRun?.total_imported || 0) + chunkDelta.total_imported,
      total_skipped: (currentRun?.total_skipped || 0) + chunkDelta.total_skipped,
      total_filtered: (currentRun?.total_filtered || 0) + chunkDelta.total_filtered,
      errors: ([...(Array.isArray(currentRun?.errors) ? currentRun!.errors : []), ...chunkDelta.errors]).slice(0, 100),
      details: {
        per_company: ([
          ...(((currentRun?.details as any)?.per_company) || []),
          ...chunkDelta.per_company,
        ]).slice(-200),
      },
    };

    await admin.from("ats_ingest_runs").update(merged).eq("id", runId);

    if (!isLastChunk) {
      // Next chunk was already dispatched at the top.
      return;
    }


    // Final chunk: dedup sweep + tier rebalance + finalize
    let duplicates_removed = 0;
    try {
      const { data: dedupRes } = await admin.rpc("remove_duplicate_jobs");
      duplicates_removed = (dedupRes as { removed?: number })?.removed || 0;
    } catch (e) {
      console.error("[ats-ingest] Dedup error:", e);
    }

    // Auto tier promotion / demotion
    // Promote: T3 -> T2 if jobs_last_7days >= 5 AND consecutive_empty_runs = 0
    //          T2 -> T1 if jobs_last_7days >= 20 AND consecutive_empty_runs = 0
    // Demote:  T1 -> T2 if consecutive_empty_runs >= 14
    //          T2 -> T3 if consecutive_empty_runs >= 21
    try {
      const promotions = await Promise.all([
        admin.from("ats_companies").update({ tier: 2 })
          .eq("tier", 3).gte("jobs_last_7days", 5).eq("consecutive_empty_runs", 0)
          .eq("status", "active"),
        admin.from("ats_companies").update({ tier: 1 })
          .eq("tier", 2).gte("jobs_last_7days", 20).eq("consecutive_empty_runs", 0)
          .eq("status", "active"),
        admin.from("ats_companies").update({ tier: 2 })
          .eq("tier", 1).gte("consecutive_empty_runs", 14),
        admin.from("ats_companies").update({ tier: 3 })
          .eq("tier", 2).gte("consecutive_empty_runs", 21),
      ]);
      console.log(`[ats-ingest] Tier rebalance complete (4 rules applied)`);
    } catch (e) {
      console.error("[ats-ingest] Tier rebalance error:", e);
    }

    await admin.from("ats_ingest_runs").update({
      status: merged.errors.length > 0 ? "completed_with_errors" : "completed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      duplicates_removed,
    }).eq("id", runId);

    console.log(`[ats-ingest] Run ${runId} FINAL: ${merged.total_imported} imported across ${merged.companies_processed} companies`);

    if (merged.total_imported > 0) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/notify-new-jobs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ count: merged.total_imported, source: "ats" }),
        });
      } catch (e) {
        console.error("[ats-ingest] notify-new-jobs error:", e);
      }
    }
  };

  // @ts-ignore EdgeRuntime
  EdgeRuntime.waitUntil(backgroundWork());

  return new Response(
    JSON.stringify({
      success: true,
      run_id: runId,
      message: isLastChunk
        ? "ATS ingest started — final chunk processing in background"
        : "ATS ingest started — chunked processing in background",
      chunk: { offset: chunkOffset, size: companies.length, end: chunkEnd },
      total_companies: totalCompanies,
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
