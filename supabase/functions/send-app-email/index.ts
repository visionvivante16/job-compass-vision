// Reusable transactional email sender for Sociax
// Routes by `type` to the correct sender:
//   support  -> support@sociax.tech  (ticket replies, support comms, user issues)
//   update   -> info@sociax.tech     (job alerts, product updates, onboarding, payment updates)
//
// All sends go through Resend. Authentication: caller MUST be an authenticated
// user (JWT verified manually). Recipient is locked to the caller's own email
// UNLESS the caller is admin/founder (so admins can send to any user, e.g.
// onboarding emails or job-alert pushes from server-side jobs).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------- Sender routing ----------
type SenderType = "support" | "update";

const SENDERS: Record<SenderType, string> = {
  support: "Sociax Support <support@sociax.tech>",
  update: "Sociax <info@sociax.tech>",
};

// ---------- Template registry ----------
type TemplateName =
  | "job_alert"
  | "welcome"
  | "payment_success"
  | "payment_failure"
  | "product_update"
  | "support_message";

interface TemplateInput {
  name: TemplateName;
  data: Record<string, any>;
}

const SITE_URL =
  Deno.env.get("SITE_URL") || "https://sociax.tech";

// Tiny HTML escaper (templates only inject escaped values)
const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Shared layout — white bg, brand-consistent
const layout = (innerHtml: string, preheader = "") => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <tr><td>
      <h1 style="font-size:20px;margin:0 0 24px 0;color:#1a1a2e;">Sociax</h1>
      ${innerHtml}
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px 0;" />
      <p style="color:#999;font-size:12px;line-height:1.5;margin:0;">
        &copy; ${new Date().getFullYear()} Sociax. All rights reserved.<br/>
        You're receiving this email because you have a Sociax account.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

const cta = (href: string, label: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background-color:#1a1a2e;border-radius:6px;">
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">${esc(label)}</a>
    </td></tr>
  </table>`;

// ---------- Templates ----------
function renderTemplate(t: TemplateInput): { subject: string; html: string; sender: SenderType } {
  const name = t.data?.name ? `Hi ${esc(t.data.name)},` : "Hi there,";

  switch (t.name) {
    case "welcome": {
      return {
        sender: "update",
        subject: "Welcome to Sociax 🎉",
        html: layout(
          `<p style="font-size:16px;line-height:1.6;">${name}</p>
           <p style="font-size:16px;line-height:1.6;">Welcome to Sociax — we're glad to have you. Your account is ready, and fresh roles are waiting on your dashboard.</p>
           ${cta(`${SITE_URL}/dashboard`, "Open your dashboard")}
           <p style="color:#666;font-size:14px;line-height:1.6;">Tip: upload your resume from your profile to unlock AI job matching, ATS checks, and tailored cover letters.</p>`,
          "Welcome to Sociax — your dashboard is ready."
        ),
      };
    }

    case "job_alert": {
      const jobs: Array<{ title: string; company: string; location?: string; url: string }> =
        Array.isArray(t.data?.jobs) ? t.data.jobs : [];
      const intro = esc(t.data?.intro || `${jobs.length} new role${jobs.length === 1 ? "" : "s"} matching your profile`);
      const list = jobs
        .slice(0, 8)
        .map(
          (j) => `
          <tr><td style="padding:12px;border:1px solid #eee;border-radius:8px;">
            <a href="${esc(j.url)}" style="font-weight:600;color:#2563eb;text-decoration:none;font-size:15px;">${esc(j.title)}</a>
            <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${esc(j.company)}${j.location ? ` · ${esc(j.location)}` : ""}</p>
          </td></tr>
          <tr><td style="height:8px;"></td></tr>`
        )
        .join("");
      return {
        sender: "update",
        subject: `🎯 ${intro}`,
        html: layout(
          `<p style="font-size:16px;line-height:1.6;">${name}</p>
           <p style="font-size:16px;line-height:1.6;">${intro}:</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list}</table>
           ${cta(`${SITE_URL}/dashboard`, "Browse all jobs")}`,
          intro
        ),
      };
    }

    case "payment_success": {
      const plan = esc(t.data?.plan || "Sociax Premium");
      const amount = esc(t.data?.amount || "");
      return {
        sender: "update",
        subject: "Payment received — welcome to Sociax Premium ✅",
        html: layout(
          `<p style="font-size:16px;line-height:1.6;">${name}</p>
           <p style="font-size:16px;line-height:1.6;">Your payment for <strong>${plan}</strong>${amount ? ` (${amount})` : ""} was successful. Premium features are now unlocked on your account.</p>
           <ul style="color:#333;font-size:15px;line-height:1.8;padding-left:20px;">
             <li>Unlimited job applications</li>
             <li>AI-tailored resumes & cover letters</li>
             <li>ATS compatibility checks</li>
             <li>Priority job alerts</li>
           </ul>
           ${cta(`${SITE_URL}/dashboard`, "Go to dashboard")}`,
          "Your Sociax Premium is active."
        ),
      };
    }

    case "payment_failure": {
      const reason = esc(t.data?.reason || "Your card was declined.");
      const retryUrl = esc(t.data?.retry_url || `${SITE_URL}/profile`);
      return {
        sender: "update",
        subject: "Action needed: your Sociax payment didn't go through",
        html: layout(
          `<p style="font-size:16px;line-height:1.6;">${name}</p>
           <p style="font-size:16px;line-height:1.6;">We couldn't process your latest payment for Sociax Premium.</p>
           <p style="color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;font-size:14px;">${reason}</p>
           <p style="font-size:15px;line-height:1.6;">No worries — you can retry with another card in a few clicks:</p>
           ${cta(retryUrl, "Retry payment")}`,
          "Your Sociax payment didn't go through."
        ),
      };
    }

    case "product_update": {
      const title = esc(t.data?.title || "What's new on Sociax");
      const body = esc(t.data?.body || "");
      const linkUrl = t.data?.link_url ? esc(t.data.link_url) : `${SITE_URL}/dashboard`;
      const linkLabel = esc(t.data?.link_label || "Check it out");
      return {
        sender: "update",
        subject: title,
        html: layout(
          `<p style="font-size:16px;line-height:1.6;">${name}</p>
           <h2 style="font-size:18px;margin:16px 0;color:#1a1a2e;">${title}</h2>
           <p style="font-size:15px;line-height:1.7;color:#333;white-space:pre-wrap;">${body}</p>
           ${cta(linkUrl, linkLabel)}`,
          title
        ),
      };
    }

    case "support_message": {
      const subject = esc(t.data?.subject || "A message from Sociax Support");
      const body = esc(t.data?.body || "");
      return {
        sender: "support",
        subject,
        html: layout(
          `<p style="font-size:16px;line-height:1.6;">${name}</p>
           <p style="font-size:15px;line-height:1.7;color:#333;white-space:pre-wrap;">${body}</p>
           <p style="color:#999;font-size:13px;line-height:1.5;margin:24px 0 0;">If you have further questions, reply to this email or open a ticket inside Sociax.</p>`,
          subject
        ),
      };
    }

    default:
      throw new Error(`Unknown template: ${t.name}`);
  }
}

// ---------- HTTP handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Auth: caller must be authenticated ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "founder");

    // ---- Parse + validate body ----
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, template, data, sender_override } = body as {
      to?: string;
      template?: TemplateName;
      data?: Record<string, any>;
      sender_override?: SenderType;
    };

    if (!to || typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(JSON.stringify({ error: "Valid `to` email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!template) {
      return new Response(JSON.stringify({ error: "`template` required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Non-admins can only send to themselves (prevents abuse / spam)
    if (!isAdmin && to.toLowerCase() !== (user.email || "").toLowerCase()) {
      return new Response(JSON.stringify({ error: "You can only send emails to your own address" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Render template ----
    const rendered = renderTemplate({ name: template, data: data || {} });
    const senderType: SenderType = sender_override || rendered.sender;
    const from = SENDERS[senderType];
    if (!from) {
      return new Response(JSON.stringify({ error: "Invalid sender type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Send via Resend ----
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: rendered.subject,
        html: rendered.html,
        // Strong deliverability defaults
        headers: {
          "List-Unsubscribe": `<mailto:support@sociax.tech?subject=unsubscribe>, <${SITE_URL}/unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[send-app-email] Resend error:", res.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await res.json();
    console.log(`[send-app-email] Sent ${template} from ${senderType} to ${to} (id: ${result.id})`);

    return new Response(
      JSON.stringify({ success: true, id: result.id, sender: senderType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-app-email] Error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
