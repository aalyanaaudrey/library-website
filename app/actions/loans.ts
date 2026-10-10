"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { borrowRequestSchema, renewalSchema, reviewSchema, flattenErrors } from "@/lib/validators";
import {
  createLoanRequest,
  approveLoan,
  rejectLoan,
  markHandedOut,
  recordReturn,
  renewLoan,
  cancelLoan,
} from "@/lib/services/loan.service";
import { settleFine } from "@/lib/services/fine.service";
import { safeReturnTo, withNotice } from "@/lib/utils";

export type LoanActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirect?: string;
};

function refresh() {
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------- Member: request */

export async function requestLoanAction(
  _prev: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const user = await requireUser();

  const parsed = borrowRequestSchema.safeParse({
    bookId: formData.get("bookId"),
    type: formData.get("type"),
    periodWeeks: formData.get("periodWeeks"),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  if (!can(user.role, "loan:request")) {
    return { error: "Your account cannot request loans." };
  }

  const result = await createLoanRequest(user.id, parsed.data);
  if (!result.ok) return { error: result.error };

  redirect("/account/borrowings?tab=pending&ok=requested");
}

/* --------------------------------------------------------- Member: renew */

export async function renewLoanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = renewalSchema.safeParse({ loanId: formData.get("loanId") });
  if (!parsed.success) return;

  const back = safeReturnTo(formData.get("returnTo"), "/account/borrowings?tab=current");

  const result = await renewLoan(parsed.data.loanId, user.id, user.role);
  if (!result.ok) redirect(withNotice(back, "err", result.error));
  redirect(withNotice(back, "ok", "renewed"));
}

export async function cancelLoanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const loanId = String(formData.get("loanId") ?? "");
  const back = safeReturnTo(formData.get("returnTo"), "/account/borrowings?tab=pending");
  if (!loanId) return;

  const result = await cancelLoan(loanId, user.id);
  if (!result.ok) redirect(withNotice(back, "err", result.error));
  redirect(withNotice(back, "ok", "cancelled"));
}

/* ------------------------------------------------- Staff: manage requests */

export async function approveLoanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "loan:approve")) return;

  const loanId = String(formData.get("loanId") ?? "");
  const queue = "/admin/requests?status=PENDING";
  if (!loanId) redirect(withNotice(queue, "err", "Missing request reference."));

  const result = await approveLoan(loanId, user.id);
  // On success follow the loan to where it now lives: the collection queue.
  if (!result.ok) redirect(withNotice(queue, "err", result.error));
  redirect("/admin/loans?status=APPROVED&ok=approved");
}

export async function rejectLoanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "loan:approve")) return;

  const loanId = String(formData.get("loanId") ?? "");
  const queue = "/admin/requests?status=PENDING";
  if (!loanId) redirect(withNotice(queue, "err", "Missing request reference."));

  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  const result = await rejectLoan(loanId, user.id, reason);
  // Stay in the pending queue so the admin can keep working through it.
  if (!result.ok) redirect(withNotice(queue, "err", result.error));
  redirect(withNotice(queue, "ok", "rejected"));
}

export async function handOutLoanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "loan:return")) return;

  const loanId = String(formData.get("loanId") ?? "");
  const ready = "/admin/loans?status=APPROVED";
  if (!loanId) redirect(withNotice(ready, "err", "Missing loan reference."));

  const result = await markHandedOut(loanId, user.id);
  if (!result.ok) redirect(withNotice(ready, "err", result.error));
  redirect("/admin/loans?status=ACTIVE&ok=collected");
}

export async function returnLoanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "loan:return")) return;

  const loanId = String(formData.get("loanId") ?? "");
  const view = "/admin/loans?status=ACTIVE";
  if (!loanId) redirect(withNotice(view, "err", "Missing loan reference."));

  const condition = (String(formData.get("condition") ?? "OK") || "OK") as
    | "OK"
    | "DAMAGED"
    | "LOST";

  const result = await recordReturn(loanId, user.id, condition);
  if (!result.ok) redirect(withNotice(view, "err", result.error));
  redirect("/admin/loans?status=RETURNED&ok=returned");
}

export async function settleFineAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const fineId = String(formData.get("fineId") ?? "");
  const action = String(formData.get("action") ?? "");
  const back = safeReturnTo(
    formData.get("returnTo"),
    can(user.role, "fine:waive") ? "/admin/fines" : "/account/fines",
  );
  if (!fineId) redirect(withNotice(back, "err", "Missing charge reference."));

  // `settleFine` throws on an invalid transition, and `redirect` must never be
  // inside a try/catch (Next.js uses the throw to signal navigation), so the
  // outcome is captured first and the redirect happens outside the block.
  let failure: string | null = null;

  // Paying your OWN fine only needs the `:own` capability.
  if (action === "PAID" && can(user.role, "fine:own:pay")) {
    const fine = await db.fine.findUnique({ where: { id: fineId } });
    if (!fine || fine.userId !== user.id) {
      redirect(withNotice(back, "err", "That charge does not belong to you."));
    }
    try {
      await settleFine(fineId, "PAID", user.id);
    } catch (e) {
      failure = e instanceof Error ? e.message : "Could not settle that charge.";
    }
    if (failure) redirect(withNotice(back, "err", failure));
    redirect(withNotice(back, "ok", "fineSettled"));
  }

  // Waiving is staff-only.
  if (action === "WAIVED" && can(user.role, "fine:waive")) {
    try {
      await settleFine(fineId, "WAIVED", user.id);
    } catch (e) {
      failure = e instanceof Error ? e.message : "Could not waive that charge.";
    }
    if (failure) redirect(withNotice(back, "err", failure));
    redirect(withNotice(back, "ok", "fineSettled"));
  }

  redirect(withNotice(back, "err", "You are not allowed to settle that charge."));
}

/* -------------------------------------------------------------- Reviews */

export async function submitReviewAction(
  _prev: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse({
    bookId: formData.get("bookId"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  if (!can(user.role, "review:write")) {
    return { error: "Your account cannot post reviews." };
  }

  await db.review.upsert({
    where: { userId_bookId: { userId: user.id, bookId: parsed.data.bookId } },
    update: {
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
    },
    create: {
      userId: user.id,
      bookId: parsed.data.bookId,
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
    },
  });

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------- Admin: members */

export async function toggleMemberAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user.role, "member:manage")) return;

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === user.id) return;

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return;

  await db.user.update({
    where: { id: userId },
    data: { isActive: !target.isActive },
  });

  if (target.isActive) {
    // Was active and is now suspended: kill any live sessions immediately.
    await db.session.deleteMany({ where: { userId } });
  }

  refresh();
}
