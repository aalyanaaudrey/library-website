"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireRole, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { slugify, withNotice } from "@/lib/utils";
import { sweepOverdue } from "@/lib/services/loan.service";
import {
  bookSchema,
  announcementSchema,
  genreSchema,
  authorSchema,
  flattenErrors,
} from "@/lib/validators";

export type AdminFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

function refresh() {
  revalidatePath("/", "layout");
}

function num(v: FormDataEntryValue | null): number | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Next free `BC-#####` number.
 *
 * Derived from the highest barcode already in use rather than a row count:
 * `count() + 1` re-issues numbers as soon as any copy is deleted, and the
 * unique constraint on `barcode` would then fail the whole insert.
 */
async function nextBarcodeSeq(tx: Prisma.TransactionClient): Promise<number> {
  const rows = await tx.bookCopy.findMany({
    where: { barcode: { startsWith: "BC-" } },
    select: { barcode: true },
  });
  return (
    rows.reduce((max, r) => Math.max(max, Number(r.barcode.slice(3)) || 0), 0) + 1
  );
}

/** A title and its slug must be unique across the catalogue. */
async function slugClash(
  tx: Prisma.TransactionClient,
  slug: string,
  isbn: string | null | undefined,
  excludeBookId?: string,
): Promise<boolean> {
  const clash = await tx.book.findFirst({
    where: {
      OR: [{ slug }, ...(isbn ? [{ isbn }] : [])],
      ...(excludeBookId ? { id: { not: excludeBookId } } : {}),
    },
    select: { id: true },
  });
  return !!clash;
}

/* ------------------------------------------------------------ Overdue run */

export async function runOverdueSweepAction(): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "loan:approve")) return;

  const { swept } = await sweepOverdue();
  refresh();
  redirect(
    swept > 0
      ? "/admin?ok=swept"
      : withNotice("/admin", "err", "Nothing was overdue, so no charges were added."),
  );
}

/* ----------------------------------------------------------- Book create */

export async function createBookAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireRole("LIBRARIAN", "ADMIN");
  if (!can(user.role, "inventory:manage")) return { error: "Not permitted." };

  const authorIds = formData.getAll("authorIds").map(String).filter(Boolean);
  const genreIds = formData.getAll("genreIds").map(String).filter(Boolean);

  const parsed = bookSchema.safeParse({
    title: formData.get("title"),
    isbn: formData.get("isbn") ?? "",
    publisher: formData.get("publisher") ?? "",
    year: formData.get("year") ?? "",
    edition: formData.get("edition") ?? "",
    pages: formData.get("pages") ?? "",
    description: formData.get("description") ?? "",
    coverUrl: formData.get("coverUrl") ?? "",
    category: formData.get("category") ?? "Fiction",
    status: formData.get("status") ?? "AVAILABLE",
    borrowFeeCents: formData.get("borrowFeeCents") ?? "0",
    rentalFeeCents: formData.get("rentalFeeCents") ?? "",
    overdueFinePerDayCents: formData.get("overdueFinePerDayCents") ?? "50",
    copies: formData.get("copies") ?? "1",
    authorIds,
    genreIds,
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  const d = parsed.data;
  const slug = slugify(d.title);

  if (await slugClash(db, slug, d.isbn)) {
    return { error: "A book with that title or ISBN already exists." };
  }

  const barcodeSeq = await nextBarcodeSeq(db);

  try {
    await db.book.create({
      data: {
        title: d.title,
        slug,
        isbn: d.isbn || null,
        publisher: d.publisher || null,
        year: Number.isNaN(d.year) ? null : d.year ?? null,
        edition: d.edition || null,
        pages: Number.isNaN(d.pages) ? null : d.pages ?? null,
        description: d.description || null,
        coverUrl: d.coverUrl || null,
        category: d.category,
        status: d.status,
        borrowFeeCents: d.borrowFeeCents,
        rentalFeeCents: Number.isNaN(d.rentalFeeCents) ? null : d.rentalFeeCents ?? null,
        overdueFinePerDayCents: d.overdueFinePerDayCents,
        authors: { create: d.authorIds.map((id) => ({ authorId: id })) },
        genres: { create: d.genreIds.map((id) => ({ genreId: id })) },
        copies: {
          create: Array.from({ length: d.copies }, (_, i) => ({
            barcode: `BC-${String(barcodeSeq + i).padStart(5, "0")}`,
            status: "AVAILABLE",
          })),
        },
      },
    });
  } catch (e) {
    // Unique-constraint races and the like: report instead of rendering a 500.
    return { error: e instanceof Error ? e.message : "Could not save that book." };
  }

  refresh();
  redirect("/admin/books?ok=created");
}

/* ------------------------------------------------------------- Book edit */

export async function updateBookAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireRole("LIBRARIAN", "ADMIN");
  if (!can(user.role, "inventory:manage")) return { error: "Not permitted." };

  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) return { error: "Missing book id." };

  const existing = await db.book.findUnique({ where: { id: bookId } });
  if (!existing) return { error: "Book not found." };

  const authorIds = formData.getAll("authorIds").map(String).filter(Boolean);
  const genreIds = formData.getAll("genreIds").map(String).filter(Boolean);

  const parsed = bookSchema.safeParse({
    title: formData.get("title"),
    isbn: formData.get("isbn") ?? "",
    publisher: formData.get("publisher") ?? "",
    year: formData.get("year") ?? "",
    edition: formData.get("edition") ?? "",
    pages: formData.get("pages") ?? "",
    description: formData.get("description") ?? "",
    coverUrl: formData.get("coverUrl") ?? "",
    category: formData.get("category") ?? "Fiction",
    status: formData.get("status") ?? "AVAILABLE",
    borrowFeeCents: formData.get("borrowFeeCents") ?? "0",
    rentalFeeCents: formData.get("rentalFeeCents") ?? "",
    overdueFinePerDayCents: formData.get("overdueFinePerDayCents") ?? "50",
    copies: formData.get("copies") ?? "1",
    authorIds,
    genreIds,
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  const d = parsed.data;
  const slug = slugify(d.title);

  // Renaming must not collide with a DIFFERENT book's title or ISBN.
  if (await slugClash(db, slug, d.isbn, bookId)) {
    return { error: "Another book already uses that title or ISBN." };
  }

  // Keep copies in sync with the requested count.
  const current = await db.bookCopy.findMany({ where: { bookId } });
  const wanted = d.copies;
  const delta = wanted - current.length;
  const barcodeSeq = delta > 0 ? await nextBarcodeSeq(db) : 0;

  try {
    await db.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: bookId },
        data: {
          title: d.title,
          slug,
          isbn: d.isbn || null,
          publisher: d.publisher || null,
          year: Number.isNaN(d.year) ? null : d.year ?? null,
          edition: d.edition || null,
          pages: Number.isNaN(d.pages) ? null : d.pages ?? null,
          description: d.description || null,
          coverUrl: d.coverUrl || null,
          category: d.category,
          status: d.status,
          borrowFeeCents: d.borrowFeeCents,
          rentalFeeCents: Number.isNaN(d.rentalFeeCents) ? null : d.rentalFeeCents ?? null,
          overdueFinePerDayCents: d.overdueFinePerDayCents,
        },
      });

      // Replace relations wholesale - simplest correct approach for a small set.
      await tx.bookAuthor.deleteMany({ where: { bookId } });
      await tx.bookAuthor.createMany({
        data: d.authorIds.map((id) => ({ bookId, authorId: id })),
      });
      await tx.bookGenre.deleteMany({ where: { bookId } });
      await tx.bookGenre.createMany({
        data: d.genreIds.map((id) => ({ bookId, genreId: id })),
      });

      if (delta > 0) {
        await tx.bookCopy.createMany({
          data: Array.from({ length: delta }, (_, i) => ({
            bookId,
            barcode: `BC-${String(barcodeSeq + i).padStart(5, "0")}`,
            status: "AVAILABLE",
          })),
        });
      } else if (delta < 0) {
        // Remove surplus copies, but never one that is currently out on loan.
        const removable = await tx.bookCopy.findMany({
          where: { bookId, status: { in: ["AVAILABLE", "DAMAGED"] } },
          take: Math.abs(delta),
        });
        await tx.bookCopy.deleteMany({ where: { id: { in: removable.map((c) => c.id) } } });
      }

      // Recompute denormalised status.
      const free = await tx.bookCopy.count({ where: { bookId, status: "AVAILABLE" } });
      const total = await tx.bookCopy.count({ where: { bookId } });
      const derived =
        d.status !== "AVAILABLE" ? d.status : total === 0 || free > 0 ? "AVAILABLE" : "BORROWED";
      await tx.book.update({ where: { id: bookId }, data: { status: derived } });
    });
  } catch (e) {
    // Surface a unique-constraint race as a form error, not a 500 page.
    return { error: e instanceof Error ? e.message : "Could not save that book." };
  }

  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------ Book delete */

export async function deleteBookAction(formData: FormData): Promise<void> {
  const user = await requireRole("LIBRARIAN", "ADMIN");
  if (!can(user.role, "inventory:manage")) return;

  const list = "/admin/books";
  const bookId = String(formData.get("bookId") ?? "");
  if (!bookId) redirect(withNotice(list, "err", "Missing book reference."));

  // Refuse while any copy is out on loan - deleting would orphan live loans.
  const busy = await db.loan.count({
    where: { bookId, status: { in: ["PENDING", "APPROVED", "ACTIVE", "OVERDUE"] } },
  });
  if (busy > 0) {
    redirect(
      withNotice(list, "err", "This title still has open loans. Close them before deleting it."),
    );
  }

  await db.book.delete({ where: { id: bookId } }).catch(() => {});
  refresh();
  redirect(withNotice(list, "ok", "bookRemoved"));
}

/* ------------------------------------------------- Authors and genres */

export async function createGenreAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireRole("LIBRARIAN", "ADMIN");
  if (!can(user.role, "inventory:manage")) return { error: "Not permitted." };

  const parsed = genreSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "Genre name is required." };

  const name = parsed.data.name;
  const slug = slugify(name);
  if (await db.genre.findFirst({ where: { OR: [{ name }, { slug }] } })) {
    return { error: "That genre already exists." };
  }

  await db.genre.create({ data: { name, slug } });
  refresh();
  return { ok: true };
}

export async function createAuthorAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireRole("LIBRARIAN", "ADMIN");
  if (!can(user.role, "inventory:manage")) return { error: "Not permitted." };

  const parsed = authorSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) return { error: "Author name is required." };

  const name = parsed.data.name;
  const slug = slugify(name);
  if (await db.author.findUnique({ where: { slug } })) {
    return { error: "That author already exists." };
  }

  await db.author.create({
    data: { name, slug, bio: parsed.data.bio || null },
  });
  refresh();
  return { ok: true };
}

/* -------------------------------------------------------- Announcements */

export async function saveAnnouncementAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await requireRole("LIBRARIAN", "ADMIN");
  if (!can(user.role, "announcement:manage")) return { error: "Not permitted." };

  const id = String(formData.get("id") ?? "");
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt") ?? "",
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
    published: formData.get("published") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  const d = parsed.data;
  const data = {
    title: d.title,
    excerpt: d.excerpt || null,
    body: d.body,
    pinned: !!d.pinned,
    publishedAt: d.published ? new Date() : null,
  };

  if (id) {
    await db.announcement.update({ where: { id }, data });
  } else {
    const slug = slugify(d.title);
    await db.announcement.create({ data: { ...data, slug } });
  }

  refresh();
  redirect("/admin/announcements?ok=announcementSaved");
}

export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  const user = await requireRole("LIBRARIAN", "ADMIN");
  if (!can(user.role, "announcement:manage")) return;

  const list = "/admin/announcements";
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(withNotice(list, "err", "Missing announcement reference."));

  await db.announcement.delete({ where: { id } }).catch(() => {});
  refresh();
  redirect(withNotice(list, "ok", "announcementRemoved"));
}
