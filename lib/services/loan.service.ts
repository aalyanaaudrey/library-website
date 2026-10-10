import "server-only";
import { db } from "@/lib/db";
import { RULES } from "@/lib/constants";
import type { LoanType, Role } from "@/lib/constants";
import { can } from "@/lib/rbac";
import { getOutstandingBalanceCents, openFine } from "@/lib/services/fine.service";
import { addWeeks } from "@/lib/utils";

/** Result type so callers get a typed reason instead of an exception. */
export type LoanResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: LoanErrorCode };

export type LoanErrorCode =
  | "BOOK_NOT_FOUND"
  | "BOOK_UNAVAILABLE"
  | "NO_COPIES"
  | "UNPAID_BALANCE"
  | "LOAN_LIMIT"
  | "TOO_MANY_ACTIVE"
  | "ALREADY_BORROWED"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "RENEWAL_LIMIT"
  | "FORBIDDEN";

const fail = <T>(error: string, code: LoanErrorCode): LoanResult<T> => ({
  ok: false,
  error,
  code,
});
const ok = <T>(data: T): LoanResult<T> => ({ ok: true, data });

async function logEvent(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  loanId: string,
  from: string | null,
  to: string,
  actorId: string | null,
  note?: string,
) {
  await tx.loanEvent.create({ data: { loanId, from, to, actorId, note } });
}

async function notify(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  userId: string,
  title: string,
  body: string,
  href?: string,
) {
  await tx.notification.create({ data: { userId, title, body, href } });
}

/** Recompute Book.status from its copies. Keeps the catalog badge truthful. */
async function refreshBookStatus(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  bookId: string,
) {
  const available = await tx.bookCopy.count({
    where: { bookId, status: "AVAILABLE" },
  });
  const total = await tx.bookCopy.count({ where: { bookId } });

  const status = total === 0 || available > 0 ? "AVAILABLE" : "BORROWED";
  await tx.book.update({ where: { id: bookId }, data: { status } });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function countActiveLoans(userId: string): Promise<number> {
  return db.loan.count({
    where: { userId, status: { in: ["APPROVED", "ACTIVE", "OVERDUE"] } },
  });
}

export async function hasActiveLoanForBook(userId: string, bookId: string) {
  return db.loan.findFirst({
    where: { userId, bookId, status: { in: ["PENDING", "APPROVED", "ACTIVE", "OVERDUE"] } },
  });
}

export async function availableCopies(bookId: string): Promise<number> {
  return db.bookCopy.count({ where: { bookId, status: "AVAILABLE" } });
}

// ---------------------------------------------------------------------------
// Create request
// ---------------------------------------------------------------------------

export async function createLoanRequest(
  userId: string,
  input: { bookId: string; type: LoanType; periodWeeks: number },
): Promise<LoanResult> {
  const book = await db.book.findUnique({
    where: { id: input.bookId },
    select: { id: true, title: true, status: true, rentalFeeCents: true, borrowFeeCents: true },
  });
  if (!book) return fail("Book not found.", "BOOK_NOT_FOUND");
  if (book.status === "RETIRED" || book.status === "MAINTENANCE")
    return fail("This book is not currently lendable.", "BOOK_UNAVAILABLE");

  // 1. Unpaid balance blocks borrowing.
  const balance = await getOutstandingBalanceCents(userId);
  if (balance > 0)
    return fail(
      `You have an outstanding balance of $${(balance / 100).toFixed(2)}. Settle it to borrow again.`,
      "UNPAID_BALANCE",
    );

  // 2. Concurrency limit.
  const active = await countActiveLoans(userId);
  if (active >= RULES.maxActiveLoans)
    return fail(
      `You already have ${active} of ${RULES.maxActiveLoans} allowed active loans.`,
      "LOAN_LIMIT",
    );

  // 3. One live request per book per member.
  const duplicate = await hasActiveLoanForBook(userId, input.bookId);
  if (duplicate)
    return fail("You already have a live request for this book.", "ALREADY_BORROWED");

  // 4. At least one free copy.
  if ((await availableCopies(input.bookId)) < 1)
    return fail("All copies are currently on loan.", "NO_COPIES");

  // 5. Rentals require a configured fee.
  const feeCents =
    input.type === "RENTAL"
      ? (book.rentalFeeCents ?? 0)
      : (book.borrowFeeCents ?? 0);
  if (input.type === "RENTAL" && !book.rentalFeeCents)
    return fail("This title is not available for rental.", "INVALID_STATE");

  const loan = await db.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        userId,
        bookId: input.bookId,
        type: input.type,
        status: "PENDING",
        periodWeeks: input.periodWeeks,
        feeCents,
      },
    });
    await logEvent(tx, created.id, null, "PENDING", userId, "Request submitted");
    return created;
  });

  return ok(loan);
}

// ---------------------------------------------------------------------------
// Staff: approve / reject / hand out / take back
// ---------------------------------------------------------------------------

export async function approveLoan(loanId: string, actorId: string): Promise<LoanResult> {
  const loan = await db.loan.findUnique({ where: { id: loanId } });
  if (!loan) return fail("Loan not found.", "NOT_FOUND");
  if (loan.status !== "PENDING")
    return fail(`Cannot approve a ${loan.status.toLowerCase()} loan.`, "INVALID_STATE");

  const copy = await db.bookCopy.findFirst({
    where: { bookId: loan.bookId, status: "AVAILABLE" },
  });
  if (!copy) return fail("No copy is free to assign.", "NO_COPIES");

  const dueAt = addWeeks(new Date(), loan.periodWeeks);

  await db.$transaction(async (tx) => {
    await tx.bookCopy.update({ where: { id: copy.id }, data: { status: "RESERVED" } });
    await tx.loan.update({
      where: { id: loanId },
      data: { status: "APPROVED", approvedAt: new Date(), dueAt, copyId: copy.id },
    });
    await logEvent(tx, loanId, "PENDING", "APPROVED", actorId, `Due ${dueAt.toISOString()}`);
    await notify(
      tx,
      loan.userId,
      "Borrowing request approved",
      `Your request was approved. Collect the book by ${dueAt.toLocaleDateString()}.`,
      "/account/borrowings",
    );
    await refreshBookStatus(tx, loan.bookId);
  });

  return ok({ dueAt, barcode: copy.barcode });
}

export async function rejectLoan(
  loanId: string,
  actorId: string,
  reason?: string,
): Promise<LoanResult> {
  const loan = await db.loan.findUnique({ where: { id: loanId } });
  if (!loan) return fail("Loan not found.", "NOT_FOUND");
  if (loan.status !== "PENDING")
    return fail(`Cannot reject a ${loan.status.toLowerCase()} loan.`, "INVALID_STATE");

  await db.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loanId },
      data: { status: "REJECTED", copyId: null },
    });
    await logEvent(tx, loanId, "PENDING", "REJECTED", actorId, reason);
    await notify(
      tx,
      loan.userId,
      "Borrowing request declined",
      reason || "Your borrowing request was declined by the library.",
      "/account/borrowings",
    );
  });

  return ok(true);
}

/** Member picks up an approved book: loan becomes ACTIVE and the clock starts. */
export async function markHandedOut(loanId: string, actorId: string): Promise<LoanResult> {
  const loan = await db.loan.findUnique({ where: { id: loanId }, include: { book: true } });
  if (!loan) return fail("Loan not found.", "NOT_FOUND");
  if (loan.status !== "APPROVED")
    return fail(`Cannot hand out a ${loan.status.toLowerCase()} loan.`, "INVALID_STATE");

  const dueAt = loan.dueAt ?? addWeeks(new Date(), loan.periodWeeks);

  await db.$transaction(async (tx) => {
    if (loan.copyId) {
      await tx.bookCopy.update({ where: { id: loan.copyId }, data: { status: "ON_LOAN" } });
    }
    await tx.loan.update({
      where: { id: loanId },
      data: { status: "ACTIVE", startedAt: new Date(), dueAt },
    });
    await logEvent(tx, loanId, "APPROVED", "ACTIVE", actorId, "Collected by member");
    await notify(
      tx,
      loan.userId,
      "Book collected",
      `"${loan.book.title}" is now on loan to you. Return by ${dueAt.toLocaleDateString()}.`,
      "/account/borrowings",
    );
    await refreshBookStatus(tx, loan.bookId);
  });

  return ok({ dueAt });
}

export async function recordReturn(
  loanId: string,
  actorId: string,
  condition: "OK" | "DAMAGED" | "LOST" = "OK",
): Promise<LoanResult> {
  const loan = await db.loan.findUnique({ where: { id: loanId } });
  if (!loan) return fail("Loan not found.", "NOT_FOUND");
  if (!["ACTIVE", "OVERDUE", "APPROVED"].includes(loan.status))
    return fail(`Cannot return a ${loan.status.toLowerCase()} loan.`, "INVALID_STATE");

  const returnedAt = new Date();
  let extraFineCents = 0;
  let extraReason: "OVERDUE" | "DAMAGED" | "LOST" | null = null;

  await db.$transaction(async (tx) => {
    // Late return -> overdue fine on the days actually late.
    if (loan.dueAt && returnedAt > loan.dueAt) {
      const daysLate = Math.max(1, Math.floor((returnedAt.getTime() - loan.dueAt.getTime()) / 86_400_000));
      const rate = loan.bookId ? await tx.book.findUnique({
        where: { id: loan.bookId },
        select: { overdueFinePerDayCents: true },
      }) : null;
      const perDay = rate?.overdueFinePerDayCents ?? RULES.defaultFinePerDayCents;
      const amount = perDay * daysLate;
      if (amount > 0) {
        extraFineCents = amount;
        extraReason = "OVERDUE";
        await openFine({
          userId: loan.userId,
          loanId: loan.id,
          amountCents: amount,
          reason: "OVERDUE",
          note: `${daysLate} day(s) late at $${(perDay / 100).toFixed(2)}/day`,
        });
      }
    }

    // Damage / loss surcharge.
    if (condition !== "OK") {
      extraReason = condition;
      await openFine({
        userId: loan.userId,
        loanId: loan.id,
        amountCents: condition === "LOST" ? 2500 : 1000,
        reason: condition,
        note: condition === "LOST" ? "Replacement charge" : "Repair charge",
      });
      if (loan.copyId) {
        await tx.bookCopy.update({
          where: { id: loan.copyId },
          data: { status: condition === "LOST" ? "LOST" : "DAMAGED" },
        });
      }
    } else if (loan.copyId) {
      await tx.bookCopy.update({ where: { id: loan.copyId }, data: { status: "AVAILABLE" } });
    }

    await tx.loan.update({
      where: { id: loanId },
      data: { status: "RETURNED", returnedAt },
    });
    await logEvent(tx, loanId, loan.status, "RETURNED", actorId, `Condition: ${condition}`);

    if (extraFineCents > 0) {
      await notify(
        tx,
        loan.userId,
        extraReason === "OVERDUE" ? "Overdue fine issued" : "Charge added to your account",
        `A charge of $${(extraFineCents / 100).toFixed(2)} has been added to your balance.`,
        "/account/fines",
      );
    } else {
      await notify(
        tx,
        loan.userId,
        "Book returned",
        "Your book was returned successfully. Thank you!",
        "/account/borrowings",
      );
    }

    if (loan.bookId) await refreshBookStatus(tx, loan.bookId);
  });

  return ok({ extraFineCents });
}

// ---------------------------------------------------------------------------
// Member: renew / cancel
// ---------------------------------------------------------------------------

export async function renewLoan(
  loanId: string,
  actorId: string,
  actorRole: Role,
): Promise<LoanResult> {
  const loan = await db.loan.findUnique({ where: { id: loanId } });
  if (!loan) return fail("Loan not found.", "NOT_FOUND");
  // The borrower renews their own loan; staff may renew on their behalf.
  if (loan.userId !== actorId && !can(actorRole, "loan:renew"))
    return fail("This is not your loan.", "FORBIDDEN");
  if (loan.status !== "ACTIVE")
    return fail("Only active loans can be renewed.", "INVALID_STATE");
  if (loan.renewalsUsed >= RULES.maxRenewals)
    return fail(`Renewal limit of ${RULES.maxRenewals} reached.`, "RENEWAL_LIMIT");

  // Renewing is blocked while the book is already overdue.
  if (loan.dueAt && new Date() > loan.dueAt)
    return fail("This loan is overdue and can no longer be renewed.", "TOO_MANY_ACTIVE");

  // Nobody else is waiting: if another pending request exists for this title,
  // refuse so the queue stays fair.
  const queued = await db.loan.count({
    where: { bookId: loan.bookId, status: { in: ["PENDING", "APPROVED"] }, NOT: { id: loanId } },
  });
  if (queued > 0) return fail("Another member is waiting for this title.", "TOO_MANY_ACTIVE");

  const base = loan.dueAt && loan.dueAt > new Date() ? loan.dueAt : new Date();
  const newDueAt = addWeeks(base, loan.periodWeeks);

  await db.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loanId },
      data: { dueAt: newDueAt, renewalsUsed: { increment: 1 } },
    });
    await logEvent(
      tx,
      loanId,
      "ACTIVE",
      "ACTIVE",
      actorId,
      `Renewed to ${newDueAt.toISOString()}`,
    );
    // The notification is for the borrower, not whoever ran the renewal.
    await notify(
      tx,
      loan.userId,
      "Loan renewed",
      `Your new return date is ${newDueAt.toLocaleDateString()}.`,
      "/account/borrowings",
    );
  });

  return ok({ dueAt: newDueAt });
}

export async function cancelLoan(loanId: string, userId: string): Promise<LoanResult> {
  const loan = await db.loan.findUnique({ where: { id: loanId } });
  if (!loan) return fail("Loan not found.", "NOT_FOUND");
  if (loan.userId !== userId) return fail("This is not your loan.", "FORBIDDEN");
  if (!["PENDING", "APPROVED"].includes(loan.status))
    return fail("Only pending or approved requests can be cancelled.", "INVALID_STATE");

  await db.$transaction(async (tx) => {
    if (loan.copyId) {
      await tx.bookCopy.update({ where: { id: loan.copyId }, data: { status: "AVAILABLE" } });
    }
    await tx.loan.update({
      where: { id: loanId },
      data: { status: "CANCELLED", copyId: null },
    });
    await logEvent(tx, loanId, loan.status, "CANCELLED", userId, "Cancelled by member");
    await refreshBookStatus(tx, loan.bookId);
  });

  return ok(true);
}

// ---------------------------------------------------------------------------
// Nightly sweep
// ---------------------------------------------------------------------------

/** Flip ACTIVE loans past their due date to OVERDUE and open fines. */
export async function sweepOverdue(): Promise<{ swept: number }> {
  const now = new Date();
  const due = await db.loan.findMany({
    where: { status: "ACTIVE", dueAt: { lt: now } },
    include: { book: { select: { overdueFinePerDayCents: true, title: true } } },
  });

  let swept = 0;
  for (const loan of due) {
    const days = Math.max(1, Math.floor((now.getTime() - loan.dueAt!.getTime()) / 86_400_000));
    const perDay = loan.book.overdueFinePerDayCents || RULES.defaultFinePerDayCents;

    await db.$transaction(async (tx) => {
      await tx.loan.update({ where: { id: loan.id }, data: { status: "OVERDUE" } });
      await logEvent(tx, loan.id, "ACTIVE", "OVERDUE", null, `${days} day(s) overdue`);
      await openFine({
        userId: loan.userId,
        loanId: loan.id,
        amountCents: perDay * days,
        reason: "OVERDUE",
        note: `${days} day(s) overdue on "${loan.book.title}"`,
      });
      await notify(
        tx,
        loan.userId,
        "Book overdue",
        `"${loan.book.title}" is ${days} day(s) overdue. Please return it as soon as possible.`,
        "/account/borrowings",
      );
    });
    swept++;
  }

  return { swept };
}
