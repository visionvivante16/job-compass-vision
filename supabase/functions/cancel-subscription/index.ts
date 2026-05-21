import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const respond = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isValidStripeKey = (key: string) => /^(sk|rk)_(live|test)_/.test(key.trim());

// In Stripe API 2025-08-27.basil, current_period_end moved from the subscription
// to the subscription item. Read from item first, fall back to top-level for safety.
const getPeriodEndISO = (sub: any): string | null => {
  const candidates: Array<unknown> = [
    sub?.items?.data?.[0]?.current_period_end,
    sub?.current_period_end,
    sub?.cancel_at,
    sub?.trial_end,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      const d = new Date(value * 1000);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey || !isValidStripeKey(stripeKey)) {
    logStep("CONFIG_ERROR", {
      hasKey: !!stripeKey,
      prefix: stripeKey?.slice(0, 7) ?? null,
      length: stripeKey?.length ?? 0,
    });
    return respond({
      ok: false,
      error: "Billing service is temporarily unavailable.",
      fallback: true,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond({ ok: false, error: "Not authenticated" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      logStep("Auth failed", { message: authErr?.message });
      return respond({ ok: false, error: "Auth unavailable" });
    }

    const user = userData.user;
    if (!user?.email) {
      return respond({ ok: false, error: "User email unavailable" });
    }
    logStep("User authenticated", { userId: user.id });

    const { action } = await req.json().catch(() => ({ action: "cancel" }));
    const stripe = new Stripe(stripeKey.trim(), { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : null;
    logStep("Customer lookup by email", { email: user.email, found: !!customerId });

    if (!customerId) {
      const { data: subRecord } = await supabase
        .from("user_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subRecord?.stripe_customer_id) {
        logStep("Found stored stripe_customer_id", { storedCustomerId: subRecord.stripe_customer_id });
        try {
          const storedCustomer = await stripe.customers.retrieve(subRecord.stripe_customer_id);
          if (storedCustomer && !("deleted" in storedCustomer && storedCustomer.deleted)) {
            customerId = storedCustomer.id;
            logStep("Verified stored customer exists in Stripe", { customerId });
          }
        } catch (e) {
          logStep("Stored customer not found in Stripe", {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    if (!customerId) {
      return respond({ ok: false, error: "No subscription found" });
    }

    logStep("Using customer", { customerId, action });

    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    logStep("Active subscriptions", { count: activeSubscriptions.data.length });

    if (activeSubscriptions.data.length === 0) {
      const allSubscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 5 });
      const resumableSubscription = allSubscriptions.data.find((sub) => sub.cancel_at_period_end);

      if (action === "resume" && resumableSubscription) {
        try {
          const updated = await stripe.subscriptions.update(resumableSubscription.id, {
            cancel_at_period_end: false,
          });
          logStep("Subscription resumed", { subscriptionId: resumableSubscription.id });
          return respond({
            ok: true,
            action: "resumed",
            subscription_end: getPeriodEndISO(updated),
          });
        } catch (stripeErr) {
          const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
          logStep("Stripe resume failed", { message });
          return respond({ ok: false, error: "Unable to resume subscription right now." });
        }
      }

      return respond({ ok: false, error: "No active subscription" });
    }

    const subscription = activeSubscriptions.data[0];

    if (action === "cancel") {
      logStep("Attempting cancel", { subscriptionId: subscription.id });
      try {
        const updated = await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: true,
        });
        logStep("Subscription set to cancel at period end", { subscriptionId: subscription.id });

        return respond({
          ok: true,
          action: "cancelled",
          subscription_end: getPeriodEndISO(updated),
        });
      } catch (stripeErr) {
        const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        logStep("Stripe update failed", { message });

        const isPermissionError =
          message.includes("permission") ||
          message.includes("not allowed") ||
          message.includes("Invalid API Key provided") ||
          message.includes("api key");

        return respond({
          ok: false,
          error: isPermissionError
            ? "Billing service is temporarily unavailable."
            : "Unable to cancel subscription right now.",
          fallback: isPermissionError,
        });
      }
    }

    if (action === "resume") {
      if (!subscription.cancel_at_period_end) {
        return respond({ ok: false, error: "Subscription is not pending cancellation" });
      }

      try {
        const updated = await stripe.subscriptions.update(subscription.id, {
          cancel_at_period_end: false,
        });
        logStep("Subscription resumed", { subscriptionId: subscription.id });
        return respond({
          ok: true,
          action: "resumed",
          subscription_end: getPeriodEndISO(updated),
        });
      } catch (stripeErr) {
        const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        logStep("Stripe resume failed", { message });
        return respond({ ok: false, error: "Unable to resume subscription right now." });
      }
    }

    return respond({ ok: false, error: "Invalid action" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message });
    return respond({
      ok: false,
      error: "Unable to manage subscription right now.",
      fallback: true,
    });
  }
});
