import "server-only";
import { db } from "@/lib/db";

/** Total unpaid fine balance in cents. Blocks borrowing when > 0. */
export async function getOutstandingBalanceCents(userId: string): Promise<number> {
  const agg = await db.fine.aggregate({
    where: { userId, status: "UNPAID" },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

export async function hasOutstandingBalance(userId: string): Promise<boolean> {
  return (await getOutstandingBalanceCents(userId)) > 0;
}

export async function listUserFines(userId: string) {
  return db.fine.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      loan: { include: { book: { select: { title: true, slug: true } } } },
    },
  });
}

/** Open a fine. Idempotent per (loanId, reason) so the nightly sweep cannot double-charge. */
export async function openFine(params: {
  userId: string;
  loanId?: string;
  amountCents: number;
  reason: "OVERDUE" | "DAMAGED" | "LOST" | "RENTAL";
  note?: string;
}) {
  if (params.amountCents <= 0) return null;

  if (params.loanId) {
    const existing = await db.fine.findFirst({
      where: { loanId: params.loanId, reason: params.reason, status: "UNPAID" },
    });
    if (existing) return existing;
  }

  return db.fine.create({
    data: {
      userId: params.userId,
      loanId: params.loanId,
      amountCents: params.amountCents,
      reason: params.reason,
      note: params.note,
    },
  });
}

/** Staff action: mark a fine paid or waived. */
export async function settleFine(
  fineId: string,
  action: "PAID" | "WAIVED",
  actorId: string,
) {
  const fine = await db.fine.findUnique({ where: { id: fineId } });
  if (!fine) throw new Error("Fine not found");
  if (fine.status !== "UNPAID") throw new Error("Only unpaid fines can be settled");

  return db.fine.update({
    where: { id: fineId },
    data: { status: action, paidAt: new Date(), note: `${action} by ${actorId}` },
  });
}

export async function listAllUnpaidFines() {
  return db.fine.findMany({
    where: { status: "UNPAID" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, memberNo: true } },
      loan: { include: { book: { select: { title: true } } } },
    },
  });
}
