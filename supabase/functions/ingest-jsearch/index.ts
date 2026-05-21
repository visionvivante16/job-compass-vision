// JSearch auto-ingestion edge function
// Fetches jobs from JSearch API, applies USA + entry-level filters,
// enriches skills, deduplicates, and inserts into the jobs table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ───────────────────────── Skills enrichment ─────────────────────────
const COMMON_SKILLS: Record<string, string> = {
  js: "JavaScript", javascript: "JavaScript", typescript: "TypeScript", ts: "TypeScript",
  react: "React", reactjs: "React", "react.js": "React",
  angular: "Angular", vue: "Vue.js", vuejs: "Vue.js",
  node: "Node.js", nodejs: "Node.js", "node.js": "Node.js",
  python: "Python", java: "Java", "c#": "C#", csharp: "C#", "c++": "C++", cpp: "C++",
  go: "Go", golang: "Go", rust: "Rust", ruby: "Ruby", php: "PHP", swift: "Swift",
  kotlin: "Kotlin", scala: "Scala", r: "R",
  html: "HTML", html5: "HTML", css: "CSS", css3: "CSS", sass: "Sass", scss: "Sass",
  sql: "SQL", mysql: "MySQL", postgresql: "PostgreSQL", postgres: "PostgreSQL",
  mongodb: "MongoDB", redis: "Redis", elasticsearch: "Elasticsearch",
  aws: "AWS", azure: "Azure", gcp: "GCP", "google cloud": "GCP",
  docker: "Docker", kubernetes: "Kubernetes", k8s: "Kubernetes",
  terraform: "Terraform", jenkins: "Jenkins",
  git: "Git", github: "GitHub", "ci/cd": "CI/CD", cicd: "CI/CD",
  rest: "REST APIs", restful: "REST APIs", graphql: "GraphQL",
  kafka: "Kafka", linux: "Linux", bash: "Bash",
  agile: "Agile", scrum: "Scrum", jira: "Jira",
  figma: "Figma", "machine learning": "Machine Learning", ml: "Machine Learning",
  "deep learning": "Deep Learning", nlp: "NLP",
  tensorflow: "TensorFlow", pytorch: "PyTorch", pandas: "Pandas", numpy: "NumPy",
  spark: "Apache Spark", tableau: "Tableau", "power bi": "Power BI",
  salesforce: "Salesforce", "next.js": "Next.js", nextjs: "Next.js",
  express: "Express.js", django: "Django", flask: "Flask", spring: "Spring",
  ".net": ".NET", redux: "Redux", tailwind: "Tailwind CSS",
  jest: "Jest", cypress: "Cypress", selenium: "Selenium",
  firebase: "Firebase", snowflake: "Snowflake", databricks: "Databricks",
  airflow: "Airflow", microservices: "Microservices", serverless: "Serverless",
  excel: "Excel", etl: "ETL", devops: "DevOps", sre: "SRE",
  communication: "Communication", leadership: "Leadership",
};

const TITLE_SKILL_MAP: Record<string, string[]> = {
  "software engineer": ["JavaScript", "Python", "SQL", "Git", "REST APIs", "Agile", "Docker", "AWS"],
  frontend: ["JavaScript", "React", "CSS", "HTML", "TypeScript", "Git", "REST APIs", "Figma"],
  backend: ["Python", "Node.js", "SQL", "REST APIs", "Docker", "AWS", "Git", "PostgreSQL"],
  "full stack": ["JavaScript", "React", "Node.js", "SQL", "Git", "REST APIs", "Docker", "TypeScript"],
  "data engineer": ["Python", "SQL", "Apache Spark", "AWS", "ETL", "Airflow", "Docker", "PostgreSQL"],
  "data scientist": ["Python", "Machine Learning", "SQL", "Pandas", "TensorFlow", "NumPy", "Deep Learning", "R"],
  "data analyst": ["SQL", "Python", "Excel", "Tableau", "Power BI", "Pandas", "Communication", "Agile"],
  devops: ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Linux", "Git", "Jenkins"],
  "cloud engineer": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Linux", "CI/CD"],
  "machine learning": ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "SQL", "NumPy", "Pandas"],
  "qa engineer": ["Selenium", "Jest", "Cypress", "SQL", "Git", "Agile", "REST APIs", "JavaScript"],
  "product manager": ["Agile", "Scrum", "Jira", "Communication", "Leadership", "SQL", "Excel", "Tableau"],
  "business analyst": ["SQL", "Excel", "Tableau", "Power BI", "Communication", "Jira", "Agile", "Scrum"],
  "ux designer": ["Figma", "CSS", "HTML", "JavaScript", "Communication", "Agile", "Jira", "Sketch"],
  marketing: ["Excel", "Tableau", "SQL", "Communication", "Agile", "Salesforce", "Power BI", "Jira"],
  sales: ["Salesforce", "Communication", "Excel", "Leadership", "Agile", "SQL", "Tableau", "Jira"],
};

function enrichSkills(title: string, description: string, existing: string[]): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const text = (description || "").toLowerCase();

  // Extract from description
  const patterns = Object.keys(COMMON_SKILLS).sort((a, b) => b.length - a.length);
  for (const p of patterns) {
    const re = new RegExp(
      `(?:^|[\\s,;/|()•\\-])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,;/|()•\\-])`,
      "i"
    );
    if (re.test(text)) {
      const skill = COMMON_SKILLS[p];
      if (!seen.has(skill.toLowerCase())) {
        result.push(skill);
        seen.add(skill.toLowerCase());
      }
    }
  }

  // Title fallback
  if (result.length < 8) {
    const t = title.toLowerCase();
    for (const [key, skills] of Object.entries(TITLE_SKILL_MAP)) {
      if (t.includes(key)) {
        for (const s of skills) {
          if (!seen.has(s.toLowerCase())) {
            result.push(s);
            seen.add(s.toLowerCase());
          }
          if (result.length >= 8) break;
        }
        break;
      }
    }
  }
  return result;
}

// ───────────────────────── Filters (mirror frontend logic) ─────────────────────────
const EXCLUDED_TITLE_KEYWORDS = [
  "tutor", "tutoring", "teacher", "teaching assistant", "instructor", "lecturer",
  "trainer", "academic coach", "supervisor", "cleaning", "janitor", "janitorial",
  "custodian", "housekeeper", "housekeeping", "technician", "helper",
];

const SENIOR_TITLE_PATTERNS = [
  /\bsenior\b/i, /\bsr\.?\s/i, /\blead\s+(engineer|developer|designer|scientist|analyst)/i,
  /\bmanager\b/i, /\bhead\s+of\b/i, /\barchitect\b/i,
  /\bstaff\s+(engineer|developer|designer|scientist)/i,
  /\bprincipal\b/i, /\bdirector\b/i, /\bvp\b/i, /\bchief\b/i,
  /\b(cto|cfo|coo|ceo)\b/i, /\bfellow\b/i,
];

function isExcludedJob(title: string, description: string): boolean {
  const t = title.toLowerCase();
  if (EXCLUDED_TITLE_KEYWORDS.some((kw) => t.includes(kw))) return true;
  if (SENIOR_TITLE_PATTERNS.some((p) => p.test(title))) return true;
  // Years check
  const yrMatch = (description || "").match(/\b([4-9]|[1-9]\d)\+?\s*[-–]?\s*(?:\d+\s*)?(?:years?|yrs?)/i);
  if (yrMatch) {
    const num = parseInt(yrMatch[0].match(/\d+/)?.[0] || "0", 10);
    if (num > 5) return true;
  }
  return false;
}

const US_STATES_ABBR = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
]);

const FOREIGN_LOCATION_TOKENS = [
  "india","bengaluru","bangalore","mumbai","hyderabad","chennai","pune","delhi","gurgaon","noida","kolkata",
  "canada","toronto","vancouver","montreal","ottawa","ontario","quebec","alberta","british columbia",
  "united kingdom","england","london","manchester","scotland","wales","ireland","dublin",
  "germany","berlin","munich","france","paris","spain","madrid","barcelona","portugal","lisbon",
  "netherlands","amsterdam","belgium","brussels","sweden","stockholm","denmark","copenhagen",
  "norway","finland","poland","romania","czech","switzerland","zurich",
  "australia","sydney","melbourne","new zealand","auckland",
  "singapore","japan","tokyo","china","beijing","shanghai","hong kong","taiwan","korea","seoul",
  "philippines","manila","indonesia","jakarta","thailand","bangkok","vietnam","malaysia",
  "mexico","brazil","argentina","colombia","chile","peru",
  "south africa","nigeria","kenya","uae","dubai","saudi","israel","tel aviv",
  "remote - emea","remote - apac","remote - latam","remote - canada","remote canada","emea","apac","latam",
];

function isUSALocation(loc: string): boolean {
  if (!loc) return false;
  const lower = ` ${loc.toLowerCase()} `;
  // Reject if any foreign token is present
  if (FOREIGN_LOCATION_TOKENS.some((tok) => lower.includes(tok))) return false;
  if (/\bUS\b|\bUSA\b|united states/i.test(loc)) return true;
  const m = loc.match(/,\s*([A-Z]{2})\b/);
  if (m && US_STATES_ABBR.has(m[1])) return true;
  return false;
}

// ───────────────────────── Aggregator blocklist ─────────────────────────
// These domains either block iframing (ERR_BLOCKED_BY_RESPONSE), redirect
// through trackers, or are aggregator listings rather than direct employer
// career sites. Jobs whose only apply link is on one of these domains will
// be skipped at ingest.
const BLOCKED_APPLY_DOMAINS = new Set([
  "talent.com", "www.talent.com",
  "indeed.com", "www.indeed.com", "in.indeed.com",
  "click.appcast.io", "appcast.io",
  "jsv3.recruitics.com", "recruitics.com",
  "apply-v3.jobsync.io", "jobsync.io",
  "ziprecruiter.com", "www.ziprecruiter.com",
  "glassdoor.com", "www.glassdoor.com",
  "monster.com", "www.monster.com",
  "simplyhired.com", "www.simplyhired.com",
  "snagajob.com", "www.snagajob.com",
  "careerbuilder.com", "www.careerbuilder.com",
  "neuvoo.com", "www.neuvoo.com",
  "jobcase.com", "www.jobcase.com",
  "joblist.com", "www.joblist.com",
  "jooble.org", "www.jooble.org",
  "trabajo.org",
  "sundayy.com", "www.sundayy.com",
  "bestjobtool.com", "www.bestjobtool.com",
  "learn4good.com", "www.learn4good.com",
  "adzuna.com", "www.adzuna.com", "www.adzuna.com.au", "www.adzuna.com.mx",
  "linkedin.com", "www.linkedin.com",
  "uk.linkedin.com", "ca.linkedin.com", "cn.linkedin.com", "il.linkedin.com",
  "nl.linkedin.com", "ae.linkedin.com", "ch.linkedin.com", "de.linkedin.com",
  "fr.linkedin.com",
  "ad.doubleclick.net", "doubleclick.net",
  "clearancejobs.com", "www.clearancejobs.com",
]);

// Domains matched by suffix (any subdomain). Useful when aggregators use
// many regional/random subdomains (e.g. tnl2.jometer.com, rr.jobsyn.org).
const BLOCKED_APPLY_DOMAIN_SUFFIXES = [
  "jometer.com",
  "jobsyn.org",
  "learn4good.com",
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isBlockedApplyLink(url: string): boolean {
  const d = getDomain(url);
  if (!d) return true;
  if (BLOCKED_APPLY_DOMAINS.has(d)) return true;
  for (const suffix of BLOCKED_APPLY_DOMAIN_SUFFIXES) {
    if (d === suffix || d.endsWith("." + suffix)) return true;
  }
  return false;
}

interface ApplyOption {
  publisher?: string;
  apply_link?: string;
  is_direct?: boolean;
}

/**
 * Pick a direct employer career-site link from JSearch's apply_options[].
 * Falls back to job_apply_link only if it's not on the aggregator blocklist.
 * Returns null if no usable direct link can be found.
 */
function pickDirectApplyLink(j: JSearchJob): string | null {
  const opts = Array.isArray(j.apply_options) ? j.apply_options : [];

  // 1. Prefer is_direct === true with an unblocked domain
  for (const opt of opts) {
    if (opt?.is_direct === true && opt.apply_link && !isBlockedApplyLink(opt.apply_link)) {
      return opt.apply_link;
    }
  }

  // 2. Any apply_options link on a non-blocked domain
  for (const opt of opts) {
    if (opt?.apply_link && !isBlockedApplyLink(opt.apply_link)) {
      return opt.apply_link;
    }
  }

  // 3. Fall back to job_apply_link only if it's not blocked
  if (j.job_apply_link && !isBlockedApplyLink(j.job_apply_link)) {
    return j.job_apply_link;
  }

  return null;
}

// ───────────────────────── JSearch fetch ─────────────────────────
interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo?: string;
  job_employment_type?: string;
  job_apply_link: string;
  apply_options?: ApplyOption[];
  job_description: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_posted_at_datetime_utc?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_required_skills?: string[];
}

async function fetchJSearch(
  apiKey: string,
  query: string,
  country: string,
  datePosted: string,
  employmentTypes: string,
  jobRequirements: string | null
): Promise<JSearchJob[]> {
  const params = new URLSearchParams({
    query,
    page: "1",
    num_pages: "5",
    country,
    date_posted: datePosted,
    employment_types: employmentTypes,
  });
  if (jobRequirements) params.set("job_requirements", jobRequirements);

  const res = await fetch(`https://jsearch.p.rapidapi.com/search?${params}`, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JSearch API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.data || [];
}

function buildLocation(j: JSearchJob): string {
  const parts = [j.job_city, j.job_state, j.job_country].filter(Boolean);
  return parts.join(", ") || "Remote";
}

function formatSalary(j: JSearchJob): string | null {
  if (!j.job_min_salary || !j.job_max_salary) return null;
  const cur = j.job_salary_currency || "USD";
  const period = j.job_salary_period === "HOUR" ? "/hr" : "/yr";
  return `${cur} ${j.job_min_salary.toLocaleString()} - ${j.job_max_salary.toLocaleString()}${period}`;
}

// ───────────────────────── Main handler ─────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const JSEARCH_API_KEY = Deno.env.get("JSEARCH_API_KEY");

  if (!JSEARCH_API_KEY) {
    return new Response(
      JSON.stringify({ error: "JSEARCH_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Auth: must be admin (skip for cron with service role bearer)
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

  // Optional: specific seed_id from request body to test a single query
  let bodySeedId: string | null = null;
  try {
    const body = await req.json();
    bodySeedId = body?.seed_id || null;
  } catch { /* no body */ }

  // Create run record
  const { data: runRow } = await admin
    .from("jsearch_ingest_runs")
    .insert({ triggered_by: triggeredBy, trigger_type: triggerType, status: "running" })
    .select("id")
    .single();
  const runId = runRow?.id;

  const startedAt = Date.now();
  const stats = {
    total_fetched: 0,
    total_imported: 0,
    total_skipped: 0,
    total_filtered: 0,
    duplicates_removed: 0,
    errors: [] as { query: string; error: string }[],
    per_query: [] as { query: string; fetched: number; imported: number }[],
  };

  // Fetch active seeds
  let seedQuery = admin
    .from("jsearch_query_seeds")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (bodySeedId) seedQuery = admin.from("jsearch_query_seeds").select("*").eq("id", bodySeedId);

  const { data: seeds, error: seedErr } = await seedQuery;
  if (seedErr || !seeds?.length) {
    await admin.from("jsearch_ingest_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      errors: [{ query: "seeds", error: seedErr?.message || "No active seeds" }],
    }).eq("id", runId);
    return new Response(
      JSON.stringify({ error: "No active seeds configured" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Background task: process all seeds without blocking the HTTP response.
  // Edge Function HTTP responses time out at ~150s, but EdgeRuntime.waitUntil
  // keeps the worker alive for the full background task duration (up to ~400s).
  const backgroundWork = async () => {
    console.log(`[ingest-jsearch] Starting background processing of ${seeds.length} seeds (run ${runId})`);
    for (const seed of seeds) {
      try {
        console.log(`[ingest-jsearch] Processing seed: ${seed.query}`);
        const jobs = await fetchJSearch(
          JSEARCH_API_KEY,
          seed.query,
          seed.country,
          seed.date_posted,
          seed.employment_types,
          seed.job_requirements
        );
        stats.total_fetched += jobs.length;
        let importedThisSeed = 0;

        for (const j of jobs) {
          if (!j.job_title || !j.employer_name) {
            stats.total_skipped++;
            continue;
          }

          // STRICT: only ingest jobs with a direct employer career-site link.
          const directApplyLink = pickDirectApplyLink(j);
          if (!directApplyLink) {
            stats.total_filtered++;
            continue;
          }

          const location = buildLocation(j);
          if (!isUSALocation(location)) {
            stats.total_filtered++;
            continue;
          }
          if (isExcludedJob(j.job_title, j.job_description || "")) {
            stats.total_filtered++;
            continue;
          }

          const { data: existing } = await admin
            .from("jobs")
            .select("id")
            .eq("external_apply_link", directApplyLink)
            .maybeSingle();
          if (existing) {
            stats.total_skipped++;
            continue;
          }

          const enrichedSkills = enrichSkills(
            j.job_title,
            j.job_description || "",
            j.job_required_skills || []
          );

          const { error: insertErr } = await admin.from("jobs").insert({
            title: j.job_title.trim(),
            company: j.employer_name.trim(),
            company_logo: j.employer_logo || null,
            location,
            description: j.job_description || "",
            skills: enrichedSkills,
            external_apply_link: directApplyLink,
            employment_type: j.job_employment_type === "INTERN" ? "Internship" : "Full Time",
            salary_range: formatSalary(j),
            posted_date: new Date().toISOString(),
            is_published: true,
            is_archived: false,
            is_direct_apply: true,
            ingested_via: "jsearch",
          });

          if (insertErr) {
            stats.errors.push({ query: seed.query, error: insertErr.message });
            stats.total_skipped++;
          } else {
            stats.total_imported++;
            importedThisSeed++;
          }
        }

        stats.per_query.push({ query: seed.query, fetched: jobs.length, imported: importedThisSeed });

        await admin
          .from("jsearch_query_seeds")
          .update({ last_run_at: new Date().toISOString(), last_imported_count: importedThisSeed })
          .eq("id", seed.id);

        // Persist progress after every seed so the UI shows live progress
        await admin.from("jsearch_ingest_runs").update({
          total_fetched: stats.total_fetched,
          total_imported: stats.total_imported,
          total_skipped: stats.total_skipped,
          total_filtered: stats.total_filtered,
          details: { per_query: stats.per_query },
        }).eq("id", runId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[ingest-jsearch] Error on "${seed.query}":`, msg);
        stats.errors.push({ query: seed.query, error: msg });
      }
    }

    // Run dedup sweep
    try {
      const { data: dedupRes } = await admin.rpc("remove_duplicate_jobs");
      stats.duplicates_removed = (dedupRes as { removed?: number })?.removed || 0;
    } catch (e) {
      console.error("[ingest-jsearch] Dedup error:", e);
    }

    await admin.from("jsearch_ingest_runs").update({
      status: stats.errors.length > 0 ? "completed_with_errors" : "completed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      total_fetched: stats.total_fetched,
      total_imported: stats.total_imported,
      total_skipped: stats.total_skipped,
      total_filtered: stats.total_filtered,
      duplicates_removed: stats.duplicates_removed,
      errors: stats.errors,
      details: { per_query: stats.per_query },
    }).eq("id", runId);

    console.log(`[ingest-jsearch] Background run ${runId} complete: ${stats.total_imported} imported, ${stats.total_filtered} filtered`);

    // Notify opted-in users about new jobs (fire-and-forget)
    if (stats.total_imported > 0) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-new-jobs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ count: stats.total_imported, source: "jsearch" }),
        });
      } catch (e) {
        console.error("[ingest-jsearch] notify-new-jobs error:", e);
      }
    }

    // Auto-grow the ATS company list from any new Greenhouse/Lever/Ashby
    // apply links that JSearch surfaced. Fire-and-forget.
    if (stats.total_imported > 0) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ats-extract-from-existing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({}),
        });
      } catch (e) {
        console.error("[ingest-jsearch] ats-extract-from-existing error:", e);
      }
    }

    // Trigger silent description enrichment for short descriptions
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-job-description`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.error("[ingest-jsearch] enrich trigger failed:", e);
    }
  };

  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  EdgeRuntime.waitUntil(backgroundWork());

  // Respond immediately with 202 Accepted
  return new Response(
    JSON.stringify({
      success: true,
      run_id: runId,
      message: "Ingest started in background — check /admin/import for progress",
      seeds_count: seeds.length,
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
