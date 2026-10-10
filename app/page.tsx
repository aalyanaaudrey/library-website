import Link from "next/link";
import { db } from "@/lib/db";
import { BookCard } from "@/components/catalog/book-card";
import { SectionHeading, EmptyState } from "@/components/ui";
import { CoverImage } from "@/components/cover-image";
import { listFeaturedBooks, searchCatalogStats } from "@/lib/services/catalog.service";
import { formatDate, excerpt, coverTone, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, stats, announcements, genres] = await Promise.all([
    listFeaturedBooks(8),
    searchCatalogStats(),
    db.announcement.findMany({
      where: { publishedAt: { not: null } },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 3,
    }),
    db.genre.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { books: true } } },
    }),
  ]);

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="paper-grain relative overflow-hidden border-b border-line bg-paper-2">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-forest/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-amber/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-white/70 px-3 py-1 text-xs font-semibold text-forest-2">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-3" />
              Open to all members
            </p>

            <h1 className="mt-5 font-display text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-[56px]">
              Every shelf,
              <br />
              <span className="text-forest">from your sofa.</span>
            </h1>

            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
              Search the whole collection, check what is on the shelf right now, and send a
              borrowing request in a couple of clicks. No queues, no card catalogue.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/books" className="btn-primary px-6 py-3 text-base">
                Browse the catalogue
              </Link>
              <Link href="/register" className="btn-secondary px-6 py-3 text-base">
                Join the library
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                { k: "Titles", v: stats.total },
                { k: "Available now", v: stats.available },
                { k: "Genres", v: genres.length },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-3">{s.k}</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-forest">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Decorative stack of covers */}
          <div className="relative hidden h-[420px] lg:block" aria-hidden>
            {featured.slice(0, 4).map((b, i) => (
              <div
                key={b.id}
                className={cn(
                  "absolute w-40 rounded-xl shadow-lift ring-1 ring-ink/10 overflow-hidden",
                  "aspect-[2/3] bg-gradient-to-br",
                  coverTone(b.slug),
                )}
                style={{
                  right: `${i * 74}px`,
                  top: `${Math.abs(i - 1.5) * 26}px`,
                  transform: `rotate(${(i - 1.5) * 3.5}deg)`,
                  zIndex: 10 - i,
                }}
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 w-[10%] bg-gradient-to-r from-black/35 to-transparent" />
                {b.coverUrl && (
                  <CoverImage
                    src={b.coverUrl}
                    alt=""
                    decorative
                    priority
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps to your next read"
        />
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            {
              n: 1,
              t: "Search the shelves",
              d: "Look up a title, author or ISBN, and filter by genre, year or what is free right now.",
              href: "/books",
              cta: "Try a search",
            },
            {
              n: 2,
              t: "Request a loan",
              d: "Choose to borrow or rent, pick how long you need it, and see the expected return date up front.",
              href: "/register",
              cta: "Create an account",
            },
            {
              n: 3,
              t: "Collect and return",
              d: "We notify you the moment your request is approved. Renew online if nobody is waiting.",
              href: "/account/borrowings",
              cta: "See my loans",
            },
          ].map((s) => (
            <li key={s.n} className="card relative p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest font-display text-base font-semibold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.d}</p>
              <Link href={s.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest-3 hover:underline">
                {s.cta} →
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------- Featured */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <SectionHeading
          eyebrow="Fresh on the shelves"
          title="Recently added"
          description="The latest additions to the collection."
          action={{ href: "/books?sort=newest", label: "See all" }}
        />

        {featured.length === 0 ? (
          <EmptyState
            title="No books yet"
            description="Once staff add titles to the catalogue they will show up here."
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((book, i) => (
              <BookCard key={book.id} book={book} priority={i < 4} />
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- Genres */}
      <section className="border-y border-line bg-paper-2 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Explore" title="Browse by genre" />
          <div className="flex flex-wrap gap-2.5">
            {genres.map((g) => (
              <Link
                key={g.id}
                href={`/books?genre=${encodeURIComponent(g.slug)}`}
                className="group inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm transition hover:border-forest/40 hover:bg-forest-soft"
              >
                <span className="font-medium">{g.name}</span>
                <span className="rounded-full bg-paper-2 px-1.5 text-xs text-ink-3 group-hover:bg-white">
                  {g._count.books}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Announcements */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="From the desk"
          title="News &amp; announcements"
          action={{ href: "/announcements", label: "All news" }}
        />

        {announcements.length === 0 ? (
          <EmptyState title="Nothing posted yet" description="Library news will appear here." />
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href={`/announcements/${a.slug}`}
                className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center gap-2">
                  {a.pinned && (
                    <span className="badge bg-amber-soft text-amber ring-amber/20">Pinned</span>
                  )}
                  <time className="text-xs text-ink-3">{formatDate(a.publishedAt)}</time>
                </div>
                <h3 className="mt-3 font-display text-lg leading-snug font-semibold group-hover:text-forest-3">
                  {a.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-3">
                  {a.excerpt ?? excerpt(a.body, 150)}
                </p>
                <span className="mt-4 text-sm font-semibold text-forest-3">Read more →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-forest px-8 py-12 text-center sm:px-16">
          <div className="paper-grain absolute inset-0 opacity-20" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold text-white">
              Not a member yet?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-forest-soft">
              Registration is free. Create an account to request books, track due dates and
              get notifications when your loans are ready to collect.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="btn bg-white px-6 py-3 text-base text-forest hover:bg-paper-2"
              >
                Create an account
              </Link>
              <Link
                href="/books"
                className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10"
              >
                Browse first
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
