// notify-new-jobs
// Service-to-service edge function. Called by ingest functions after a run
// finishes with new imports. Sends ONE summary email per opted-in user.
//
// Throttling: a given user is emailed at most once every NOTIFY_COOLDOWN_HOURS
// (default 6h). If multiple ingest runs finish in that window, we skip
// sending and just bump the count for the next allowed window.
//
// Auth: requires the SUPABASE_SERVICE_ROLE_KEY as a Bearer token. This
// function MUST never be called with a user JWT — it sends to many users.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const NOTIFY_COOLDOWN_HOURS = 6;
const SITE_URL = Deno.env.get("SITE_URL") || "https://sociax.tech";
const SENDER = "Sociax <info@sociax.tech>";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderEmail(opts: {
  firstName?: string | null;
  count: number;
  source: string;
}): { subject: string; html: string } {
  const greeting = opts.firstName
    ? `Hi ${esc(opts.firstName)},`
    : "Hi there,";
  const niceSource =
    {
      ats: "company career sites",
      jsearch: "JSearch",
      arbeitnow: "Arbeitnow",
      sheet: "our editorial team",
      manual: "our editorial team",
    }[opts.source] || "our partners";

  const headline =
    opts.count === 1
      ? "1 new job is waiting for you"
      : `${opts.count} new jobs are waiting for you`;

  const subject = `🎯 ${headline} on Sociax`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(headline)} — fresh roles imported from ${esc(niceSource)}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <tr><td>
      <h1 style="font-size:20px;margin:0 0 24px 0;color:#1a1a2e;">Sociax</h1>
      <p style="font-size:16px;line-height:1.6;">${greeting}</p>
      <h2 style="font-size:22px;margin:16px 0 8px 0;color:#1a1a2e;">${esc(headline)} 🎉</h2>
      <p style="font-size:15px;line-height:1.7;color:#333;">
        We just finished importing fresh roles from ${esc(niceSource)}.
        Jump in and see what's new — early applicants get noticed.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td style="background-color:#1a1a2e;border-radius:6px;">
          <a href="${esc(SITE_URL)}/dashboard" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Browse new jobs</a>
        </td></tr>
      </table>
      <p style="color:#666;font-size:13px;line-height:1.6;">
        Tip: complete your profile and upload a resume to get AI-matched roles delivered first.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px 0;" />
      <p style="color:#999;font-size:12px;line-height:1.5;margin:0;">
        &copy; ${new Date().getFullYear()} Sociax. All rights reserved.<br/>
        You're receiving this email because you opted in to new-job alerts.
        <a href="${esc(SITE_URL)}/profile" style="color:#999;">Manage preferences</a>.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      console.error("[notify-new-jobs] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role auth check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token || token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const count = Number((body as any).count) || 0;
    const source = String((body as any).source || "manual");
    if (count <= 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_new_jobs" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1) Pull every user that opted in to new-job emails
    const { data: prefs, error: prefsErr } = await admin
      .from("email_notification_preferences")
      .select("user_id")
      .eq("new_jobs_enabled", true)
      .is("unsubscribed_at", null);

    if (prefsErr) {
      console.error("[notify-new-jobs] prefs error:", prefsErr);
      throw prefsErr;
    }

    const userIds = (prefs || []).map((p: any) => p.user_id).filter(Boolean);
    if (userIds.length === 0) {
      console.log("[notify-new-jobs] no opted-in users");
      return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Pull profile emails + names in one shot (chunk if huge)
    const profilesByUser = new Map<string, { email: string; first_name: string | null }>();
    const CHUNK = 500;
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const chunk = userIds.slice(i, i + CHUNK);
      const { data: profs, error: profErr } = await admin
        .from("profiles")
        .select("user_id, email, first_name, full_name, contact_email")
        .in("user_id", chunk);
      if (profErr) {
        console.error("[notify-new-jobs] profiles error:", profErr);
        continue;
      }
      for (const p of profs || []) {
        const e = (p.contact_email || p.email || "").toString().trim();
        if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) continue;
        profilesByUser.set(p.user_id, {
          email: e,
          first_name: p.first_name || (p.full_name ? String(p.full_name).split(" ")[0] : null),
        });
      }
    }

    // 3) Pull throttle log to skip recently-emailed users
    const { data: lastNotified, error: notifErr } = await admin
      .from("new_jobs_notification_log")
      .select("user_id, last_notified_at")
      .in("user_id", Array.from(profilesByUser.keys()));
    if (notifErr) console.error("[notify-new-jobs] notif log read err:", notifErr);

    const cooldownMs = NOTIFY_COOLDOWN_HOURS * 60 * 60 * 1000;
    const cutoff = Date.now() - cooldownMs;
    const recentlyNotified = new Set(
      (lastNotified || [])
        .filter((n: any) => new Date(n.last_notified_at).getTime() > cutoff)
        .map((n: any) => n.user_id),
    );

    // 4) Send (with light rate-limiting to be friendly to Resend)
    let sent = 0;
    let skipped = recentlyNotified.size;
    let failed = 0;
    const sentUserIds: string[] = [];

    const RATE_DELAY_MS = 120; // ~8/s, safely under Resend's 10/s default

    for (const [userId, profile] of profilesByUser.entries()) {
      if (recentlyNotified.has(userId)) continue;

      const { subject, html } = renderEmail({
        firstName: profile.first_name,
        count,
        source,
      });

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: SENDER,
            to: [profile.email],
            subject,
            html,
            headers: {
              "List-Unsubscribe": `<mailto:support@sociax.tech?subject=unsubscribe>, <${SITE_URL}/unsubscribe>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        });

        if (!res.ok) {
          failed++;
          const txt = await res.text().catch(() => "");
          console.error(`[notify-new-jobs] Resend ${res.status} for ${profile.email}: ${txt.slice(0, 200)}`);
        } else {
          sent++;
          sentUserIds.push(userId);
        }
      } catch (e) {
        failed++;
        console.error(`[notify-new-jobs] send error for ${profile.email}:`, e);
      }

      // Tiny pause between sends
      await new Promise((r) => setTimeout(r, RATE_DELAY_MS));
    }

    // 5) Upsert throttle log for the users we actually emailed
    if (sentUserIds.length > 0) {
      const now = new Date().toISOString();
      const rows = sentUserIds.map((uid) => ({
        user_id: uid,
        last_notified_at: now,
        jobs_count_last_notification: count,
        source,
        updated_at: now,
      }));
      const { error: upErr } = await admin
        .from("new_jobs_notification_log")
        .upsert(rows, { onConflict: "user_id" });
      if (upErr) console.error("[notify-new-jobs] log upsert err:", upErr);
    }

    console.log(`[notify-new-jobs] source=${source} count=${count} eligible=${profilesByUser.size} sent=${sent} skipped=${skipped} failed=${failed}`);

    return new Response(
      JSON.stringify({ ok: true, source, count, sent, skipped, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[notify-new-jobs] fatal:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", detail: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
