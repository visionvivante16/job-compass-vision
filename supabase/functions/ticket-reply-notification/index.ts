import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller (must be admin/founder)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin/founder
    const { data: roleData } = await supabaseClient.rpc("is_admin");
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ticket_id, reply_text, user_email, user_name, ticket_subject } =
      await req.json();

    if (!ticket_id || !reply_text || !user_email || !ticket_subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const siteUrl =
      Deno.env.get("SITE_URL") || "https://jobpulse99.lovable.app";

    const subjectLabel =
      {
        account_issue: "Account issue",
        payment_issue: "Payment issue",
        job_application_issue: "Job application issue",
        report_employer: "Report employer",
        other: "Other",
      }[ticket_subject] || ticket_subject;

    const greeting = user_name ? `Hi ${user_name},` : "Hi there,";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr>
      <td>
        <h1 style="color:#1a1a2e;font-size:22px;margin:0 0 24px 0;">Sociax Support</h1>

        <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
          ${greeting}
        </p>

        <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
          Your raised ticket has received a reply from the Sociax team.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f8;border-radius:8px;padding:20px;margin:0 0 24px 0;">
          <tr>
            <td style="padding:16px;">
              <p style="color:#666;font-size:13px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.5px;">Ticket Subject</p>
              <p style="color:#1a1a2e;font-size:15px;font-weight:600;margin:0 0 16px 0;">${subjectLabel}</p>

              <p style="color:#666;font-size:13px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.5px;">Reply from Sociax</p>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0;white-space:pre-wrap;">${reply_text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
          <tr>
            <td style="background-color:#1a1a2e;border-radius:6px;">
              <a href="${siteUrl}/help" target="_blank" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                View Ticket in Sociax
              </a>
            </td>
          </tr>
        </table>

        <p style="color:#999;font-size:13px;line-height:1.5;margin:0;">
          If you have further questions, simply reply to your ticket inside Sociax or submit a new request.
        </p>

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

        <p style="color:#bbb;font-size:12px;margin:0;">
          &copy; ${new Date().getFullYear()} Sociax. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sociax Support <noreply@sociax.tech>",
        to: [user_email],
        subject: "Your Sociax support ticket has been replied to",
        html: htmlBody,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Email send error:", emailResponse.status, errText);
      throw new Error(`Failed to send email notification`);
    }

    console.log(
      `[TICKET-REPLY] Email notification sent to ${user_email} for ticket ${ticket_id}`
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[TICKET-REPLY] Error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
