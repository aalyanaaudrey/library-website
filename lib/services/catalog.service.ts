import "server-only";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

export type CatalogFilters = {
  q?: string;
  genre?: string;
  category?: string;
  year?: string;
  avail?: string;
  sort?: string;
  page?: string;
};

const PER_PAGE = 12;

function buildWhere(f: CatalogFilters): Prisma.BookWhereInput {
  const where: Prisma.BookWhereInput = { status: { not: "RETIRED" } };
  const AND: Prisma.BookWhereInput[] = [];

  // Keyword search across title, ISBN, author name and description.
  const q = f.q?.trim();
  if (q) {
    AND.push({
      OR: [
        { title: { contains: q } },
        { isbn: { contains: q } },
        { description: { contains: q } },
        { authors: { some: { author: { name: { contains: q } } } } },
        { genres: { some: { genre: { name: { contains: q } } } } },
        { category: { contains: q } },
      ],
    });
  }

  // Genre is matched on slug (stable) but falls back to name.
  const genre = f.genre?.trim();
  if (genre) {
    AND.push({
      genres: {
        some: {
          OR: [{ genre: { slug: genre } }, { genre: { name: genre } }],
        },
      },
    });
  }

  // Shelf category is an exact match - the list is a closed vocabulary.
  const category = f.category?.trim();
  if (category) {
    AND.push({ category: { equals: category } });
  }

  // Publication year. "pre2000" buckets everything before 2000.
  const year = f.year?.trim();
  if (year) {
    if (year === "pre2000") {
      AND.push({ year: { lt: 2000 } });
    } else {
      const n = Number(year);
      if (Number.isFinite(n)) {
        AND.push(
          year === "recent"
            ? { year: { gte: new Date().getFullYear() - 4 } }
            : { year: n },
        );
      }
    }
  }

  // Availability = has at least one free copy.
  if (f.avail === "1") {
    AND.push({ copies: { some: { status: "AVAILABLE" } } });
  }

  if (AND.length) where.AND = AND;
  return where;
}

function buildOrderBy(sort: string | undefined): Prisma.BookOrderByWithRelationInput[] {
  switch (sort) {
    case "title_desc":
      return [{ title: "desc" }];
    case "year_desc":
      return [{ year: { sort: "desc", nulls: "last" } }];
    case "year_asc":
      return [{ year: { sort: "asc", nulls: "last" } }];
    case "newest":
      return [{ createdAt: "desc" }];
    default:
      return [{ title: "asc" }];
  }
}

const BOOK_INCLUDE = {
  authors: { include: { author: true } },
  genres: { include: { genre: true } },
  copies: { select: { status: true } },
  reviews: { select: { rating: true } },
} satisfies Prisma.BookInclude;

export async function searchBooks(f: CatalogFilters) {
  const where = buildWhere(f);
  const orderBy = buildOrderBy(f.sort);
  const page = Math.max(1, Number(f.page) || 1);

  const [total, items] = await Promise.all([
    db.book.count({ where }),
    db.book.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: BOOK_INCLUDE,
    }),
  ]);

  return {
    items: items.map(shapeBook),
    total,
    page,
    perPage: PER_PAGE,
    totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
  };
}

/** Shape a raw book row into what the UI actually needs. */
export function shapeBook(book: {
  id: string;
  title: string;
  slug: string;
  isbn: string | null;
  year: number | null;
  coverUrl: string | null;
  status: string;
  category?: string;
  description?: string | null;
  publisher?: string | null;
  pages?: number | null;
  borrowFeeCents: number;
  rentalFeeCents: number | null;
  authors: { author: { id: string; name: string; slug: string } }[];
  genres: { genre: { id: string; name: string; slug: string } }[];
  copies: { status: string }[];
  reviews: { rating: number }[];
}) {
  const available = book.copies.filter((c) => c.status === "AVAILABLE").length;
  const ratings = book.reviews.map((r) => r.rating);
  return {
    id: book.id,
    title: book.title,
    slug: book.slug,
    isbn: book.isbn,
    year: book.year,
    coverUrl: book.coverUrl,
    status: book.status,
    category: book.category ?? "Fiction",
    description: book.description ?? null,
    publisher: book.publisher ?? null,
    pages: book.pages ?? null,
    borrowFeeCents: book.borrowFeeCents,
    rentalFeeCents: book.rentalFeeCents,
    authors: book.authors.map((a) => a.author),
    genres: book.genres.map((g) => g.genre),
    copiesTotal: book.copies.length,
    copiesAvailable: available,
    isAvailable: available > 0,
    averageRating: ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null,
    reviewCount: ratings.length,
  };
}

export async function getBookBySlug(slug: string) {
  const book = await db.book.findUnique({
    where: { slug },
    include: { ...BOOK_INCLUDE, copies: { select: { id: true, barcode: true, status: true } } },
  });
  return book ? shapeBook(book) : null;
}

export async function getBookById(id: string) {
  const book = await db.book.findUnique({ where: { id }, include: BOOK_INCLUDE });
  return book ? shapeBook(book) : null;
}

export async function listGenres() {
  const genres = await db.genre.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { books: true } } },
  });
  return genres.map((g) => ({ ...g, count: g._count.books }));
}

/**
 * Shelf categories actually present in the collection, returned in canonical
 * order so the filter list never shows a vocabulary gap or an empty option.
 */
export async function listCategories() {
  const groups = await db.book.groupBy({
    by: ["category"],
    where: { status: { not: "RETIRED" } },
    _count: { _all: true },
  });
  const order: readonly string[] = CATEGORIES;
  return groups
    .map((g) => ({ name: g.category, count: g._count._all }))
    .sort((a, b) => {
      const ai = order.indexOf(a.name);
      const bi = order.indexOf(b.name);
      if (ai !== bi) return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
      return a.name.localeCompare(b.name);
    });
}

export async function listYears() {
  const rows = await db.book.findMany({
    where: { year: { not: null }, status: { not: "RETIRED" } },
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });
  return rows.map((r) => r.year).filter((y): y is number => y !== null);
}

export async function getAuthorBySlug(slug: string) {
  return db.author.findUnique({
    where: { slug },
    include: {
      books: {
        include: { book: { include: BOOK_INCLUDE } },
      },
    },
  });
}

export async function listFeaturedBooks(limit = 6) {
  const books = await db.book.findMany({
    where: { status: { not: "RETIRED" } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: BOOK_INCLUDE,
  });
  return books.map(shapeBook);
}

export async function searchCatalogStats() {
  const [total, available] = await Promise.all([
    db.book.count({ where: { status: { not: "RETIRED" } } }),
    db.book.count({ where: { status: "AVAILABLE" } }),
  ]);
  return { total, available };
}
