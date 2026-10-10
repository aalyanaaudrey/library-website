import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOutstandingBalanceCents } from "@/lib/services/fine.service";
import { countActiveLoans } from "@/lib/services/loan.service";
import { RULES } from "@/lib/constants";
import { StatCard, Badge, EmptyState } from "@/components/ui";
import { Notice } from "@/components/notice";
import { formatDate, formatMoney, daysOverdue, relativeTime, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AccountOverviewPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const [balance, activeCount, upcoming, recentNotifs, historyCount] = await Promise.all([
    getOutstandingBalanceCents(user.id),
    countActiveLoans(user.id),
    db.loan.findMany({
      where: { userId: user.id, status: { in: ["APPROVED", "ACTIVE", "OVERDUE"] } },
      orderBy: { dueAt: "asc" },
      take: 4,
      include: { book: { select: { title: true, slug: true, coverUrl: true } } },
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.loan.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-8">
      <Notice ok={first(sp.ok)} err={first(sp.err)} />

      {/* Greeting */}
      <section>
        <h2 className="font-display text-2xl font-semibold">
          Hello, {user.name.split(" ")[0]}
        </h2>
        <p className="mt-1 text-[15px] text-ink-3">
          {upcoming.length === 0
            ? "You have nothing on loan right now. Why not browse the catalogue?"
            : `You have ${upcoming.length} ${upcoming.length === 1 ? "item" : "items"} to keep an eye on.`}
        </p>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active loans"
          value={activeCount}
          hint={`Limit ${RULES.maxActiveLoans}`}
          tone={activeCount >= RULES.maxActiveLoans ? "warn" : "default"}
        />
        <StatCard
          label="Outstanding balance"
          value={formatMoney(balance)}
          hint={balance > 0 ? "Settle to resume borrowing" : "All clear"}
          tone={balance > 0 ? "bad" : "good"}
        />
        <StatCard
          label="Total borrowings"
          value={historyCount}
          hint="All time"
        />
      </section>

      {/* Upcoming */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Current loans</h3>
          <Link href="/account/borrowings" className="text-sm font-semibold text-forest-3 hover:underline">
            View all →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing on loan"
            description="Browse the catalogue to find your next read."
            action={{ href: "/books", label: "Browse catalogue" }}
          />
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {upcoming.map((loan) => {
              const overdueBy = daysOverdue(loan.dueAt);
              return (
                <li key={loan.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/books/${loan.book.slug}`}
                        className="font-display text-base font-semibold hover:text-forest-3"
                      >
                        {loan.book.title}
                      </Link>
                      <Badge status={loan.status} />
                      {loan.type === "RENTAL" && <Badge status="RENTAL" />}
                    </div>
                    <p className="mt-1 text-sm text-ink-3">
                      {loan.dueAt ? (
                        overdueBy > 0 ? (
                          <span className="font-medium text-red-600">
                            Overdue by {overdueBy} {overdueBy === 1 ? "day" : "days"} · due{" "}
                            {formatDate(loan.dueAt)}
                          </span>
                        ) : (
                          <>Due {formatDate(loan.dueAt)} · {relativeTime(loan.dueAt)}</>
                        )
                      ) : (
                        <>Awaiting approval</>
                      )}
                    </p>
                  </div>

                  {loan.status === "APPROVED" && (
                    <Link href="/account/borrowings" className="btn-secondary">
                      Collect book
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Notifications */}
      <section>
        <h3 className="mb-4 font-display text-lg font-semibold">Recent activity</h3>
        {recentNotifs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            Nothing yet. Updates about approvals, due dates and overdue items will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentNotifs.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-lg border p-4",
                  n.read ? "border-line bg-white" : "border-forest/20 bg-forest-soft/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="mt-0.5 text-sm text-ink-3">{n.body}</p>
                  </div>
                  <time className="shrink-0 text-xs text-ink-3">{relativeTime(n.createdAt)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
