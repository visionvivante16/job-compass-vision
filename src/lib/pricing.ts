/**
 * Pricing logic: legacy users (created before the pricing change) see $5.99,
 * new users see $9.99.
 */

// Cutoff: accounts created before this date are "legacy" ($5.99)
const PRICING_CUTOFF = new Date("2026-04-09T00:00:00Z");

export const PRICE_LEGACY = "$5.99";
export const PRICE_NEW = "$9.99";

// Stripe payment links
export const STRIPE_LINK_LEGACY = "https://buy.stripe.com/eVqaEX9treQ0eOL4dX3AY00";
export const STRIPE_LINK_NEW = "https://buy.stripe.com/6oUeVdcFDdLW5eb7q93AY01";

export function isLegacyUser(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false;
  return new Date(createdAt) < PRICING_CUTOFF;
}

export function getUserPrice(createdAt: string | Date | null | undefined): string {
  return isLegacyUser(createdAt) ? PRICE_LEGACY : PRICE_NEW;
}

export function getUserStripeLink(createdAt: string | Date | null | undefined): string {
  return isLegacyUser(createdAt) ? STRIPE_LINK_LEGACY : STRIPE_LINK_NEW;
}

/**
 * Build a full Stripe checkout URL with user identification params.
 * This ensures the webhook can always link the payment to the correct user,
 * even if the customer enters a different email at checkout.
 */
export function buildCheckoutUrl(opts: {
  createdAt?: string | Date | null;
  email?: string | null;
  userId?: string | null;
  successUrl?: string;
}): string {
  const base = getUserStripeLink(opts.createdAt);
  const params = new URLSearchParams();
  if (opts.successUrl) params.set("success_url", opts.successUrl);
  if (opts.email) params.set("prefilled_email", opts.email);
  if (opts.userId) params.set("client_reference_id", opts.userId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
