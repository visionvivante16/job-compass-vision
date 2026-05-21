import { toast } from "@/hooks/use-toast";

/**
 * Safely open an external apply link.
 * Strategy:
 *  1. Sanitize URL (trim + force https://)
 *  2. Try a synthetic <a target="_blank"> click — most reliable across browsers
 *  3. Fallback to window.open
 *  4. Final fallback: navigate the current tab so the user always lands on the page
 */
export function openApplyLink(rawUrl: string | null | undefined): void {
  if (!rawUrl) {
    toast({
      title: "Apply link unavailable",
      description: "This job's apply link is missing. Try another listing.",
      variant: "destructive",
    });
    return;
  }

  let url = rawUrl.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }

  // 1) Try anchor click — preserves the user gesture better than window.open
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  } catch {
    /* continue to window.open */
  }

  // 2) window.open fallback
  let win: Window | null = null;
  try {
    win = window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    win = null;
  }
  if (win) return;

  // 3) Same-tab navigation as last resort so the user actually reaches the page
  try {
    navigator.clipboard?.writeText(url);
  } catch {
    /* ignore */
  }
  toast({
    title: "Opening application page…",
    description: "Your browser blocked the new tab, so we're opening it here instead.",
  });
  window.location.href = url;
}
