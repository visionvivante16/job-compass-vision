import { format } from "date-fns";

/**
 * Job timestamp display rules:
 * - < 15 hours: relative ("5 mins ago", "4 hrs ago")
 * - 15h–24h: "Today"
 * - 24h–48h: "Yesterday"
 * - > 48h: formatted date (e.g. "May 3")
 */
export function formatJobTimestamp(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMs < 0) return "just now";
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 15) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return "Today";
  if (diffHr < 48) return "Yesterday";

  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear ? format(d, "MMM d") : format(d, "MMM d, yyyy");
}
