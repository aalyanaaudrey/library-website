import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { Notice } from "@/components/notice";
import { approveLoanAction, rejectLoanAction } from "@/app/actions/loans";
import { formatMoney, relativeTime, addWeeks } from "@/lib/utils";

export const metadata: Metadata = { title: "Requests" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = first(sp.status) ?? "PENDING";

  const where =
    filter === "all"
      ? { status: { in: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] } }
      : { status: filter };

  const loans = await db.loan.findMany({
    where,
    orderBy: { requestedAt: filter === "PENDING" ? "asc" : "desc" },
    take: 60,
    include: {
      user: { select: { name: true, memberNo: true, email: true } },
      book: { select: { title: true, slug: true, coverUrl: true, rentalFeeCents: true } },
    },
  });

  const counts = await db.loan.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.status, c._count._all]));

  const tabs = [
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">Borrowing requests</h2>
        <p className="mt-1 text-sm text-ink-3">
          Approve or decline member requests. Approving assigns a free copy and sets the due date.
        </p>
      </div>

      <Notice ok={first(sp.ok)} err={first(sp.err)} className="mb-6" />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-line bg-paper-2 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/requests?status=${t.key}`}
            className={
              "flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition " +
              (filter === t.key ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink")
            }
          >
            {t.label}
            {countMap.get(t.key) ? (
              <span className="rounded-full bg-paper-3 px-1.5 text-[11px] text-ink-2">
                {countMap.get(t.key)}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {loans.length === 0 ? (
        <EmptyState
          title={filter === "PENDING" ? "No requests waiting" : "Nothing to show"}
          description={
            filter === "PENDING"
              ? "New borrowing requests will appear here for review."
              : "Try a different filter."
          }
        />
      ) : (
        <ul className="space-y-4">
          {loans.map((loan) => {
            const isPending = loan.status === "PENDING";
            const fee = loan.type === "RENTAL" ? (loan.book.rentalFeeCents ?? 0) : loan.feeCents;
            const projectedDue = addWeeks(new Date(), loan.periodWeeks);

            return (
              <li key={loan.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/books/${loan.book.slug}`}
                        className="font-display text-lg font-semibold hover:text-forest-3"
                      >
                        {loan.book.title}
                      </Link>
                      <Badge status={loan.status} />
                      <Badge status={loan.type} />
                    </div>

                    <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-ink-3">Member</dt>
                        <dd className="font-medium">{loan.user.name}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-3">Membership</dt>
                        <dd className="font-medium">{loan.user.memberNo}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-3">Requested</dt>
                        <dd>{relativeTime(loan.requestedAt)}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-3">Period</dt>
                        <dd>{loan.periodWeeks} {loan.periodWeeks === 1 ? "week" : "weeks"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-3">Fee</dt>
                        <dd className="font-medium">{formatMoney(fee)}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-3">Due if approved</dt>
                        <dd>{projectedDue.toLocaleDateString()}</dd>
                      </div>
                    </dl>
                  </div>

                  {isPending ? (
                    <div className="flex shrink-0 flex-col gap-2">
                      <form action={approveLoanAction}>
                        <input type="hidden" name="loanId" value={loan.id} />
                        <button type="submit" className="btn-primary w-full">
                          Approve
                        </button>
                      </form>
                      <form action={rejectLoanAction}>
                        <input type="hidden" name="loanId" value={loan.id} />
                        <input type="hidden" name="reason" value="No reason given" />
                        <button type="submit" className="btn-secondary w-full">
                          Decline
                        </button>
                      </form>
                      <Link
                        href={`mailto:${loan.user.email}`}
                        className="btn-ghost w-full text-center text-xs"
                      >
                        Contact member
                      </Link>
                    </div>
                  ) : (
                    <div className="shrink-0 text-right text-xs text-ink-3">
                      {loan.approvedAt && <p>Approved {relativeTime(loan.approvedAt)}</p>}
                      {loan.dueAt && <p>Due {loan.dueAt.toLocaleDateString()}</p>}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
