import { supabase } from "@/integrations/supabase/client";
import { Sentry } from "@/lib/sentry";

interface ErrorLogPayload {
  error_type: string;
  message: string;
  stack?: string;
  page_url?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

// Debounce to avoid flooding identical errors
const recentErrors = new Map<string, number>();
const DEBOUNCE_MS = 5000;

function isDuplicate(key: string): boolean {
  const last = recentErrors.get(key);
  if (last && Date.now() - last < DEBOUNCE_MS) return true;
  recentErrors.set(key, Date.now());
  // Clean old entries
  if (recentErrors.size > 50) {
    const cutoff = Date.now() - DEBOUNCE_MS;
    for (const [k, v] of recentErrors) {
      if (v < cutoff) recentErrors.delete(k);
    }
  }
  return false;
}

export async function logError(payload: ErrorLogPayload) {
  try {
    // Filter out harmless React Query abort signals (normal during unmount/navigation)
    if (/signal is aborted/i.test(payload.message)) return;
    
    const dedupeKey = `${payload.error_type}:${payload.message}`;
    if (isDuplicate(dedupeKey)) return;

    // Mirror to Sentry (no-op if DSN not configured)
    try {
      Sentry.captureMessage(payload.message, {
        level: payload.error_type.includes("crash") ? "error" : "warning",
        tags: { error_type: payload.error_type },
        extra: {
          stack: payload.stack,
          page_url: payload.page_url,
          ...payload.metadata,
        },
      });
    } catch {
      // ignore Sentry errors
    }

    const { data: { user } } = await supabase.auth.getUser();

    await (supabase as any).from("error_logs").insert({
      user_id: user?.id ?? null,
      error_type: payload.error_type,
      message: payload.message.substring(0, 2000),
      stack: payload.stack?.substring(0, 5000) ?? null,
      page_url: payload.page_url ?? window.location.href,
      user_agent: payload.user_agent ?? navigator.userAgent,
      metadata: payload.metadata ?? {},
    });
  } catch {
    // Silently fail - don't cause more errors from error logging
  }
}

export function initGlobalErrorCapture() {
  // Capture uncaught errors
  window.addEventListener("error", (event) => {
    logError({
      error_type: "uncaught_error",
      message: event.message || "Unknown error",
      stack: event.error?.stack,
      page_url: window.location.href,
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : typeof event.reason === "string"
        ? event.reason
        : "Unhandled promise rejection";

    logError({
      error_type: "unhandled_rejection",
      message,
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
      page_url: window.location.href,
    });
  });

  // Capture fetch/network errors for edge functions
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const response = await originalFetch.apply(this, args);
      if (response.status >= 500) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? "";
        // Only log edge function errors
        if (url.includes("/functions/v1/")) {
          const fnName = url.split("/functions/v1/")[1]?.split("?")[0] ?? "unknown";
          logError({
            error_type: "edge_function_error",
            message: `Edge function "${fnName}" returned ${response.status}`,
            page_url: window.location.href,
            metadata: { function_name: fnName, status: response.status },
          });
        }
      }
      return response;
    } catch (err) {
      // Network errors
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url ?? "";
      if (url.includes("/functions/v1/") || url.includes("supabase")) {
        logError({
          error_type: "network_error",
          message: err instanceof Error ? err.message : "Network request failed",
          stack: err instanceof Error ? err.stack : undefined,
          page_url: window.location.href,
          metadata: { url: url.substring(0, 500) },
        });
      }
      throw err;
    }
  };
}
