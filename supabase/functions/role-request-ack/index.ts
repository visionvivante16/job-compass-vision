import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");

  if (!lovableApiKey || !resendApiKey) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { requestId, recipientEmail, recipientName, requestedRole, location, customMessage, isPremium } = await req.json();

    if (!requestId || !recipientEmail || !requestedRole) {
      return new Response(JSON.stringify({ error: "requestId, recipientEmail, and requestedRole are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";

    const customBlock = customMessage
      ? `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;padding:12px 16px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:6px;">${customMessage}</p>`
      : '';

    const upgradeBlock = !isPremium
      ? `<div style="text-align:center;margin:0 0 20px;padding:16px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;">
          <p style="font-size:16px;font-weight:700;color:#ffffff;margin:0 0 6px;">⚡ Upgrade to Premium for more results like this!</p>
          <p style="font-size:13px;color:#e0e7ff;margin:0 0 12px;">Slots are filling up fast — don't miss out.</p>
          <a href="https://buy.stripe.com/6oUeVdcFDdLW5eb7q93AY01" style="display:inline-block;padding:10px 28px;background:#ffffff;color:#6366f1;font-size:14px;font-weight:700;border-radius:6px;text-decoration:none;">Upgrade Now →</a>
        </div>`
      : '';

    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:32px 24px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;">Your requested roles are now live! 🚀</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">Your requested role <strong>"${requestedRole}"</strong> has been successfully added to Sociax.</p>
    ${customBlock}
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">You can now log in to your dashboard and start applying to relevant jobs immediately.</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">We've made sure matching opportunities are available for you.</p>
    ${upgradeBlock}
    <div style="text-align:center;margin:0 0 24px;">
      <a href="https://sociax.tech" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">Start Exploring Now</a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="font-size:13px;color:#9ca3af;margin:0;">Best,<br/>Team Sociax</p>
  </div>
</body>
</html>`;

    const MAX_RETRIES = 5;
    let attempt = 0;
    let backoffMs = 1200;
    let res: Response | null = null;
    let resBody: any = null;

    while (attempt < MAX_RETRIES) {
      res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": resendApiKey,
        },
        body: JSON.stringify({
          from: "Sociax <noreply@sociax.tech>",
          to: [recipientEmail.toLowerCase()],
          subject: `Your requested roles are now live on Sociax 🚀`,
          html: htmlContent,
        }),
      });

      resBody = await res.json().catch(() => ({}));

      // Retry on 429 (rate limit) or transient 5xx
      const isRateLimit = res.status === 429 || resBody?.statusCode === 429 || resBody?.name === "rate_limit_exceeded";
      const isTransient = res.status >= 500 && res.status < 600;

      if (res.ok) break;

      if ((isRateLimit || isTransient) && attempt < MAX_RETRIES - 1) {
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
        const jitter = Math.floor(Math.random() * 400);
        const waitMs = Math.max(retryAfterMs, backoffMs) + jitter;
        console.warn(`[ROLE-REQUEST-ACK] ${isRateLimit ? "Rate limited" : "Transient error"}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise((r) => setTimeout(r, waitMs));
        backoffMs *= 2;
        attempt++;
        continue;
      }

      // Non-retryable or out of retries
      console.error("[ROLE-REQUEST-ACK] Resend failed:", resBody);
      return new Response(JSON.stringify({ error: "Email send failed", details: resBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!res || !res.ok) {
      console.error("[ROLE-REQUEST-ACK] Max retries exceeded:", resBody);
      return new Response(JSON.stringify({ error: "Email send failed after retries", details: resBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: resBody.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ROLE-REQUEST-ACK] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
