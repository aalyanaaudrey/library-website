import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { Notice } from "@/components/notice";
import { deleteAnnouncementAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const announcements = await db.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Announcements</h2>
          <p className="mt-1 text-sm text-ink-3">
            News, events and notices shown on the public site.
          </p>
        </div>
        <Link href="/admin/announcements/new" className="btn-primary">
          + New announcement
        </Link>
      </div>

      <Notice ok={first(sp.ok)} err={first(sp.err)} className="mb-6" />

      {announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Write one to tell members about events, opening hours or services."
          action={{ href: "/admin/announcements/new", label: "Write one" }}
        />
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/announcements/${a.slug}`}
                    className="font-display text-lg font-semibold hover:text-forest-3"
                  >
                    {a.title}
                  </Link>
                  {a.pinned && <Badge status="RESERVED">Pinned</Badge>}
                  <Badge status={a.publishedAt ? "AVAILABLE" : "CANCELLED"}>
                    {a.publishedAt ? "Published" : "Draft"}
                  </Badge>
                </div>

                {a.excerpt && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-3">{a.excerpt}</p>
                )}

                <p className="mt-2 text-xs text-ink-3">
                  Created {formatDate(a.createdAt)}
                  {a.publishedAt && <> · Published {formatDate(a.publishedAt)}</>}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/admin/announcements/${a.id}`}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Edit
                </Link>
                <form action={deleteAnnouncementAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="btn-ghost px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
