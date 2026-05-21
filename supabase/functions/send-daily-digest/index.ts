import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard: only allow service-role or founder callers
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify the caller is authenticated and is a founder/admin
    const { createClient: createAuthClient } = await import("https://esm.sh/@supabase/supabase-js@2.94.1");
    const authSupabase = createAuthClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    
    // Allow service-role calls (from pg_cron) — token won't resolve to a user
    // For user calls, require founder/admin role
    if (user) {
      const { data: roleData } = await authSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "founder"]);
      
      if (!roleData || roleData.length === 0) {
        return new Response(JSON.stringify({ error: "Unauthorized: admin or founder role required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (authError) {
      // If it's not a valid service-role key either, reject
      const token = authHeader.replace("Bearer ", "");
      if (token !== serviceRoleKey) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get users who have daily digest enabled
    const { data: prefs, error: prefsError } = await supabase
      .from("email_notification_preferences")
      .select("user_id, new_jobs_enabled, matched_jobs_enabled, sponsorship_jobs_enabled")
      .eq("daily_digest_enabled", true)
      .is("unsubscribed_at", null);

    if (prefsError) throw prefsError;
    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscribed users", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine lookback window: "morning" (24h, default) or "midday" (~5h since 8am send)
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const windowMode = body?.window === "midday" ? "midday" : "morning";
    const lookbackMs = windowMode === "midday" ? 5 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const sinceIso = new Date(Date.now() - lookbackMs).toISOString();

    const { data: newJobs } = await supabase
      .from("jobs")
      .select("id, title, company, location, skills, description, employment_type, salary_range, external_apply_link")
      .eq("is_published", true)
      .eq("is_archived", false)
      .gte("posted_date", sinceIso)
      .order("posted_date", { ascending: false })
      .limit(50);

    if (!newJobs || newJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: `No new jobs in ${windowMode} window`, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Identify sponsorship jobs
    const sponsorshipKeywords = ["visa", "sponsor", "h1b", "h-1b", "opt", "stem opt", "work authorization"];
    const sponsorshipJobs = newJobs.filter((job) => {
      const text = `${job.title} ${job.description} ${job.skills?.join(" ")}`.toLowerCase();
      return sponsorshipKeywords.some((kw) => text.includes(kw));
    });

    // Get profiles for matching
    const userIds = prefs.map((p) => p.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, skills")
      .in("user_id", userIds);

    if (!profiles) {
      return new Response(
        JSON.stringify({ message: "No profiles found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://jobpulse99.lovable.app";
    let sentCount = 0;
    const errors: string[] = [];

    for (const pref of prefs) {
      const profile = profiles.find((p) => p.user_id === pref.user_id);
      if (!profile?.email) continue;

      // Find matched jobs based on user skills
      const userSkills = (profile.skills || []).map((s: string) => s.toLowerCase());
      const matchedJobs = userSkills.length > 0
        ? newJobs.filter((job) => {
            const jobSkills = (job.skills || []).map((s: string) => s.toLowerCase());
            return jobSkills.some((js: string) => userSkills.some((us: string) => js.includes(us) || us.includes(js)));
          }).slice(0, 5)
        : [];

      // Build email content
      const userName = profile.full_name || profile.email.split("@")[0];
      const unsubscribeUrl = `${siteUrl}/unsubscribe?uid=${pref.user_id}`;

      let emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">📋 Sociax Jobs Notify</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Hey ${userName}, here's your ${windowMode === "midday" ? "midday" : "daily"} job digest from Sociax!</p>`;

      // New jobs section
      if (pref.new_jobs_enabled && newJobs.length > 0) {
        emailHtml += `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px;">🆕 ${newJobs.length} New Jobs Today</h2>`;
        for (const job of newJobs.slice(0, 5)) {
          emailHtml += `
      <div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
        <a href="${job.external_apply_link}" style="font-weight:600;color:#2563eb;text-decoration:none;font-size:15px;">${job.title}</a>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${job.company} · ${job.location}${job.salary_range ? ` · ${job.salary_range}` : ""}</p>
      </div>`;
        }
        if (newJobs.length > 5) {
          emailHtml += `<p style="color:#64748b;font-size:13px;">...and ${newJobs.length - 5} more. <a href="${siteUrl}/dashboard" style="color:#2563eb;">View all →</a></p>`;
        }
        emailHtml += `</div>`;
      }

      // Matched jobs section
      if (pref.matched_jobs_enabled && matchedJobs.length > 0) {
        emailHtml += `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px;">🎯 Jobs Matching Your Skills</h2>`;
        for (const job of matchedJobs) {
          emailHtml += `
      <div style="padding:12px;border:1px solid #dbeafe;border-radius:8px;margin-bottom:8px;background:#eff6ff;">
        <a href="${job.external_apply_link}" style="font-weight:600;color:#2563eb;text-decoration:none;font-size:15px;">${job.title}</a>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${job.company} · ${job.location}</p>
      </div>`;
        }
        emailHtml += `</div>`;
      }

      // Sponsorship jobs section
      if (pref.sponsorship_jobs_enabled && sponsorshipJobs.length > 0) {
        emailHtml += `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:18px;color:#0f172a;margin:0 0 12px;">✅ New Visa Sponsorship Jobs</h2>`;
        for (const job of sponsorshipJobs.slice(0, 5)) {
          emailHtml += `
      <div style="padding:12px;border:1px solid #d1fae5;border-radius:8px;margin-bottom:8px;background:#ecfdf5;">
        <a href="${job.external_apply_link}" style="font-weight:600;color:#059669;text-decoration:none;font-size:15px;">${job.title}</a>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${job.company} · ${job.location}</p>
      </div>`;
        }
        emailHtml += `</div>`;
      }

      // Footer with unsubscribe
      emailHtml += `
     <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;">
      <a href="${siteUrl}/dashboard" style="display:inline-block;padding:10px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Browse All Jobs on Sociax</a>
    </div>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
    You're receiving this because you're subscribed to Sociax daily job digest.<br/>
    <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
  </p>
</div>
</body>
</html>`;

      // Send email via Resend
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Sociax Jobs <support@sociax.tech>",
            to: [profile.email],
            subject: `📋 ${windowMode === "midday" ? "Midday update" : "Sociax Jobs Notify"} — ${newJobs.length} ${windowMode === "midday" ? "fresh" : "new"} jobs${matchedJobs.length > 0 ? ` · ${matchedJobs.length} match your skills` : ""}`,
            html: emailHtml,
          }),
        });

        if (res.ok) {
          sentCount++;
        } else {
          const errText = await res.text();
          errors.push(`${profile.email}: ${errText}`);
        }
      } catch (emailErr: any) {
        errors.push(`${profile.email}: ${emailErr.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Daily digest sent",
        sent: sentCount,
        total_users: prefs.length,
        new_jobs: newJobs.length,
        sponsorship_jobs: sponsorshipJobs.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
