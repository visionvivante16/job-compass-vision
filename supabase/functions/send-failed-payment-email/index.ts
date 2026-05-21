import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRIPE_BASE_LINK = "https://buy.stripe.com/eVqaEX9treQ0eOL4dX3AY00";
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
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) throw new Error("Auth failed");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const isAdmin = roles?.some(r => r.role === "founder" || r.role === "admin");
    if (!isAdmin) throw new Error("Admin access required");

    const { email, failed_payment_id } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailLower = email.toLowerCase();

    // Check if user is already premium
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, first_name")
      .eq("email", emailLower)
      .maybeSingle();

    if (profile?.is_premium) {
      return new Response(JSON.stringify({ error: "User is already premium", skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const retryLink = `${STRIPE_BASE_LINK}?prefilled_email=${encodeURIComponent(emailLower)}`;
    const greeting = profile?.first_name ? `Hi ${profile.first_name},` : "Hi,";

    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:32px 24px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;">Your payment didn't go through</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">We noticed your recent payment for Sociax Premium didn't go through. This can happen due to insufficient funds, an expired card, or a temporary bank issue.</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">No worries — you can try again using the button below:</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${retryLink}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">Retry Payment</a>
    </div>
    <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 8px;">Once your payment is successful, Premium access will be activated instantly.</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 8px;">If you continue to experience issues, please reply to this email and we'll help you out.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="font-size:13px;color:#9ca3af;margin:0;">— Team Sociax</p>
  </div>
</body>
</html>`;

    // Send email via Resend
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: "Sociax <noreply@sociax.tech>",
        to: [emailLower],
        subject: "Your Sociax payment didn't go through — retry now",
        html: htmlContent,
      }),
    });

    const resBody = await res.json();

    if (!res.ok) {
      console.error("[FAILED-PAYMENT-EMAIL] Resend failed:", resBody);
      return new Response(JSON.stringify({ error: "Email send failed", details: resBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[FAILED-PAYMENT-EMAIL] Email sent successfully to", emailLower);

    return new Response(JSON.stringify({ success: true, email: emailLower }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[FAILED-PAYMENT-EMAIL] Error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
