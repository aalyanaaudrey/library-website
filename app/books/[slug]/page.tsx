import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBookBySlug } from "@/lib/services/catalog.service";
import { BookCover, Badge, EmptyState } from "@/components/ui";
import { Stars } from "@/components/catalog/book-card";
import { BorrowForm } from "@/components/borrowing/borrow-form";
import { ReviewForm, ReviewSignInPrompt } from "@/components/catalog/review-form";
import { formatMoney, formatDate } from "@/lib/utils";
import { BookCard } from "@/components/catalog/book-card";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "Book not found" };
  const authors = book.authors.map((a) => a.name).join(", ");
  return {
    title: `${book.title}${authors ? ` by ${authors}` : ""}`,
    description: book.description?.slice(0, 160) ?? `Borrow ${book.title} from the library.`,
  };
}

export default async function BookDetailPage({ params }: Params) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const user = await getCurrentUser();

  const [reviews, myReview, similar] = await Promise.all([
    db.review.findMany({
      where: { bookId: book.id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, memberNo: true } } },
    }),
    user
      ? db.review.findUnique({
          where: { userId_bookId: { userId: user.id, bookId: book.id } },
        })
      : Promise.resolve(null),
    db.book.findMany({
      where: {
        id: { not: book.id },
        status: { not: "RETIRED" },
        genres: { some: { genre: { slug: { in: book.genres.map((g) => g.slug) } } } },
      },
      take: 4,
      include: {
        authors: { include: { author: true } },
        genres: { include: { genre: true } },
        copies: { select: { status: true } },
        reviews: { select: { rating: true } },
      },
    }),
  ]);

  const facts: { k: string; v: string }[] = [
    { k: "Category", v: book.category },
    { k: "Year", v: book.year ? String(book.year) : "—" },
    { k: "ISBN", v: book.isbn ?? "—" },
    { k: "Copies", v: `${book.copiesAvailable} of ${book.copiesTotal} free` },
    { k: "Borrow fee", v: formatMoney(book.borrowFeeCents) },
    { k: "Rental fee", v: book.rentalFeeCents ? `${formatMoney(book.rentalFeeCents)}/period` : "Not for rent" },
  ];

  const similarShaped = similar.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    year: s.year,
    coverUrl: s.coverUrl,
    borrowFeeCents: s.borrowFeeCents,
    rentalFeeCents: s.rentalFeeCents,
    authors: s.authors.map((a) => a.author),
    genres: s.genres.map((g) => g.genre),
    copiesAvailable: s.copies.filter((c) => c.status === "AVAILABLE").length,
    copiesTotal: s.copies.length,
    isAvailable: s.copies.some((c) => c.status === "AVAILABLE"),
    averageRating: s.reviews.length
      ? Math.round((s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length) * 10) / 10
      : null,
    reviewCount: s.reviews.length,
  }));

  const avgRating = book.averageRating;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-ink-3" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/books" className="hover:text-ink">Catalogue</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink line-clamp-1">{book.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr_320px] lg:items-start">
        {/* ------------------------------------------------------- Cover */}
        <div className="mx-auto w-52 lg:mx-0 lg:w-full">
          <BookCover
            title={book.title}
            src={book.coverUrl}
            className="shadow-lift"
            priority
          />

          <div className="mt-4">
            <dl className="divide-y divide-line rounded-lg border border-line bg-white text-sm">
              {facts.map((f) => (
                <div key={f.k} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <dt className="text-ink-3">{f.k}</dt>
                  <dd className="text-right font-medium">{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* -------------------------------------------------------- Main */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={book.status} />
            {book.genres.map((g) => (
              <Link key={g.slug} href={`/books?genre=${encodeURIComponent(g.slug)}`}>
                <span className="badge bg-paper-2 text-ink-2 ring-line hover:bg-paper-3">
                  {g.name}
                </span>
              </Link>
            ))}
          </div>

          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold sm:text-[38px]">
            {book.title}
          </h1>

          {book.authors.length > 0 && (
            <p className="mt-2 text-lg text-ink-2">
              by{" "}
              {book.authors.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <Link
                    href={`/books?q=${encodeURIComponent(a.name)}`}
                    className="font-medium text-forest-3 hover:underline"
                  >
                    {a.name}
                  </Link>
                </span>
              ))}
            </p>
          )}

          {avgRating && (
            <div className="mt-3">
              <Stars value={avgRating} count={book.reviewCount} />
            </div>
          )}

          {book.description && (
            <div className="mt-6">
              <h2 className="font-display text-lg font-semibold">About this book</h2>
              <p className="mt-2 text-[15px] leading-[1.75] text-ink-2 whitespace-pre-line">
                {book.description}
              </p>
            </div>
          )}

          {/* ---------------------------------------------------- Reviews */}
          <section className="mt-10" id="reviews">
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-8">
              <h2 className="font-display text-xl font-semibold">
                Reviews{" "}
                <span className="text-ink-3">({reviews.length})</span>
              </h2>
            </div>

            {/* Review composer */}
            <div className="card mt-5 p-5">
              <h3 className="font-display text-base font-semibold">
                {myReview ? "Edit your review" : "Write a review"}
              </h3>
              <div className="mt-3">
                {user ? (
                  <ReviewForm bookId={book.id} existing={myReview} />
                ) : (
                  <ReviewSignInPrompt next={`/books/${book.slug}`} />
                )}
              </div>
            </div>

            {/* Review list */}
            <div className="mt-6 space-y-4">
              {reviews.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
                  No reviews yet. Be the first to share what you thought.
                </p>
              ) : (
                reviews.map((r) => (
                  <article key={r.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-soft text-xs font-bold text-forest-2">
                            {r.user.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold">{r.user.name}</p>
                            <p className="text-xs text-ink-3">{r.user.memberNo}</p>
                          </div>
                        </div>
                      </div>
                      <time className="text-xs text-ink-3">{formatDate(r.createdAt)}</time>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Stars value={r.rating} />
                      {r.title && <p className="text-sm font-semibold">{r.title}</p>}
                    </div>

                    {r.body && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-2 whitespace-pre-line">
                        {r.body}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        {/* ------------------------------------------------------- Aside */}
        <aside className="lg:sticky lg:top-24">
          <BorrowForm
            bookId={book.id}
            bookTitle={book.title}
            isAvailable={book.isAvailable}
            copiesAvailable={book.copiesAvailable}
            borrowFeeCents={book.borrowFeeCents}
            rentalFeeCents={book.rentalFeeCents}
            signedIn={!!user}
            next={`/books/${book.slug}`}
          />

          <div className="card mt-4 p-5">
            <h3 className="font-display text-base font-semibold">Library rules</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-3">
              {[
                "Bring your membership card when collecting.",
                "Requests are held for 5 days after approval.",
                "Renewals are allowed unless someone is waiting.",
                "Overdue items accrue a daily charge.",
              ].map((rule) => (
                <li key={rule} className="flex gap-2">
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-forest-3" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* ----------------------------------------------------- Similar */}
      {similarShaped.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 font-display text-xl font-semibold">You might also like</h2>
          <SimilarGrid books={similarShaped} />
        </section>
      )}
    </div>
  );
}

function SimilarGrid({ books }: { books: Parameters<typeof BookCard>[0]["book"][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
      {books.map((b) => (
        <BookCard key={b.id} book={b} />
      ))}
    </div>
  );
}
