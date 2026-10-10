import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { Notice } from "@/components/notice";
import { renewLoanAction, cancelLoanAction } from "@/app/actions/loans";
import { RULES } from "@/lib/constants";
import { formatDate, formatMoney, daysOverdue, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My borrowings" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const TABS = [
  { key: "current", label: "Current" },
  { key: "pending", label: "Pending" },
  { key: "history", label: "History" },
] as const;

export default async function BorrowingsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const tab = (first(sp.tab) ?? "current") as (typeof TABS)[number]["key"];

  const user = await requireUser();

  const where = {
    userId: user.id,
    ...(tab === "current"
      ? { status: { in: ["APPROVED", "ACTIVE", "OVERDUE"] } }
      : tab === "pending"
        ? { status: { in: ["PENDING"] } }
        : { status: { in: ["RETURNED", "REJECTED", "CANCELLED"] } }),
  };

  const loans = await db.loan.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    include: {
      book: { select: { title: true, slug: true, coverUrl: true } },
      events: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">My borrowings</h2>
          <p className="mt-1 text-sm text-ink-3">
            Track requests, renew active loans and review your history.
          </p>
        </div>
        <Link href="/books" className="btn-primary">
          Find something new
        </Link>
      </div>

      <Notice ok={first(sp.ok)} err={first(sp.err)} className="mb-6" />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-line bg-paper-2 p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/account/borrowings?tab=${t.key}`}
            className={
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition " +
              (tab === t.key ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {loans.length === 0 ? (
        <EmptyState
          title={
            tab === "history" ? "No borrowing history yet" : tab === "pending" ? "No pending requests" : "Nothing on loan"
          }
          description={
            tab === "current"
              ? "Books you have requested and are using will show up here."
              : "Once you have borrowed something, it will appear in your history."
          }
          action={{ href: "/books", label: "Browse catalogue" }}
        />
      ) : (
        <ul className="space-y-4">
          {loans.map((loan) => {
            const overdueBy = daysOverdue(loan.dueAt);
            const canRenew =
              loan.status === "ACTIVE" && loan.renewalsUsed < RULES.maxRenewals && overdueBy === 0;
            const canCancel = ["PENDING", "APPROVED"].includes(loan.status);
            // Send the member back to the tab they acted from, so the
            // confirmation banner lands where they are still looking.
            const back = `/account/borrowings?tab=${tab}`;

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
                      {loan.type === "RENTAL" && <Badge status="RENTAL" />}
                    </div>

                    <p className="mt-1.5 text-sm text-ink-3">
                      Requested {formatDate(loan.requestedAt)} · {loan.periodWeeks}{" "}
                      {loan.periodWeeks === 1 ? "week" : "weeks"}
                      {loan.feeCents > 0 && <> · Fee {formatMoney(loan.feeCents)}</>}
                    </p>

                    {/* Timeline */}
                    <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                      <Step label="Requested" done />
                      <Step label="Approved" done={!!loan.approvedAt} />
                      <Step label="Collected" done={!!loan.startedAt} />
                      <Step label="Returned" done={!!loan.returnedAt} />
                    </ol>
                  </div>

                  {(canRenew || canCancel) && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {canCancel && (
                        <form action={cancelLoanAction}>
                          <input type="hidden" name="loanId" value={loan.id} />
                          <input type="hidden" name="returnTo" value={back} />
                          <button type="submit" className="btn-secondary">
                            Cancel request
                          </button>
                        </form>
                      )}
                      {canRenew && (
                        <form action={renewLoanAction}>
                          <input type="hidden" name="loanId" value={loan.id} />
                          <input type="hidden" name="returnTo" value={back} />
                          <button type="submit" className="btn-primary">
                            Renew loan
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Due / meta strip */}
                {(loan.dueAt || loan.returnedAt) && (
                  <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
                    <Meta
                      label={loan.returnedAt ? "Returned" : "Due date"}
                      value={
                        loan.returnedAt
                          ? formatDate(loan.returnedAt)
                          : formatDate(loan.dueAt)
                      }
                      tone={overdueBy > 0 && !loan.returnedAt ? "bad" : "default"}
                    />
                    <Meta
                      label="Status detail"
                      value={
                        loan.returnedAt
                          ? "Completed"
                          : overdueBy > 0
                            ? `${overdueBy} ${overdueBy === 1 ? "day" : "days"} overdue`
                            : loan.dueAt
                              ? `${relativeTime(loan.dueAt)}`
                              : "Awaiting approval"
                      }
                      tone={overdueBy > 0 && !loan.returnedAt ? "bad" : "default"}
                    />
                    <Meta
                      label="Renewals"
                      value={`${loan.renewalsUsed} of ${RULES.maxRenewals} used`}
                    />
                  </div>
                )}

                {overdueBy > 0 && !loan.returnedAt && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    This item is overdue. A daily charge applies until it is returned.
                  </p>
                )}

                {loan.events[0] && (
                  <p className="mt-3 text-xs text-ink-3">
                    Last update: {loan.events[0].note ?? loan.events[0].to} ·{" "}
                    {relativeTime(loan.events[0].createdAt)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Step({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className={
          "flex h-4 w-4 items-center justify-center rounded-full text-[9px] " +
          (done ? "bg-forest text-white" : "bg-paper-3 text-ink-3")
        }
      >
        {done ? "✓" : ""}
      </span>
      <span className={done ? "font-medium text-ink-2" : ""}>{label}</span>
    </li>
  );
}

function Meta({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "bad";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-3">{label}</p>
      <p className={"mt-0.5 font-medium " + (tone === "bad" ? "text-red-600" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}
