import Link from "next/link";
import { cn, coverTone, formatMoney } from "@/lib/utils";
import { LABELS, STATUS_TONE } from "@/lib/constants";
import { CoverImage } from "@/components/cover-image";

/* ------------------------------------------------------------------ Badge */

export function Badge({
  status,
  children,
  className,
}: {
  status?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tone = status ? (STATUS_TONE[status] ?? "bg-zinc-100 text-zinc-700 ring-zinc-500/20") : "";
  return (
    <span className={cn("badge", tone, className)}>
      {children ?? (status ? LABELS[status] ?? status : null)}
    </span>
  );
}

/** Availability pill used across catalog and detail pages. */
export function AvailabilityBadge({
  isAvailable,
  available,
  total,
}: {
  isAvailable: boolean;
  available: number;
  total: number;
}) {
  if (isAvailable) {
    return (
      <Badge status="AVAILABLE">
        Available · {available}/{total}
      </Badge>
    );
  }
  return (
    <Badge status="BORROWED">
      {total > 0 ? `All ${total} on loan` : "Unavailable"}
    </Badge>
  );
}

/* ------------------------------------------------------------------ Cover */

/**
 * Book cover with a deterministic gradient fallback. Real covers come from
 * OpenLibrary, which 404s for some ISBNs - so a broken image must never leave
 * an empty box in the grid.
 */
export function BookCover({
  title,
  src,
  slug,
  className,
  priority = false,
}: {
  title: string;
  src?: string | null;
  slug?: string;
  className?: string;
  priority?: boolean;
}) {
  const wrapper = (
    <div
      className={cn(
        "group relative aspect-[2/3] w-full overflow-hidden rounded-lg",
        "bg-gradient-to-br shadow-card ring-1 ring-ink/10",
        coverTone(slug ?? title),
        className,
      )}
    >
      {/* Spine shading sells the book-object illusion on the fallback. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[9%] bg-gradient-to-r from-black/35 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />

      <CoverImage
        src={src}
        alt={`Cover of ${title}`}
        priority={priority}
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />

      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="line-clamp-3 font-display text-[13px] leading-snug font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.7)]">
          {title}
        </p>
      </div>
    </div>
  );

  return slug ? <Link href={`/books/${slug}`} className="block">{wrapper}</Link> : wrapper;
}

/* ------------------------------------------------------------- Empty state */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  icon?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper-3 text-ink-3">
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        )}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-ink-3">{description}</p>}
      {action && (
        <Link href={action.href} className="btn-primary mt-5">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Pagination */

export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v) sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const window = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) window.push(i);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-secondary px-3" aria-label="Previous page">
          ←
        </Link>
      )}
      {start > 1 && (
        <>
          <Link href={href(1)} className="btn-ghost px-3.5">1</Link>
          {start > 2 && <span className="px-1 text-ink-3">…</span>}
        </>
      )}
      {window.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "px-3.5 py-2 text-sm font-semibold rounded-lg transition",
            p === page ? "bg-forest text-white" : "btn-ghost",
          )}
        >
          {p}
        </Link>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-ink-3">…</span>}
          <Link href={href(totalPages)} className="btn-ghost px-3.5">{totalPages}</Link>
        </>
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} className="btn-secondary px-3" aria-label="Next page">
          →
        </Link>
      )}
    </nav>
  );
}

/* --------------------------------------------------------------- Callouts */

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
  } as const;

  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------ Section head */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-forest-3">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold sm:text-[28px]">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-3">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn-secondary shrink-0">
          {action.label} →
        </Link>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Stat card */

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const tones = {
    default: "text-ink",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700",
  } as const;

  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-semibold tabular-nums", tones[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export { formatMoney };
