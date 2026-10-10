import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { Notice } from "@/components/notice";
import {
  handOutLoanAction,
  returnLoanAction,
  renewLoanAction,
} from "@/app/actions/loans";
import { formatDate, daysOverdue, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Active loans" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminLoansPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = (first(sp.status) ?? "ACTIVE") as string;

  const where =
    filter === "all"
      ? { status: { in: ["APPROVED", "ACTIVE", "OVERDUE", "RETURNED"] } }
      : { status: filter };

  const loans = await db.loan.findMany({
    where,
    orderBy: filter === "RETURNED" ? { returnedAt: "desc" } : { dueAt: "asc" },
    take: 60,
    include: {
      user: { select: { name: true, memberNo: true, email: true, phone: true } },
      book: { select: { title: true, slug: true } },
      copy: { select: { barcode: true } },
      fines: { where: { status: "UNPAID" }, select: { amountCents: true } },
    },
  });

  const tabs = [
    { key: "APPROVED", label: "Ready to collect" },
    { key: "ACTIVE", label: "On loan" },
    { key: "OVERDUE", label: "Overdue" },
    { key: "RETURNED", label: "Returned" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">Loans &amp; returns</h2>
        <p className="mt-1 text-sm text-ink-3">
          Record collections and returns. Returns calculate any overdue charge automatically.
        </p>
      </div>

      <Notice ok={first(sp.ok)} err={first(sp.err)} className="mb-6" />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-line bg-paper-2 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/loans?status=${t.key}`}
            className={
              "flex shrink-0 rounded-md px-3.5 py-2 text-sm font-medium transition " +
              (filter === t.key ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {loans.length === 0 ? (
        <EmptyState title="Nothing to show" description="Try a different filter." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Member</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const late = daysOverdue(loan.dueAt);
                  const unpaid = loan.fines.reduce((a, f) => a + f.amountCents, 0);
                  const back = `/admin/loans?status=${filter}`;

                  return (
                    <tr key={loan.id}>
                      <td>
                        <Link
                          href={`/books/${loan.book.slug}`}
                          className="font-medium hover:text-forest-3"
                        >
                          {loan.book.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-3">
                          {loan.type === "RENTAL" ? "Rental" : "Borrow"} · {loan.periodWeeks}w
                          {loan.copy && <> · {loan.copy.barcode}</>}
                        </p>
                      </td>

                      <td>
                        <p className="font-medium">{loan.user.name}</p>
                        <p className="text-xs text-ink-3">{loan.user.memberNo}</p>
                      </td>

                      <td>
                        <Badge status={loan.status} />
                        {unpaid > 0 && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            Unpaid fine
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap">
                        {loan.dueAt ? (
                          <>
                            <p className={late > 0 ? "font-semibold text-red-600" : ""}>
                              {formatDate(loan.dueAt)}
                            </p>
                            <p className="text-xs text-ink-3">
                              {loan.returnedAt
                                ? `returned ${relativeTime(loan.returnedAt)}`
                                : late > 0
                                  ? `${late}d overdue`
                                  : relativeTime(loan.dueAt)}
                            </p>
                          </>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>

                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          {loan.status === "APPROVED" && (
                            <form action={handOutLoanAction}>
                              <input type="hidden" name="loanId" value={loan.id} />
                              <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
                                Mark collected
                              </button>
                            </form>
                          )}

                          {loan.status === "ACTIVE" && (
                            <form action={renewLoanAction}>
                              <input type="hidden" name="loanId" value={loan.id} />
                              <input type="hidden" name="returnTo" value={back} />
                              <button type="submit" className="btn-secondary px-3 py-1.5 text-xs">
                                Renew
                              </button>
                            </form>
                          )}

                          {["ACTIVE", "OVERDUE"].includes(loan.status) && (
                            <ReturnControl loanId={loan.id} />
                          )}

                          {loan.status === "RETURNED" && (
                            <span className="text-xs text-ink-3">Completed</span>
                          )}
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
        Marking a return as damaged adds a $10 repair charge; lost adds a $25 replacement
        charge and retires the copy. Overdue charges are calculated from the due date.
      </p>
    </div>
  );
}

/** Returns need a condition, so it is a small select+submit rather than a bare button. */
function ReturnControl({ loanId }: { loanId: string }) {
  return (
    <form action={returnLoanAction} className="flex items-center gap-1.5">
      <input type="hidden" name="loanId" value={loanId} />
      <label className="sr-only" htmlFor={`condition-${loanId}`}>
        Condition on return
      </label>
      <select
        id={`condition-${loanId}`}
        name="condition"
        defaultValue="OK"
        className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs"
      >
        <option value="OK">Good</option>
        <option value="DAMAGED">Damaged</option>
        <option value="LOST">Lost</option>
      </select>
      <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
        Return
      </button>
    </form>
  );
}
