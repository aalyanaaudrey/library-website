import Link from "next/link";
import { BookCover, AvailabilityBadge } from "@/components/ui";
import { formatMoney, excerpt } from "@/lib/utils";

type Shape = {
  id: string;
  title: string;
  slug: string;
  year: number | null;
  coverUrl: string | null;
  description?: string | null;
  borrowFeeCents: number;
  rentalFeeCents: number | null;
  authors: { name: string; slug: string }[];
  genres: { name: string; slug: string }[];
  copiesAvailable: number;
  copiesTotal: number;
  isAvailable: boolean;
  averageRating?: number | null;
  reviewCount?: number;
};

export function BookCard({
  book,
  priority = false,
  showDescription = false,
}: {
  book: Shape;
  priority?: boolean;
  showDescription?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col">
      <div className="relative">
        <BookCover
          title={book.title}
          src={book.coverUrl}
          slug={book.slug}
          priority={priority}
          className="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift"
        />
        <div className="absolute -top-2 -right-2">
          <AvailabilityBadge
            isAvailable={book.isAvailable}
            available={book.copiesAvailable}
            total={book.copiesTotal}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <h3 className="font-display text-[15px] leading-snug font-semibold">
          <Link href={`/books/${book.slug}`} className="hover:text-forest-3">
            <span className="line-clamp-2">{book.title}</span>
          </Link>
        </h3>

        {book.authors.length > 0 && (
          <p className="mt-1 text-[13px] text-ink-3">
            {book.authors.map((a) => a.name).join(", ")}
            {book.year ? ` · ${book.year}` : ""}
          </p>
        )}

        {showDescription && book.description && (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-ink-3">
            {excerpt(book.description, 140)}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          {book.averageRating ? (
            <Stars value={book.averageRating} count={book.reviewCount ?? 0} />
          ) : (
            <span className="text-xs text-ink-3">No reviews yet</span>
          )}

          <span className="text-xs font-medium text-ink-2">
            {book.borrowFeeCents === 0 ? "Free to borrow" : `${formatMoney(book.borrowFeeCents)}/loan`}
          </span>
        </div>

        {book.genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {book.genres.slice(0, 2).map((g) => (
              <Link
                key={g.slug}
                href={`/books?genre=${encodeURIComponent(g.slug)}`}
                className="rounded-md bg-paper-2 px-1.5 py-0.5 text-[11px] text-ink-3 transition hover:bg-paper-3 hover:text-ink-2"
              >
                {g.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function Stars({ value, count }: { value: number; count?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="flex items-center gap-1" title={`${value} out of 5`}>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className={`h-3.5 w-3.5 ${i <= rounded ? "text-amber" : "text-line"}`}
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118L2.075 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674Z" />
          </svg>
        ))}
      </span>
      <span className="text-xs text-ink-3">
        {value}
        {count !== undefined && count > 0 ? ` (${count})` : ""}
      </span>
    </span>
  );
}
