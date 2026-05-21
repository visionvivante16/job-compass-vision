import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://jobpulse99.lovable.app";

// Source quality scoring for job links
function sourceScore(link: string): number {
  const l = (link || "").toLowerCase();
  if (l.includes("greenhouse.io") || l.includes("greenhouse.com")) return 0;
  if (l.includes("lever.co")) return 1;
  if (
    !l.includes("workday") &&
    !l.includes("icims") &&
    !l.includes("taleo") &&
    !l.includes("smartrecruiters") &&
    !l.includes("jobvite") &&
    !l.includes("dice.com") &&
    !l.includes("lensa.com") &&
    !l.includes("lensa.")
  )
    return 2;
  if (l.includes("dice.com") || l.includes("lensa.")) return 9;
  return 3;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build a single job card for email
function jobCard(
  job: any,
  opts?: { matchScore?: number; highlight?: boolean }
): string {
  const borderColor = opts?.highlight ? "#dbeafe" : "#e2e8f0";
  const bg = opts?.highlight ? "#eff6ff" : "#ffffff";
  const salary = job.salary_range ? ` · ${escapeHtml(job.salary_range)}` : "";
  const empType = job.employment_type
    ? ` · ${escapeHtml(job.employment_type)}`
    : "";
  const matchBadge =
    opts?.matchScore != null
      ? `<span style="display:inline-block;background:#2563eb;color:white;font-size:11px;padding:2px 8px;border-radius:12px;margin-left:8px;">${opts.matchScore}% match</span>`
      : "";

  return `
  <div style="padding:14px;border:1px solid ${borderColor};border-radius:8px;margin-bottom:8px;background:${bg};">
    <a href="${escapeHtml(job.external_apply_link)}" style="font-weight:600;color:#2563eb;text-decoration:none;font-size:15px;">${escapeHtml(job.title)}</a>${matchBadge}
    <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${escapeHtml(job.company)} · ${escapeHtml(job.location)}${empType}${salary}</p>
  </div>`;
}

// Simple skill matching (server-side, no complex imports)
function matchScore(
  jobSkills: string[],
  jobTitle: string,
  userSkills: string[],
  userRole: string,
  targetTitles: string[]
): number {
  const normalize = (s: string) =>
    s.toLowerCase().trim().replace(/[.\-_]/g, "");
  const userSet = new Set(userSkills.map(normalize));

  // Skills overlap (45%)
  const jobNorm = jobSkills.map(normalize);
  const matched = jobNorm.filter((js) =>
    [...userSet].some((us) => js.includes(us) || us.includes(js))
  );
  const skillScore =
    jobNorm.length > 0 ? (matched.length / jobNorm.length) * 100 : 0;

  // Title similarity (35%)
  const jt = jobTitle.toLowerCase();
  const titlesToCheck = [userRole, ...targetTitles].filter(Boolean);
  let titleScore = 0;
  for (const t of titlesToCheck) {
    const tl = t.toLowerCase();
    if (jt === tl) {
      titleScore = 100;
      break;
    }
    if (jt.includes(tl) || tl.includes(jt)) {
      titleScore = Math.max(titleScore, 70);
    }
    // Word overlap
    const jWords = new Set(jt.split(/\s+/));
    const tWords = tl.split(/\s+/);
    const overlap = tWords.filter((w) => jWords.has(w)).length;
    if (tWords.length > 0) {
      titleScore = Math.max(titleScore, (overlap / tWords.length) * 60);
    }
  }

  return Math.round(skillScore * 0.45 + titleScore * 0.35 + 20); // 20% baseline for experience proximity
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Auth: require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "user_id, email, full_name, first_name, skills, resume_url, resume_intelligence, current_title"
      )
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userName =
      profile.first_name ||
      profile.full_name?.split(" ")[0] ||
      profile.email.split("@")[0];
    const unsubscribeUrl = `${SITE_URL}/unsubscribe?uid=${user.id}`;
    const hasResume = !!profile.resume_url;
    const intelligence = profile.resume_intelligence as any;

    let emailHtml: string;
    let subject: string;

    if (!hasResume) {
      // ===== NO RESUME: Send encouragement email with real hiring companies =====

      // Fetch recent unique companies from active jobs (last 48 hours, quality sources first)
      const twoDaysAgo = new Date(
        Date.now() - 48 * 60 * 60 * 1000
      ).toISOString();
      const { data: recentJobs } = await supabase
        .from("jobs")
        .select("company, external_apply_link")
        .eq("is_published", true)
        .eq("is_archived", false)
        .is("deleted_at", null)
        .gte("posted_date", twoDaysAgo)
        .order("posted_date", { ascending: false })
        .limit(100);

      // Deduplicate companies, prioritize by source quality
      const companyMap = new Map<string, number>();
      for (const j of recentJobs || []) {
        const name = j.company?.trim();
        if (!name) continue;
        const existing = companyMap.get(name);
        const score = sourceScore(j.external_apply_link);
        if (existing === undefined || score < existing) {
          companyMap.set(name, score);
        }
      }
      const sortedCompanies = [...companyMap.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, 6)
        .map(([name]) => name);

      const companiesHtml =
        sortedCompanies.length > 0
          ? `<p style="margin:16px 0;color:#334155;font-size:14px;line-height:1.6;">
              Companies actively hiring right now include:
              <strong>${sortedCompanies.map(escapeHtml).join(", ")}</strong>
              — and many more.
            </p>`
          : "";

      subject = `🚀 ${userName}, unlock personalized job matches on Sociax`;
      emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Hey ${escapeHtml(userName)}! 👋</h1>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      Welcome to Sociax! We noticed you haven't uploaded your resume yet.
    </p>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      By uploading your resume, you'll instantly unlock:
    </p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
      <li>🎯 <strong>Personalized job recommendations</strong> matched to your skills</li>
      <li>📊 <strong>ATS compatibility scores</strong> for each job</li>
      <li>📝 <strong>AI-tailored resumes</strong> optimized for specific roles</li>
      <li>💌 <strong>Daily email alerts</strong> when matching jobs appear</li>
    </ul>
    ${companiesHtml}
    <div style="margin:24px 0 16px;">
      <a href="${SITE_URL}/profile" style="display:inline-block;padding:12px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Upload Resume →</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:0;">It takes less than 30 seconds, and we'll handle the rest.</p>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
    <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
  </p>
</div>
</body>
</html>`;
    } else {
      // ===== HAS RESUME: Send personalized recommendation email =====

      const userSkills: string[] = intelligence?.topSkills ||
        intelligence?.primaryStack ||
        profile.skills || [];
      const userRole: string =
        intelligence?.primaryRole || profile.current_title || "";
      const targetTitles: string[] = intelligence?.jobTitlesToTarget || [];

      // Fetch recent active jobs
      const { data: jobs } = await supabase
        .from("jobs")
        .select(
          "id, title, company, location, skills, employment_type, salary_range, external_apply_link, posted_date"
        )
        .eq("is_published", true)
        .eq("is_archived", false)
        .is("deleted_at", null)
        .order("posted_date", { ascending: false })
        .limit(200);

      if (!jobs || jobs.length === 0) {
        return new Response(
          JSON.stringify({ message: "No jobs available to recommend", sent: 0 }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Score and rank jobs
      const scored = jobs
        .map((job) => ({
          ...job,
          score: matchScore(
            job.skills || [],
            job.title,
            userSkills,
            userRole,
            targetTitles
          ),
          source: sourceScore(job.external_apply_link),
        }))
        .filter((j) => j.score >= 40) // Only meaningful matches
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.source !== b.source) return a.source - b.source;
          return (
            new Date(b.posted_date).getTime() -
            new Date(a.posted_date).getTime()
          );
        })
        .slice(0, 10);

      if (scored.length === 0) {
        return new Response(
          JSON.stringify({
            message: "No strong matches found for this resume",
            sent: 0,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const roleLabel = userRole
        ? ` as a ${escapeHtml(userRole)}`
        : "";
      subject = `🎯 ${userName}, ${scored.length} jobs matched your resume on Sociax`;

      const jobCardsHtml = scored
        .map((j) =>
          jobCard(j, { matchScore: j.score, highlight: j.score >= 70 })
        )
        .join("");

      emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">🎯 Your Personalized Job Matches</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Hey ${escapeHtml(userName)}, based on your resume${roleLabel}, here are your top matches:
    </p>
    <div style="margin-bottom:20px;">
      ${jobCardsHtml}
    </div>
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;">
      <a href="${SITE_URL}/recommendations" style="display:inline-block;padding:12px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View All Recommendations →</a>
    </div>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
    You're receiving this because you uploaded your resume on Sociax.<br/>
    <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
  </p>
</div>
</body>
</html>`;
    }

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sociax Jobs <support@sociax.tech>",
        to: [profile.email],
        subject,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `Email send failed: ${errText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: hasResume
          ? "Recommendation email sent"
          : "Resume reminder email sent",
        sent: 1,
        type: hasResume ? "recommendation" : "reminder",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
