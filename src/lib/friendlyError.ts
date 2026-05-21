/**
 * Convert raw errors (edge function failures, network errors, Supabase errors,
 * stack traces) into short, user-friendly messages safe to show in toasts.
 *
 * Never expose: stack traces, internal IDs, request paths, JSON blobs,
 * or anything containing words like "FunctionsHttpError", "fetch", "TypeError".
 */

const FRIENDLY_FALLBACK = "Something went wrong. Please try again in a moment.";

const PATTERNS: Array<{ match: RegExp; message: string }> = [
  { match: /network|failed to fetch|load failed|networkerror/i,
    message: "Network issue — please check your connection and try again." },
  { match: /timeout|timed out|aborted/i,
    message: "The request took too long. Please try again." },
  { match: /rate limit|too many requests|429/i,
    message: "You're going a bit fast — please wait a moment and retry." },
  { match: /unauthor|401|jwt|invalid token|not authenticated/i,
    message: "Your session expired. Please sign in again." },
  { match: /forbidden|403|not allowed|permission/i,
    message: "You don't have access to do that." },
  { match: /not found|404/i,
    message: "We couldn't find what you were looking for." },
  { match: /payload too large|413/i,
    message: "That file is too large. Please try a smaller one." },
  { match: /quota|insufficient|payment required|402/i,
    message: "AI service is temporarily unavailable. Please try again shortly." },
  { match: /functionshttperror|edge function|non-2xx|500|502|503|504/i,
    message: "Our service is temporarily unavailable. Please try again in a moment." },
  { match: /duplicate|unique constraint/i,
    message: "That already exists." },
];

// Patterns that indicate a raw/technical error — never expose these strings
const TECHNICAL_LEAKS = /(stack|TypeError|SyntaxError|ReferenceError|undefined is not|cannot read|fetch|http|JSON|parse|supabase|postgres|edge|function|\{|\}|<|>|\/\/|https?:|null\)|at\s+\w+\.)/i;

/**
 * Returns a user-safe message. Never returns stack traces, URLs, or technical jargon.
 */
export function friendlyError(err: unknown, fallback = FRIENDLY_FALLBACK): string {
  if (!err) return fallback;
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!raw) return fallback;

  // First try known patterns
  for (const p of PATTERNS) {
    if (p.match.test(raw)) return p.message;
  }

  // Reject anything that smells technical
  if (TECHNICAL_LEAKS.test(raw) || raw.length > 140) return fallback;

  // Short, human-readable messages can pass through
  return raw;
}
