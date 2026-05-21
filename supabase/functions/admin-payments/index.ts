import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-PAYMENTS] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) throw new Error("Auth failed");

    const userId = userData.user.id;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = roles?.some(r => r.role === "founder" || r.role === "admin");
    if (!isAdmin) throw new Error("Admin access required");

    logStep("Admin verified", { userId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Paginate ALL charges so total revenue reflects lifetime totals (was capped at 100).
    // We hard-cap at 5000 to keep the function within edge runtime limits.
    const allCharges: Stripe.Charge[] = [];
    let startingAfter: string | undefined = undefined;
    const HARD_CAP = 5000;
    for (let pageIdx = 0; pageIdx < 50; pageIdx++) {
      const page: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      allCharges.push(...page.data);
      if (!page.has_more || allCharges.length >= HARD_CAP) break;
      startingAfter = page.data[page.data.length - 1]?.id;
      if (!startingAfter) break;
    }
    const charges = { data: allCharges };
    logStep("Fetched charges (paginated)", { count: charges.data.length });

    const [activeSubs, canceledSubs, pastDueSubs] = await Promise.all([
      stripe.subscriptions.list({ status: "active", limit: 100 }),
      stripe.subscriptions.list({ status: "canceled", limit: 100 }),
      stripe.subscriptions.list({ status: "past_due", limit: 100 }),
    ]);

    const allSubs = [...activeSubs.data, ...canceledSubs.data, ...pastDueSubs.data];

    const customerIds = new Set<string>();
    charges.data.forEach(c => { if (c.customer) customerIds.add(c.customer as string); });
    allSubs.forEach(s => { if (s.customer) customerIds.add(s.customer as string); });

    const customerMap: Record<string, { name: string | null; email: string | null }> = {};
    for (const cid of customerIds) {
      try {
        const cust = await stripe.customers.retrieve(cid);
        if (!('deleted' in cust) || !cust.deleted) {
          customerMap[cid] = { name: cust.name, email: cust.email };
        }
      } catch { /* skip deleted customers */ }
    }

    const payments = charges.data.map(charge => {
      const custInfo = customerMap[charge.customer as string] || {};
      return {
        id: charge.id,
        customer_name: custInfo.name || null,
        customer_email: custInfo.email || charge.billing_details?.email || null,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        status: charge.status,
        created: charge.created,
        description: charge.description || null,
      };
    });

    const subscriptions = allSubs.map(sub => {
      const custInfo = customerMap[sub.customer as string] || {};
      const item = sub.items?.data?.[0];
      return {
        id: sub.id,
        customer_name: custInfo.name || null,
        customer_email: custInfo.email || null,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        plan_amount: item?.price?.unit_amount ? item.price.unit_amount / 100 : 0,
        plan_interval: item?.price?.recurring?.interval || "month",
        plan_currency: (item?.price?.currency || "usd").toUpperCase(),
        created: sub.created,
      };
    });

    // Fetch failed payments from DB
    const { data: failedPayments } = await supabase
      .from("failed_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const totalRevenue = payments
      .filter(p => p.status === "succeeded")
      .reduce((sum, p) => sum + p.amount, 0);

    const paidUsers = new Set(
      payments.filter(p => p.status === "succeeded").map(p => p.customer_email).filter(Boolean)
    ).size;

    const response = {
      payments,
      subscriptions,
      failed_payments: failedPayments || [],
      stats: {
        total_revenue: totalRevenue,
        paid_users: paidUsers,
        active_subscriptions: activeSubs.data.length,
        canceled_subscriptions: canceledSubs.data.length,
        past_due_subscriptions: pastDueSubs.data.length,
        total_transactions: payments.length,
        failed_payments_count: failedPayments?.length || 0,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    logStep("ERROR", { message: (err as Error).message });
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
