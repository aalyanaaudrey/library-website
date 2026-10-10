import { z } from "zod";
import { CATEGORIES, LOAN_TYPE, RULES } from "@/lib/constants";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().trim().email("Enter a valid email address").max(120),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email address").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const borrowRequestSchema = z.object({
  bookId: z.string().min(1),
  type: z.enum(LOAN_TYPE),
  periodWeeks: z.coerce
    .number()
    .int("Choose a whole number of weeks")
    .min(RULES.minPeriodWeeks, `Minimum ${RULES.minPeriodWeeks} week`)
    .max(RULES.maxPeriodWeeks, `Maximum ${RULES.maxPeriodWeeks} weeks`),
});

export const renewalSchema = z.object({
  loanId: z.string().min(1),
});

export const reviewSchema = z.object({
  bookId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const authorSchema = z.object({
  name: z.string().trim().min(1, "Author name is required").max(120),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const genreSchema = z.object({
  name: z.string().trim().min(1, "Genre name is required").max(60),
});

const coverUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .optional()
  .or(z.literal(""));

/**
 * Blank optional number inputs arrive as the empty string. `z.coerce.number()`
 * turns that into 0, which then invents data (year 0) or trips a min bound and
 * reports a confusing error. Blank means "unset", so normalise before coercing.
 */
const optionalInt = (opts: { min: number; max: number; minMessage?: string; maxMessage?: string }) => {
  let n = z.coerce.number().int();
  n = opts.minMessage ? n.min(opts.min, opts.minMessage) : n.min(opts.min);
  n = opts.maxMessage ? n.max(opts.max, opts.maxMessage) : n.max(opts.max);
  return z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), n.optional());
};

export const bookSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(240),
  isbn: z
    .string()
    .trim()
    .regex(/^[0-9\-Xx]{10,17}$/, "Enter a valid ISBN (10 or 13 digits)")
    .optional()
    .or(z.literal("")),
  publisher: z.string().trim().max(160).optional().or(z.literal("")),
  year: optionalInt({
    min: 1000,
    max: new Date().getFullYear() + 1,
    minMessage: "Enter a valid year",
    maxMessage: "Year cannot be in the future",
  }),
  edition: z.string().trim().max(40).optional().or(z.literal("")),
  pages: optionalInt({ min: 1, max: 20000, minMessage: "Enter a page count" }),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  coverUrl,
  // Broad shelf category; defaults to Fiction so older callers stay valid.
  category: z.enum(CATEGORIES).default("Fiction"),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "RETIRED"]),
  borrowFeeCents: z.coerce.number().int().min(0).max(100000),
  rentalFeeCents: optionalInt({ min: 0, max: 1000000 }),
  overdueFinePerDayCents: z.coerce.number().int().min(0).max(100000),
  copies: z.coerce.number().int().min(1).max(50),
  authorIds: z.array(z.string()).min(1, "Pick at least one author"),
  genreIds: z.array(z.string()).min(1, "Pick at least one genre"),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  body: z.string().trim().min(1, "Body is required").max(20000),
  pinned: z.coerce.boolean().optional(),
  published: z.coerce.boolean().optional(),
});

export const memberUpdateSchema = z.object({
  role: z.enum(["MEMBER", "LIBRARIAN", "ADMIN"]),
  isActive: z.coerce.boolean(),
});

export const fineActionSchema = z.object({
  fineId: z.string().min(1),
  action: z.enum(["PAID", "WAIVED"]),
});

/** Flatten a ZodError into { field: message } for form display. */
export function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
