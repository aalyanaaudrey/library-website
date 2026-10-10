import type { Metadata } from "next";
import { Suspense } from "react";
import { BookCard } from "@/components/catalog/book-card";
import {
  CatalogControls,
  type GenreOption,
} from "@/components/catalog/catalog-controls";
import { EmptyState, Pagination } from "@/components/ui";
import { searchBooks, listGenres, listCategories, listYears } from "@/lib/services/catalog.service";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Search and browse the full library collection by title, author, ISBN or genre.",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const filters = {
    q: first(sp.q),
    genre: first(sp.genre),
    category: first(sp.category),
    year: first(sp.year),
    avail: first(sp.avail),
    sort: first(sp.sort),
    page: first(sp.page),
  };

  const [results, genres, categories, years] = await Promise.all([
    searchBooks(filters),
    listGenres(),
    listCategories(),
    listYears(),
  ]);

  const genreOptions: GenreOption[] = genres.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    count: g.count,
  }));

  // Carried through to pagination links so paging preserves the filters.
  const pageParams = {
    q: filters.q,
    genre: filters.genre,
    category: filters.category,
    year: filters.year,
    avail: filters.avail,
    sort: filters.sort,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Page head */}
      <div className="mb-7">
        <nav className="mb-2 text-sm text-ink-3" aria-label="Breadcrumb">
          <a href="/" className="hover:text-ink">Home</a>
          <span className="mx-1.5">/</span>
          <span className="text-ink">Catalogue</span>
        </nav>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Catalogue</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-3">
          Search the whole collection and see live availability. Sign in to request a borrow
          or rental once you have found what you want.
        </p>
      </div>

      <Suspense fallback={<div className="card h-64 animate-pulse" />}>
        <CatalogControls
          genres={genreOptions}
          categories={categories}
          years={years}
          resultCount={results.total}
        />
      </Suspense>

      <div className="mt-8">
        {results.items.length === 0 ? (
          <EmptyState
            title="No titles match your search"
            description="Try a different keyword, or clear the filters to see the whole collection."
            action={{ href: "/books", label: "Clear filters" }}
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
                <path d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
              </svg>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
              {results.items.map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  priority={i < 4}
                  showDescription
                />
              ))}
            </div>

            <Pagination
              page={results.page}
              totalPages={results.totalPages}
              basePath="/books"
              params={pageParams}
            />
          </>
        )}
      </div>
    </div>
  );
}
