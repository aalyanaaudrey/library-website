import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { Notice } from "@/components/notice";
import { deleteBookAction } from "@/app/actions/admin";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = first(sp.q)?.trim();

  const books = await db.book.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q } },
            { isbn: { contains: q } },
            { authors: { some: { author: { name: { contains: q } } } } },
          ],
        }
      : undefined,
    orderBy: { title: "asc" },
    take: 100,
    include: {
      authors: { include: { author: true } },
      copies: { select: { status: true } },
      _count: { select: { loans: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Inventory</h2>
          <p className="mt-1 text-sm text-ink-3">
            {books.length} {books.length === 1 ? "title" : "titles"} · add, edit or retire records.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/books/new" className="btn-primary">
            + Add book
          </Link>
        </div>
      </div>

      <Notice ok={first(sp.ok)} err={first(sp.err)} className="mb-5" />

      {/* Search */}
      <form method="get" className="mb-5">
        <div className="relative max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search title, author or ISBN…"
            className="field pl-10"
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute top-1/2 left-3 h-4.5 w-4.5 -translate-y-1/2 text-ink-3"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
          </svg>
        </div>
      </form>

      {books.length === 0 ? (
        <EmptyState
          title={q ? "No matching books" : "No books in the catalogue"}
          description={q ? "Try a different search term." : "Add your first title to get started."}
          action={{ href: "/admin/books/new", label: "Add a book" }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[820px]">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th className="text-center">Copies</th>
                  <th className="text-right">Borrow fee</th>
                  <th className="text-center">Loans</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => {
                  const total = book.copies.length;
                  const free = book.copies.filter((c) => c.status === "AVAILABLE").length;

                  return (
                    <tr key={book.id}>
                      <td className="max-w-72">
                        <Link
                          href={`/books/${book.slug}`}
                          className="block truncate font-medium hover:text-forest-3"
                        >
                          {book.title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-ink-3">
                          {book.authors.map((a) => a.author.name).join(", ")}
                          {book.year ? ` · ${book.year}` : ""}
                        </p>
                      </td>

                      <td>
                        <Badge status={book.status} />
                      </td>

                      <td className="text-center tabular-nums">
                        <span className={free > 0 ? "font-semibold text-emerald-700" : "text-ink-3"}>
                          {free}
                        </span>
                        <span className="text-ink-3"> / {total}</span>
                      </td>

                      <td className="text-right">{formatMoney(book.borrowFeeCents)}</td>

                      <td className="text-center tabular-nums">{book._count.loans}</td>

                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/books/${book.id}`}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            Edit
                          </Link>
                          <form action={deleteBookAction}>
                            <input type="hidden" name="bookId" value={book.id} />
                            <button
                              type="submit"
                              className="btn-ghost px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-3">
        Titles with copies out on loan cannot be deleted — record the return first. This
        protects the audit trail.
      </p>
    </div>
  );
}
