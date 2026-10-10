import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.announcement.findUnique({ where: { slug } });
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt ?? post.body.slice(0, 160),
  };
}

export default async function AnnouncementDetailPage({ params }: Params) {
  const { slug } = await params;
  const post = await db.announcement.findUnique({ where: { slug } });
  if (!post) notFound();

  // Load two more posts for the "read next" strip.
  const more = await db.announcement.findMany({
    where: { publishedAt: { not: null }, id: { not: post.id } },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 2,
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm text-ink-3" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/announcements" className="hover:text-ink">News</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink line-clamp-1">{post.title}</span>
      </nav>

      <header>
        {post.pinned && (
          <span className="badge bg-amber-soft text-amber ring-amber/20">Pinned</span>
        )}
        <h1 className="mt-3 font-display text-3xl leading-tight font-semibold sm:text-4xl">
          {post.title}
        </h1>
        {post.publishedAt && (
          <p className="mt-3 text-sm text-ink-3">
            Published {formatDate(post.publishedAt)}
          </p>
        )}
      </header>

      {post.excerpt && (
        <p className="mt-6 border-l-4 border-forest/30 pl-4 text-[17px] leading-relaxed text-ink-2 italic">
          {post.excerpt}
        </p>
      )}

      <div className="mt-8 text-[16px] leading-[1.8] text-ink-2 whitespace-pre-line">
        {post.body}
      </div>

      <div className="mt-10 border-t border-line pt-6">
        <Link href="/announcements" className="btn-secondary">
          ← Back to all news
        </Link>
      </div>

      {more.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-xl font-semibold">Read next</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {more.map((m) => (
              <Link
                key={m.id}
                href={`/announcements/${m.slug}`}
                className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <time className="text-xs text-ink-3">{formatDate(m.publishedAt)}</time>
                <h3 className="mt-2 font-display text-base leading-snug font-semibold group-hover:text-forest-3">
                  {m.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
