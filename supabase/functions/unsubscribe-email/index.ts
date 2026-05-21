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
    const url = new URL(req.url);
    const userId = url.searchParams.get("uid");

    if (!userId) {
      return new Response(
        `<!DOCTYPE html><html><body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;">
        <div style="text-align:center;padding:32px;"><h1>❌ Invalid Link</h1><p>This unsubscribe link is invalid.</p></div></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if preferences exist
    const { data: existing } = await supabase
      .from("email_notification_preferences")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("email_notification_preferences")
        .update({
          daily_digest_enabled: false,
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("email_notification_preferences")
        .insert({
          user_id: userId,
          daily_digest_enabled: false,
          unsubscribed_at: new Date().toISOString(),
        });
    }

    return new Response(
      `<!DOCTYPE html><html><body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;">
      <div style="text-align:center;padding:32px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:400px;">
        <h1 style="color:#0f172a;">✅ Unsubscribed</h1>
        <p style="color:#64748b;">You've been unsubscribed from Sociax daily job digest emails.</p>
        <p style="color:#94a3b8;font-size:14px;">You can re-enable notifications anytime from your profile settings.</p>
      </div></body></html>`,
      { headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  } catch (err: any) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;">
      <div style="text-align:center;padding:32px;"><h1>❌ Error</h1><p>${err.message}</p></div></body></html>`,
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }
});
