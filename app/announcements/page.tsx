import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { formatDate, excerpt } from "@/lib/utils";

export const metadata: Metadata = {
  title: "News & announcements",
  description: "Library news, events, opening hours and service updates.",
};
export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const announcements = await db.announcement.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="mb-4 text-sm text-ink-3" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">News</span>
      </nav>

      <h1 className="font-display text-3xl font-semibold sm:text-4xl">News &amp; announcements</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-3">
        Events, service changes and everything else worth knowing from the library desk.
      </p>

      <div className="mt-10 space-y-5">
        {announcements.length === 0 ? (
          <EmptyState
            title="Nothing posted yet"
            description="Check back soon — library news will appear here."
          />
        ) : (
          announcements.map((a) => (
            <Link
              key={a.id}
              href={`/announcements/${a.slug}`}
              className="card group block p-6 transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex flex-wrap items-center gap-2">
                {a.pinned && (
                  <span className="badge bg-amber-soft text-amber ring-amber/20">Pinned</span>
                )}
                <time className="text-xs text-ink-3">{formatDate(a.publishedAt)}</time>
              </div>

              <h2 className="mt-3 font-display text-xl leading-snug font-semibold group-hover:text-forest-3">
                {a.title}
              </h2>

              <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
                {a.excerpt ?? excerpt(a.body, 220)}
              </p>

              <span className="mt-4 inline-block text-sm font-semibold text-forest-3">
                Read the full post →
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
