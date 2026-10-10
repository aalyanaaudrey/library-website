import type { Metadata } from "next";
import { db } from "@/lib/db";
import { BookForm } from "@/components/admin/book-form";

export const metadata: Metadata = { title: "Add book" };
export const dynamic = "force-dynamic";

export default async function NewBookPage() {
  const [authors, genres] = await Promise.all([
    db.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.genre.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">Add a book</h2>
        <p className="mt-1 text-sm text-ink-3">
          Create the record and the physical copies together.
        </p>
      </div>

      <BookForm authors={authors} genres={genres} />
    </div>
  );
}
