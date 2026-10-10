import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * One-shot confirmation / error banners driven by query parameters.
 *
 * Server Actions cannot write to the page directly, so every mutation
 * redirects to a URL carrying either a known success key (`?ok=`) or a
 * user-facing message (`?err=`). Rendering from the URL means the message
 * survives a reload and never gets stranded on a stale filter tab.
 */
type Tone = "ok" | "warn" | "bad";

type Entry = {
  tone: Tone;
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

const NOTICES: Record<string, Entry> = {
  requested: {
    tone: "ok",
    title: "Request sent",
    body: "A librarian will review it. You will be notified as soon as it is approved.",
    href: "/account/borrowings?tab=pending",
    cta: "Track it",
  },
  cancelled: {
    tone: "warn",
    title: "Request cancelled",
    body: "Your request has been withdrawn and any hold on a copy released.",
  },
  renewed: {
    tone: "ok",
    title: "Loan renewed",
    body: "A new due date has been applied. Renewals are limited by library rules.",
  },
  approved: {
    tone: "ok",
    title: "Request approved",
    body: "A free copy is assigned and the due date set. It is now waiting for collection.",
    href: "/admin/loans?status=APPROVED",
    cta: "Ready to collect",
  },
  rejected: {
    tone: "warn",
    title: "Request declined",
    body: "The member has been notified and the request closed.",
  },
  collected: {
    tone: "ok",
    title: "Marked as collected",
    body: "The loan is active now and the copy is out with the member.",
    href: "/admin/loans?status=ACTIVE",
    cta: "On loan",
  },
  returned: {
    tone: "ok",
    title: "Return recorded",
    body: "Any overdue or damage charge has been calculated automatically.",
    href: "/admin/loans?status=RETURNED",
    cta: "Returns",
  },
  fineSettled: {
    tone: "ok",
    title: "Charge settled",
    body: "The member balance has been updated.",
  },
  saved: {
    tone: "ok",
    title: "Saved",
    body: "Your changes are live.",
  },
  created: {
    tone: "ok",
    title: "Book added",
    body: "The title is in the catalogue and its copies are ready to lend.",
    href: "/admin/books",
    cta: "Inventory",
  },
  bookRemoved: {
    tone: "warn",
    title: "Book removed",
    body: "The record and its copies have been deleted from the catalogue.",
  },
  announcementSaved: {
    tone: "ok",
    title: "Announcement saved",
    body: "It is listed in News & events on the public site.",
    href: "/admin/announcements",
    cta: "All news",
  },
  announcementRemoved: {
    tone: "warn",
    title: "Announcement removed",
    body: "It is no longer shown on the public site.",
  },
  swept: {
    tone: "ok",
    title: "Overdue sweep complete",
    body: "Late items were flagged and their daily charges applied.",
  },
  registered: {
    tone: "ok",
    title: "Welcome to the library",
    body: "Your membership is active. You can request books straight from the catalogue.",
    href: "/books",
    cta: "Browse books",
  },
};

const TONE_CLASS: Record<Tone, string> = {
  ok: "border-forest/25 bg-forest-soft text-forest-2",
  warn: "border-amber/30 bg-amber-soft text-amber",
  bad: "border-red-300 bg-red-50 text-red-700",
};

const DOT_CLASS: Record<Tone, string> = {
  ok: "bg-forest",
  warn: "bg-amber",
  bad: "bg-red-600",
};

export function Notice({
  ok,
  err,
  className,
}: {
  ok?: string | null;
  err?: string | null;
  className?: string;
}) {
  // An unknown `ok` key is a bug or a hand-edited URL - never render raw input.
  const entry = ok && NOTICES[ok] ? NOTICES[ok] : null;

  if (!entry) {
    if (!err) return null;
    return (
      <div
        role="alert"
        className={cn(
          "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
          TONE_CLASS.bad,
          className,
        )}
      >
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT_CLASS.bad)} />
        <div>
          <p className="font-semibold">That did not go through</p>
          <p className="mt-0.5 opacity-90">{err}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        TONE_CLASS[entry.tone],
        className,
      )}
    >
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT_CLASS[entry.tone])} />
      <div className="min-w-0">
        <p className="font-semibold">{entry.title}</p>
        <p className="mt-0.5 opacity-90">{entry.body}</p>
      </div>
      {entry.href && entry.cta && (
        <Link
          href={entry.href}
          className="ml-auto shrink-0 rounded-md border border-current/30 px-2.5 py-1 text-xs font-semibold whitespace-nowrap hover:bg-white/60"
        >
          {entry.cta}
        </Link>
      )}
    </div>
  );
}
