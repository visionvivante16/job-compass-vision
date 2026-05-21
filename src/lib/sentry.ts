import * as Sentry from "@sentry/react";

// Sentry DSN is a publishable identifier (safe to ship in client bundles).
// Falls back to env var so other environments can override.
const DSN =
  (import.meta.env.VITE_SENTRY_DSN as string | undefined) ||
  "https://a71f58bcc5303a36f20ee20b3c987ab1@o4511295304040448.ingest.us.sentry.io/4511295306399744";

export function initSentry() {
  if (!DSN) {
    // No DSN configured – skip Sentry init (e.g. local dev without secret)
    if (import.meta.env.DEV) {
      console.info("[Sentry] VITE_SENTRY_DSN not set – Sentry disabled");
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // Performance tracing – low sample so we stay within free tier
    tracesSampleRate: 0.1,
    // Session Replay – only on errors (no idle recording)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: true,
      }),
    ],
    // Filter out noisy / harmless errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      /signal is aborted/i,
      /AbortError/i,
      /NetworkError when attempting to fetch resource/i,
    ],
    beforeSend(event, hint) {
      // Drop dev noise
      if (import.meta.env.DEV) return null;
      const msg = hint?.originalException instanceof Error
        ? hint.originalException.message
        : event.message ?? "";
      if (/signal is aborted/i.test(msg)) return null;
      return event;
    },
  });
}

export function setSentryUser(user: { id: string; email?: string | null } | null) {
  if (!DSN) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email ?? undefined });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
