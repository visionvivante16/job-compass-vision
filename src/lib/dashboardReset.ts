export const DASHBOARD_RESET_EVENT = "sociax:dashboard-reset";

const DASHBOARD_RESET_TOKEN_KEY = "sociax:dashboard-reset-token";

export function triggerDashboardReset() {
  if (typeof window === "undefined") return;

  const token = String(Date.now());
  sessionStorage.removeItem("pending_search");
  sessionStorage.setItem(DASHBOARD_RESET_TOKEN_KEY, token);
  window.dispatchEvent(new CustomEvent(DASHBOARD_RESET_EVENT, { detail: { token } }));
}

export function consumeDashboardResetToken() {
  if (typeof window === "undefined") return null;

  const token = sessionStorage.getItem(DASHBOARD_RESET_TOKEN_KEY);
  if (token) {
    sessionStorage.removeItem(DASHBOARD_RESET_TOKEN_KEY);
  }

  return token;
}