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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Auth: founder/admin OR service-role
    const authClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await authClient.auth.getUser();

    if (user) {
      const { data: roleData } = await authClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "founder"]);
      if (!roleData || roleData.length === 0) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const token = authHeader.replace("Bearer ", "");
      if (token !== serviceRoleKey) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartIso = weekStart.toISOString();
    const weekStartDate = weekStartIso.split("T")[0];

    const { data: prefs } = await supabase
      .from("email_notification_preferences")
      .select("user_id")
      .eq("daily_digest_enabled", true)
      .is("unsubscribed_at", null);

    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscribed users", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = prefs.map((p) => p.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, first_name, skills")
      .in("user_id", userIds);

    if (!profiles) {
      return new Response(
        JSON.stringify({ message: "No profiles", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already-sent this week
    const { data: alreadySent } = await supabase
      .from("weekly_digest_log")
      .select("user_id")
      .eq("week_start", weekStartDate);
    const sentSet = new Set((alreadySent ?? []).map((r) => r.user_id));

    // Pull weekly aggregates
    const { count: weekJobsCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("is_archived", false)
      .gte("posted_date", weekStartIso);

    const siteUrl = Deno.env.get("SITE_URL") || "https://sociax.tech";
    let sent = 0;
    const errors: string[] = [];

    for (const pref of prefs) {
      if (sentSet.has(pref.user_id)) continue;
      const profile = profiles.find((p) => p.user_id === pref.user_id);
      if (!profile?.email) continue;

      // Per-user weekly numbers
      const { count: appliedCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", pref.user_id)
        .gte("applied_at", weekStartIso);

      // matched jobs estimate: jobs with overlapping skills posted this week (cap 200 fetch)
      let matchedCount = 0;
      const userSkills = (profile.skills || []).map((s: string) => s.toLowerCase());
      if (userSkills.length > 0) {
        const { data: weekJobs } = await supabase
          .from("jobs")
          .select("skills")
          .eq("is_published", true)
          .eq("is_archived", false)
          .gte("posted_date", weekStartIso)
          .limit(500);
        matchedCount = (weekJobs ?? []).filter((j: any) => {
          const js = (j.skills || []).map((s: string) => s.toLowerCase());
          return js.some((k: string) => userSkills.some((u: string) => k.includes(u) || u.includes(k)));
        }).length;
      }

      const name = profile.first_name || profile.full_name?.split(" ")[0] || profile.email.split("@")[0];
      const unsubscribeUrl = `${siteUrl}/unsubscribe?uid=${pref.user_id}`;

      const motivationalLines = [
        "Every application is one step closer. Keep going!",
        "The right role is out there — stay consistent.",
        "Showing up weekly is what separates job-getters from job-seekers.",
        "Your dream role is just a few applications away.",
      ];
      const line = motivationalLines[Math.floor(Math.random() * motivationalLines.length)];

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">📊 Your week in review</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Hey ${name}, here's how your job search looked this week.</p>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:24px;">
      <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2563eb;">${appliedCount ?? 0}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Applied</div>
      </div>
      <div style="background:#ecfdf5;border:1px solid #d1fae5;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#059669;">${matchedCount}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Matched you</div>
      </div>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#d97706;">${weekJobsCount ?? 0}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">New this week</div>
      </div>
    </div>

    <p style="font-size:14px;color:#0f172a;font-style:italic;border-left:3px solid #2563eb;padding-left:12px;margin:24px 0;">
      ${line}
    </p>

    <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;text-align:center;">
      <a href="${siteUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Continue your search →</a>
    </div>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
    You're receiving this because you're subscribed to Sociax updates.<br/>
    <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
  </p>
</div></body></html>`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Sociax <support@sociax.tech>",
            to: [profile.email],
            subject: "Your job search week in review — Sociax",
            html,
          }),
        });

        if (res.ok) {
          sent++;
          await supabase.from("weekly_digest_log").insert({
            user_id: pref.user_id,
            week_start: weekStartDate,
            jobs_viewed: 0,
            jobs_applied: appliedCount ?? 0,
            matched_jobs_count: matchedCount,
          });
        } else {
          errors.push(`${profile.email}: ${await res.text()}`);
        }
      } catch (e: any) {
        errors.push(`${profile.email}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Weekly digest complete",
        sent,
        total_users: prefs.length,
        skipped_already_sent: sentSet.size,
        errors: errors.length ? errors.slice(0, 10) : undefined,
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
