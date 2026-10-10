// Shared constants. SQLite has no native enums, so these string unions are the
// single source of truth for allowed values. Zod validates them at the edges.

export const ROLES = ["MEMBER", "LIBRARIAN", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const BOOK_STATUS = [
  "AVAILABLE",
  "BORROWED",
  "RESERVED",
  "MAINTENANCE",
  "RETIRED",
] as const;
export type BookStatus = (typeof BOOK_STATUS)[number];

/**
 * Broad shelf categories. Deliberately coarser than `Genre`, so a title can sit
 * on one shelf (Fiction) while carrying several genres (Dystopian, Classics).
 */
export const CATEGORIES = [
  "Fiction",
  "Mystery & Thriller",
  "Science Fiction & Fantasy",
  "Children's",
  "Young Adult",
  "Biography & Memoir",
  "History & Politics",
  "Science & Technology",
  "Business & Economics",
  "Self-Help & Health",
  "Arts & Culture",
  "Reference",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const COPY_STATUS = [
  "AVAILABLE",
  "ON_LOAN",
  "RESERVED",
  "DAMAGED",
  "LOST",
] as const;
export type CopyStatus = (typeof COPY_STATUS)[number];

export const LOAN_STATUS = [
  "PENDING",
  "APPROVED",
  "ACTIVE",
  "RETURNED",
  "REJECTED",
  "CANCELLED",
] as const;
export type LoanStatus = (typeof LOAN_STATUS)[number];

export const LOAN_TYPE = ["BORROW", "RENTAL"] as const;
export type LoanType = (typeof LOAN_TYPE)[number];

export const FINE_REASON = ["OVERDUE", "DAMAGED", "LOST", "RENTAL"] as const;
export type FineReason = (typeof FINE_REASON)[number];

export const FINE_STATUS = ["UNPAID", "PAID", "WAIVED"] as const;
export type FineStatus = (typeof FINE_STATUS)[number];

/** Human labels for every status used in the UI. */
export const LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  BORROWED: "Borrowed",
  RESERVED: "Reserved",
  MAINTENANCE: "Under maintenance",
  RETIRED: "Retired",
  ON_LOAN: "On loan",
  DAMAGED: "Damaged",
  LOST: "Lost",
  PENDING: "Pending",
  APPROVED: "Approved",
  ACTIVE: "Active",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  BORROW: "Borrow",
  RENTAL: "Rental",
  OVERDUE: "Overdue",
  PAID: "Paid",
  WAIVED: "Waived",
  UNPAID: "Unpaid",
  MEMBER: "Member",
  LIBRARIAN: "Librarian",
  ADMIN: "Administrator",
};

/** Tailwind class per status, so badges stay consistent everywhere. */
export const STATUS_TONE: Record<string, string> = {
  // good
  AVAILABLE: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  ACTIVE: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  RETURNED: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  PAID: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  // pending
  PENDING: "bg-amber-100 text-amber-800 ring-amber-600/20",
  APPROVED: "bg-sky-100 text-sky-800 ring-sky-600/20",
  RESERVED: "bg-violet-100 text-violet-800 ring-violet-600/20",
  RENTAL: "bg-violet-100 text-violet-800 ring-violet-600/20",
  // attention
  BORROWED: "bg-amber-100 text-amber-800 ring-amber-600/20",
  ON_LOAN: "bg-amber-100 text-amber-800 ring-amber-600/20",
  OVERDUE: "bg-red-100 text-red-800 ring-red-600/20",
  UNPAID: "bg-red-100 text-red-800 ring-red-600/20",
  DAMAGED: "bg-red-100 text-red-800 ring-red-600/20",
  LOST: "bg-red-100 text-red-800 ring-red-600/20",
  REJECTED: "bg-red-100 text-red-800 ring-red-600/20",
  MAINTENANCE: "bg-orange-100 text-orange-800 ring-orange-600/20",
  // neutral
  CANCELLED: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  RETIRED: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  WAIVED: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  BORROW: "bg-sky-100 text-sky-800 ring-sky-600/20",
  MEMBER: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  LIBRARIAN: "bg-sky-100 text-sky-800 ring-sky-600/20",
  ADMIN: "bg-violet-100 text-violet-800 ring-violet-600/20",
};

/** Rules read from .env with sensible fallbacks. */
export const RULES = {
  loanPeriodWeeks: Number(process.env.LOAN_PERIOD_WEEKS ?? 2),
  maxActiveLoans: Number(process.env.MAX_ACTIVE_LOANS ?? 5),
  maxRenewals: Number(process.env.MAX_RENEWALS ?? 2),
  defaultFinePerDayCents: Number(process.env.OVERDUE_FINE_PER_DAY_CENTS ?? 50),
  minPeriodWeeks: 1,
  maxPeriodWeeks: 8,
} as const;

export const MEMBERSHIP_FEE_CENTS = 0;
