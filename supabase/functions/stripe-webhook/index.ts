import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_BASE_LINK = "https://buy.stripe.com/eVqaEX9treQ0eOL4dX3AY00";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeSecretKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    logStep("Event received", { eventType: event.type, eventId: event.id });

    // ── Idempotency: skip already-processed events ──
    const { data: existingEvent } = await supabase
      .from("processed_stripe_events")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record event as processed
    await supabase.from("processed_stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
    });

    // ══════════════════════════════════════════════
    // checkout.session.completed — SUCCESS
    // ══════════════════════════════════════════════
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || null;
      const stripeCustomerId = (session as any).customer as string | null;
      const clientReferenceId = session.client_reference_id || null;

      if (!customerEmail) {
        logStep("ERROR: No email in checkout session");
        return new Response(JSON.stringify({ error: "No email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const emailLower = customerEmail.toLowerCase();
      logStep("Processing checkout success", { email: emailLower, customerName, stripeCustomerId, clientReferenceId });

      let matchedUserId: string | null = null;
      let matchMethod = "";

      // ── STRATEGY 0: client_reference_id (most reliable — set at checkout) ──
      if (clientReferenceId) {
        const { data: refMatch } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", clientReferenceId)
          .maybeSingle();

        if (refMatch?.user_id) {
          matchedUserId = refMatch.user_id;
          matchMethod = "client_reference_id";
          logStep("Matched via client_reference_id", { userId: matchedUserId });
        } else {
          logStep("client_reference_id provided but no matching profile found", { clientReferenceId });
        }
      }

      // ── STRATEGY 1: Direct email match ──
      if (!matchedUserId) {
        const { data: emailMatch } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", emailLower)
          .maybeSingle();

        if (emailMatch?.user_id) {
          matchedUserId = emailMatch.user_id;
          matchMethod = "email";
        }
      }

      // ── STRATEGY 2: Match by stored stripe_customer_id ──
      if (!matchedUserId && stripeCustomerId) {
        logStep("Email match failed, trying stripe_customer_id fallback", { stripeCustomerId });
        const { data: subMatch } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();

        if (subMatch?.user_id) {
          matchedUserId = subMatch.user_id;
          matchMethod = "stripe_customer_id";
          logStep("Matched via stripe_customer_id", { userId: matchedUserId });
        }
      }

      // ── STRATEGY 3: Match by customer name against profiles ──
      if (!matchedUserId && customerName && customerName.trim().length > 2) {
        logStep("Trying name-based fallback", { customerName });
        const nameParts = customerName.trim().split(/\s+/);

        if (nameParts.length >= 2) {
          const firstName = nameParts[0].toLowerCase();
          const lastName = nameParts[nameParts.length - 1].toLowerCase();

          // Try exact first+last name match (must be unique to avoid wrong matches)
          const { data: nameMatches } = await supabase
            .from("profiles")
            .select("user_id, email")
            .ilike("first_name", firstName)
            .ilike("last_name", lastName);

          if (nameMatches && nameMatches.length === 1) {
            matchedUserId = nameMatches[0].user_id;
            matchMethod = "name";
            logStep("Matched via unique name", { userId: matchedUserId, profileEmail: nameMatches[0].email });
          } else if (nameMatches && nameMatches.length > 1) {
            logStep("Multiple name matches found, skipping name fallback to avoid wrong match", {
              count: nameMatches.length, customerName
            });
          }
        }

        // Also try full_name if first+last didn't work
        if (!matchedUserId) {
          const { data: fullNameMatches } = await supabase
            .from("profiles")
            .select("user_id, email")
            .ilike("full_name", customerName.trim());

          if (fullNameMatches && fullNameMatches.length === 1) {
            matchedUserId = fullNameMatches[0].user_id;
            matchMethod = "full_name";
            logStep("Matched via full_name", { userId: matchedUserId, profileEmail: fullNameMatches[0].email });
          }
        }
      }

      // ── NO MATCH: Log as orphan payment for admin review ──
      if (!matchedUserId) {
        logStep("ORPHAN PAYMENT: No matching user found", {
          email: emailLower, customerName, stripeCustomerId
        });

        // Log to error_logs for admin visibility
        await supabase.from("error_logs").insert({
          error_type: "orphan_payment",
          message: `Payment received but no matching Sociax account found. Email: ${emailLower}, Name: ${customerName || "N/A"}, Stripe Customer: ${stripeCustomerId || "N/A"}`,
          metadata: {
            payment_email: emailLower,
            customer_name: customerName,
            stripe_customer_id: stripeCustomerId,
            stripe_event_id: event.id,
            session_id: session.id,
            amount: session.amount_total,
            currency: session.currency,
          },
        });

        return new Response(JSON.stringify({ received: true, warning: "orphan_payment" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Activate premium for matched user ──
      logStep("Activating premium", { userId: matchedUserId, matchMethod, paymentEmail: emailLower });

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ is_premium: true })
        .eq("user_id", matchedUserId);

      if (updateErr) {
        logStep("ERROR: Profile update failed", { error: updateErr.message });
        return new Response(JSON.stringify({ error: "Profile update failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Premium upgrade successful", { userId: matchedUserId, matchMethod });

      const nextRenewal = new Date();
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);

      await supabase.from("user_subscriptions").upsert(
        {
          user_id: matchedUserId,
          is_subscribed: true,
          stripe_customer_id: stripeCustomerId || null,
          next_renewal_date: nextRenewal.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      // ── Mark any prior failed_payments for this email as resolved ──
      await supabase
        .from("failed_payments")
        .update({ email_sent: true, failure_reason: "RESOLVED — payment completed successfully" })
        .eq("email", emailLower)
        .eq("email_sent", false);

      // ── Mark any checkout recovery emails as completed ──
      await supabase
        .from("checkout_recovery_emails")
        .update({ payment_completed: true, completed_at: new Date().toISOString() })
        .eq("email", emailLower)
        .eq("payment_completed", false);

      // If matched via non-email method, also log for admin awareness
      if (matchMethod !== "email") {
        logStep("EMAIL MISMATCH RESOLVED", { matchMethod, paymentEmail: emailLower, userId: matchedUserId });
        await supabase.from("error_logs").insert({
          error_type: "payment_email_mismatch",
          message: `Payment email "${emailLower}" didn't match account. Resolved via ${matchMethod}. User activated successfully.`,
          user_id: matchedUserId,
          metadata: {
            payment_email: emailLower,
            match_method: matchMethod,
            stripe_customer_id: stripeCustomerId,
            stripe_event_id: event.id,
          },
        });
      }

      logStep("Cleared pending failure/recovery records for user", { email: emailLower });
    }

    // ══════════════════════════════════════════════
    // FAILURE EVENTS
    // ══════════════════════════════════════════════
    if (
      event.type === "checkout.session.expired" ||
      event.type === "invoice.payment_failed" ||
      event.type === "charge.failed"
    ) {
      let customerEmail: string | null = null;
      let customerName: string | null = null;
      let amount: number | null = null;
      let currency = "USD";
      let failureReason = "Payment failed";
      let retryLink = "";

      if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        customerEmail = session.customer_details?.email || session.customer_email;
        customerName = session.customer_details?.name || null;
        amount = session.amount_total;
        currency = (session.currency || "usd").toUpperCase();
        failureReason = "Checkout session expired — user did not complete payment";
      } else if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as any;
        customerEmail = invoice.customer_email;
        customerName = invoice.customer_name;
        amount = invoice.amount_due;
        currency = (invoice.currency || "usd").toUpperCase();
        failureReason = invoice.last_finalization_error?.message || "Payment method declined";
        retryLink = invoice.hosted_invoice_url || "";
      } else if (event.type === "charge.failed") {
        const charge = event.data.object as any;
        customerEmail = charge.billing_details?.email || charge.receipt_email;
        customerName = charge.billing_details?.name || null;
        amount = charge.amount ? charge.amount / 100 : null;
        currency = (charge.currency || "usd").toUpperCase();
        failureReason = charge.failure_message || charge.outcome?.seller_message || "Charge failed";
      }

      if (customerEmail) {
        const emailLower = customerEmail.toLowerCase();
        if (!retryLink) {
          retryLink = `${STRIPE_BASE_LINK}?prefilled_email=${encodeURIComponent(emailLower)}`;
        }

        // ── Check if user is already premium (payment succeeded in the meantime) ──
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("email", emailLower)
          .maybeSingle();

        if (profile?.is_premium) {
          logStep("User is already premium, skipping failure email", { email: emailLower });
          await supabase.from("failed_payments").insert({
            email: emailLower,
            customer_name: customerName,
            stripe_event_id: event.id,
            event_type: event.type.replace(".", "_"),
            amount, currency, failure_reason: failureReason,
            retry_link: retryLink,
            email_sent: true,
          });
        } else {
          // ── Check for duplicate: same email + same event_type within last 30 min ──
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: recentFailures } = await supabase
            .from("failed_payments")
            .select("id")
            .eq("email", emailLower)
            .eq("event_type", event.type.replace(".", "_"))
            .gte("created_at", thirtyMinAgo)
            .limit(1);

          const isDuplicate = recentFailures && recentFailures.length > 0;

          await supabase.from("failed_payments").insert({
            email: emailLower,
            customer_name: customerName,
            stripe_event_id: event.id,
            event_type: event.type.replace(".", "_"),
            amount, currency,
            failure_reason: failureReason,
            retry_link: retryLink,
            email_sent: isDuplicate,
          });

          if (!isDuplicate) {
            await sendFailureEmail(supabase, emailLower, customerName, retryLink, event.id);
            logStep("Failure email sent", { email: emailLower, eventType: event.type });
          } else {
            logStep("Duplicate failure within 30min, skipped email", { email: emailLower });
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("ERROR", { message: (err as Error).message });
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Send payment failure notification email via Resend */
async function sendFailureEmail(
  supabase: any,
  email: string,
  name: string | null,
  retryLink: string,
  eventId: string
) {
  try {
    const greeting = name ? `Hi ${name},` : "Hi,";

    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:32px 24px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 16px;">Complete your Sociax Premium upgrade</h1>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 12px;">${greeting}</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">Your recent payment attempt was not successful.</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">You can complete your upgrade using the button below:</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${retryLink}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">Try Payment Again</a>
    </div>
    <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 8px;">Once the payment is successful, your account will be upgraded to Premium immediately.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="font-size:13px;color:#9ca3af;margin:0;">— Team Sociax</p>
  </div>
</body>
</html>`;

    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (lovableApiKey && resendApiKey) {
      const res = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": resendApiKey,
        },
        body: JSON.stringify({
          from: "Sociax <noreply@sociax.tech>",
          to: [email],
          subject: "Complete your Sociax Premium upgrade",
          html: htmlContent,
        }),
      });

      if (res.ok) {
        logStep("Resend email sent successfully", { email });
      } else {
        const errBody = await res.text();
        logStep("Resend email failed", { status: res.status, body: errBody });
      }
    } else {
      logStep("Email keys not available, skipping send", { email });
    }

    await supabase
      .from("failed_payments")
      .update({ email_sent: true })
      .eq("stripe_event_id", eventId);

  } catch (err) {
    logStep("Email send error (non-fatal)", { message: (err as Error).message });
  }
}
