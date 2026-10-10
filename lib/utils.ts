import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1250 -> "$12.50". Amounts are ALWAYS integer cents. */
export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Plain number of cents, for line items where "Free" would be wrong. */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "in 3 days" / "2 days ago" / "today". */
export function relativeTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });

  if (Math.abs(diff) < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (Math.abs(diff) < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
}

/** Positive integer => "3 days overdue". Zero/negative => "" (not overdue). */
export function daysOverdue(dueAt: Date | string | null | undefined): number {
  if (!dueAt) return 0;
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const diff = Date.now() - due.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / 86_400_000) || 1;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Add weeks to a date, returning a new Date. */
export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}

/** Truncate on a word boundary for card excerpts. */
export function excerpt(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`;
}

/** Map a percentage to a Tailwind width class safely. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Deterministic cover placeholder colour per book id. */
export function coverTone(seed: string): string {
  const palettes = [
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-sky-500 to-indigo-600",
    "from-rose-500 to-pink-600",
    "from-violet-500 to-purple-600",
    "from-lime-600 to-emerald-600",
    "from-cyan-500 to-blue-600",
    "from-fuchsia-500 to-rose-600",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

/**
 * Append a query parameter to a path that may already carry one.
 *
 * Server Actions cannot write to the page directly, so mutations redirect to a
 * URL carrying either a known success key (`ok=`) or a failure message (`err=`),
 * which `<Notice>` then renders. Lives here rather than in an action file
 * because `"use server"` modules may only export async functions.
 */
export function withNotice(path: string, key: string, value: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

/**
 * Accept only same-site paths, so a crafted `returnTo` form field cannot
 * bounce the user off-site after a mutation.
 */
export function safeReturnTo(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
