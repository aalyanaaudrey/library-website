import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BookForm, type BookDraft } from "@/components/admin/book-form";

export const metadata: Metadata = { title: "Edit book" };
export const dynamic = "force-dynamic";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [book, authors, genres] = await Promise.all([
    db.book.findUnique({
      where: { id },
      include: {
        authors: { select: { authorId: true } },
        genres: { select: { genreId: true } },
        copies: { select: { id: true } },
      },
    }),
    db.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.genre.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!book) notFound();

  const draft: BookDraft = {
    id: book.id,
    title: book.title,
    isbn: book.isbn,
    publisher: book.publisher,
    year: book.year,
    edition: book.edition,
    pages: book.pages,
    description: book.description,
    coverUrl: book.coverUrl,
    category: book.category,
    status: book.status,
    borrowFeeCents: book.borrowFeeCents,
    rentalFeeCents: book.rentalFeeCents,
    overdueFinePerDayCents: book.overdueFinePerDayCents,
    copies: book.copies.length,
    authorIds: book.authors.map((a) => a.authorId),
    genreIds: book.genres.map((g) => g.genreId),
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">Edit book</h2>
        <p className="mt-1 text-sm text-ink-3">{book.title}</p>
      </div>

      <BookForm book={draft} authors={authors} genres={genres} />
    </div>
  );
}
