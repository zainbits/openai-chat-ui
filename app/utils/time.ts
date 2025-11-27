/**
 * Time and date utilities for the chat app
 * @module time
 */

/** Date bucket categories for grouping threads */
export type DateBucket = "Today" | "Yesterday" | "This Week" | "Older";

/**
 * Converts a timestamp to a human-readable relative time string
 *
 * @param ts - Unix timestamp in milliseconds
 * @returns Relative time string (e.g., "5m ago", "2h ago", "Yesterday")
 *
 * @example
 * ```ts
 * toRelativeTime(Date.now() - 60000) // "1m ago"
 * toRelativeTime(Date.now() - 3600000) // "1h ago"
 * ```
 */
export function toRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);

  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;

  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;

  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;

  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

/**
 * Groups a timestamp into a date bucket for organizing threads
 *
 * @param ts - Unix timestamp in milliseconds
 * @returns Date bucket category
 *
 * @example
 * ```ts
 * groupByDateBucket(Date.now()) // "Today"
 * groupByDateBucket(Date.now() - 86400000) // "Yesterday"
 * ```
 */
export function groupByDateBucket(ts: number): DateBucket {
  const now = new Date();
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  return "Older";
}
