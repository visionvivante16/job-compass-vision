// send-inactivity-nudge
// Daily cron. Finds users who haven't signed in for 7+ days, AND haven't been
// nudged in the last 14 days, and emails them about new jobs they're missing.
//
// Auth: requires SUPABASE_SERVICE_ROLE_KEY as Bearer (cron-only).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INACTIVE_DAYS = 7;
const NUDGE_COOLDOWN_DAYS = 14;
const SITE_URL = Deno.env.get("SITE_URL") || "https://sociax.tech";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (authHeader.replace("Bearer ", "") !== serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // Pull candidate users from auth.users via admin API
    const inactiveSinceMs = Date.now() - INACTIVE_DAYS * 86400000;
    const cooldownSinceMs = Date.now() - NUDGE_COOLDOWN_DAYS * 86400000;

    // Get profiles with email + skills, joined with last_inactivity_nudge_at
    const { data: candidates, error: candErr } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, skills, last_inactivity_nudge_at")
      .not("email", "is", null);
    if (candErr) throw candErr;

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Respect digest opt-out (use same toggle to keep one unsubscribe)
    const userIds = candidates.map((c) => c.user_id);
    const { data: prefs } = await supabase
      .from("email_notification_preferences")
      .select("user_id, daily_digest_enabled, unsubscribed_at")
      .in("user_id", userIds);
    const optedOut = new Set(
      (prefs || [])
        .filter((p) => !p.daily_digest_enabled || p.unsubscribed_at)
        .map((p) => p.user_id)
    );

    // Count of new jobs in the last 7 days (used in email body)
    const since = new Date(inactiveSinceMs).toISOString();
    const { count: newJobsCount } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .eq("is_archived", false)
      .gte("posted_date", since);

    // For each candidate, check auth.users.last_sign_in_at
    let sent = 0;
    const errors: string[] = [];
    const successUserIds: string[] = [];

    for (const c of candidates) {
      if (optedOut.has(c.user_id)) continue;
      // Cooldown: skip if nudged within NUDGE_COOLDOWN_DAYS
      if (c.last_inactivity_nudge_at && new Date(c.last_inactivity_nudge_at).getTime() > cooldownSinceMs) {
        continue;
      }

      // Get auth user
      const { data: authUser } = await supabase.auth.admin.getUserById(c.user_id);
      const lastSignIn = authUser?.user?.last_sign_in_at;
      if (!lastSignIn) continue;
      if (new Date(lastSignIn).getTime() > inactiveSinceMs) continue; // active recently

      const userName = c.full_name || (c.email as string).split("@")[0];
      const unsubscribeUrl = `${SITE_URL}/unsubscribe?uid=${c.user_id}`;
      const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a;">We miss you, ${userName} 👋</h1>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.5;">
      It's been a week since your last visit to Sociax. In that time,
      <strong>${newJobsCount || 0} new jobs</strong> have been posted —
      some may match your profile.
    </p>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">
      Hop back in to see what's new and apply before others do.
    </p>
    <a href="${SITE_URL}/dashboard" style="display:inline-block;padding:12px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">See new jobs →</a>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
    <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
  </p>
</div></body></html>`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Sociax <support@sociax.tech>",
            to: [c.email],
            subject: `👋 ${newJobsCount || 0} new jobs since you've been gone`,
            html,
          }),
        });
        if (res.ok) {
          sent++;
          successUserIds.push(c.user_id);
        } else {
          errors.push(`${c.email}: ${await res.text()}`);
        }
      } catch (e: any) {
        errors.push(`${c.email}: ${e.message}`);
      }
    }

    // Update last_inactivity_nudge_at for everyone we successfully emailed
    if (successUserIds.length > 0) {
      await supabase
        .from("profiles")
        .update({ last_inactivity_nudge_at: new Date().toISOString() })
        .in("user_id", successUserIds);
    }

    return new Response(
      JSON.stringify({ message: "Inactivity nudges sent", sent, new_jobs: newJobsCount, errors: errors.length ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
