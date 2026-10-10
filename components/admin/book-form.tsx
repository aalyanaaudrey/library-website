"use client";

import { useActionState, useState } from "react";
import { createBookAction, updateBookAction, type AdminFormState } from "@/app/actions/admin";
import { CATEGORIES } from "@/lib/constants";
import { Callout } from "@/components/ui";

const EMPTY: AdminFormState = {};

export type AuthorOption = { id: string; name: string };
export type GenreOption = { id: string; name: string };

export type BookDraft = {
  id?: string;
  title: string;
  isbn: string | null;
  publisher: string | null;
  year: number | null;
  edition: string | null;
  pages: number | null;
  description: string | null;
  coverUrl: string | null;
  category: string;
  status: string;
  borrowFeeCents: number;
  rentalFeeCents: number | null;
  overdueFinePerDayCents: number;
  copies: number;
  authorIds: string[];
  genreIds: string[];
};

const BLANK: BookDraft = {
  title: "",
  isbn: null,
  publisher: null,
  year: null,
  edition: null,
  pages: null,
  description: null,
  coverUrl: null,
  category: "Fiction",
  status: "AVAILABLE",
  borrowFeeCents: 0,
  rentalFeeCents: null,
  overdueFinePerDayCents: 50,
  copies: 1,
  authorIds: [],
  genreIds: [],
};

export function BookForm({
  book,
  authors,
  genres,
}: {
  book?: BookDraft;
  authors: AuthorOption[];
  genres: GenreOption[];
}) {
  const editing = !!book?.id;
  const action = editing ? updateBookAction : createBookAction;
  const [state, formAction, pending] = useActionState(action, EMPTY);

  // Dollars in the UI, integer cents in the database.
  const [borrowDollars, setBorrowDollars] = useState(
    ((book ?? BLANK).borrowFeeCents / 100).toFixed(2),
  );
  const [rentalDollars, setRentalDollars] = useState(
    (book?.rentalFeeCents ?? 0) ? ((book!.rentalFeeCents ?? 0) / 100).toFixed(2) : "",
  );
  const [fineDollars, setFineDollars] = useState(
    ((book ?? BLANK).overdueFinePerDayCents / 100).toFixed(2),
  );
  const [copies, setCopies] = useState(book?.copies ?? 1);

  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(
    book?.authorIds ?? [],
  );
  const [selectedGenres, setSelectedGenres] = useState<string[]>(book?.genreIds ?? []);

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    id: string,
  ) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {editing && <input type="hidden" name="bookId" value={book.id} />}
      <input type="hidden" name="borrowFeeCents" value={Math.round(Number(borrowDollars) * 100 || 0)} />
      <input
        type="hidden"
        name="rentalFeeCents"
        value={rentalDollars ? Math.round(Number(rentalDollars) * 100) : ""}
      />
      <input type="hidden" name="overdueFinePerDayCents" value={Math.round(Number(fineDollars) * 100 || 0)} />
      <input type="hidden" name="copies" value={copies} />

      {selectedAuthors.map((id) => (
        <input key={id} type="hidden" name="authorIds" value={id} />
      ))}
      {selectedGenres.map((id) => (
        <input key={id} type="hidden" name="genreIds" value={id} />
      ))}

      {state.error && <Callout tone="danger">{state.error}</Callout>}

      {/* ---------------------------------------------------------- basics */}
      <section className="card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">Book details</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="label">Title *</label>
            <input
              id="title"
              name="title"
              required
              defaultValue={book?.title ?? ""}
              className={`field ${err.title ? "field-error" : ""}`}
            />
            {err.title && <p className="mt-1.5 text-xs text-red-600">{err.title}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="isbn" className="label">ISBN</label>
              <input
                id="isbn"
                name="isbn"
                defaultValue={book?.isbn ?? ""}
                placeholder="9780000000000"
                className={`field ${err.isbn ? "field-error" : ""}`}
              />
              {err.isbn && <p className="mt-1.5 text-xs text-red-600">{err.isbn}</p>}
            </div>
            <div>
              <label htmlFor="year" className="label">Year</label>
              <input
                id="year"
                name="year"
                type="number"
                defaultValue={book?.year ?? ""}
                className={`field ${err.year ? "field-error" : ""}`}
              />
              {err.year && <p className="mt-1.5 text-xs text-red-600">{err.year}</p>}
            </div>
            <div>
              <label htmlFor="pages" className="label">Pages</label>
              <input
                id="pages"
                name="pages"
                type="number"
                defaultValue={book?.pages ?? ""}
                className="field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="publisher" className="label">Publisher</label>
              <input id="publisher" name="publisher" defaultValue={book?.publisher ?? ""} className="field" />
            </div>
            <div>
              <label htmlFor="edition" className="label">Edition</label>
              <input id="edition" name="edition" defaultValue={book?.edition ?? ""} className="field" placeholder="e.g. 3rd" />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="label">Description</label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={book?.description ?? ""}
              className="field resize-y"
              placeholder="Synopsis shown on the book page."
            />
          </div>

          <div>
            <label htmlFor="coverUrl" className="label">
              Cover image URL <span className="text-ink-3">(optional)</span>
            </label>
            <input
              id="coverUrl"
              name="coverUrl"
              type="url"
              defaultValue={book?.coverUrl ?? ""}
              className="field"
              placeholder="https://covers.openlibrary.org/b/isbn/…-L.jpg"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- classification */}
      <section className="card p-6">
        <h3 className="mb-1 font-display text-lg font-semibold">Shelf, authors &amp; genres</h3>
        <p className="mb-4 text-sm text-ink-3">
          One broad category places it on a shelf; the genres below are the finer tags.
          New authors and genres can be added from the Inventory page.
        </p>

        <div className="mb-5">
          <label htmlFor="category" className="label">Shelf category *</label>
          <select
            id="category"
            name="category"
            defaultValue={book?.category ?? "Fiction"}
            className="field"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="label">Authors *</legend>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-line p-3">
            <div className="flex flex-wrap gap-1.5">
              {authors.map((a) => {
                const on = selectedAuthors.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(selectedAuthors, setSelectedAuthors, a.id)}
                    aria-pressed={on}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                      (on
                        ? "border-forest bg-forest text-white"
                        : "border-line bg-white text-ink-2 hover:border-forest/40")
                    }
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>
          {err.authorIds && <p className="mt-1.5 text-xs text-red-600">{err.authorIds}</p>}
        </fieldset>

        <fieldset className="mt-5">
          <legend className="label">Genres *</legend>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-line p-3">
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => {
                const on = selectedGenres.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggle(selectedGenres, setSelectedGenres, g.id)}
                    aria-pressed={on}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                      (on
                        ? "border-forest bg-forest text-white"
                        : "border-line bg-white text-ink-2 hover:border-forest/40")
                    }
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
          {err.genreIds && <p className="mt-1.5 text-xs text-red-600">{err.genreIds}</p>}
        </fieldset>
      </section>

      {/* ------------------------------------------------------------ lending */}
      <section className="card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">Lending settings</h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="status" className="label">Status</label>
            <select id="status" name="status" defaultValue={book?.status ?? "AVAILABLE"} className="field">
              <option value="AVAILABLE">Available</option>
              <option value="MAINTENANCE">Under maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>

          <div>
            <label htmlFor="borrowFee" className="label">Borrow fee ($)</label>
            <input
              id="borrowFee"
              type="number"
              step="0.01"
              min="0"
              value={borrowDollars}
              onChange={(e) => setBorrowDollars(e.target.value)}
              className="field"
            />
            <p className="mt-1 text-xs text-ink-3">0.00 = free to borrow</p>
          </div>

          <div>
            <label htmlFor="rentalFee" className="label">
              Rental fee ($/period) <span className="text-ink-3">(optional)</span>
            </label>
            <input
              id="rentalFee"
              type="number"
              step="0.01"
              min="0"
              value={rentalDollars}
              onChange={(e) => setRentalDollars(e.target.value)}
              className="field"
              placeholder="Blank = not for rent"
            />
          </div>

          <div>
            <label htmlFor="finePerDay" className="label">Overdue charge ($/day)</label>
            <input
              id="finePerDay"
              type="number"
              step="0.01"
              min="0"
              value={fineDollars}
              onChange={(e) => setFineDollars(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="copiesInput" className="label">
              {editing ? "Copies" : "Number of copies"}
            </label>
            <input
              id="copiesInput"
              type="number"
              min={editing ? 1 : 1}
              max={50}
              value={copies}
              onChange={(e) =>
                setCopies(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
              }
              className="field"
            />
            <p className="mt-1 text-xs text-ink-3">
              {editing
                ? "Surplus free copies are removed; copies on loan are never deleted."
                : "Each copy gets its own barcode."}
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <a href="/admin/books" className="btn-secondary">
          Cancel
        </a>
        <button type="submit" disabled={pending} className="btn-primary px-8 py-3">
          {pending ? "Saving…" : editing ? "Save changes" : "Add book"}
        </button>
      </div>
    </form>
  );
}
