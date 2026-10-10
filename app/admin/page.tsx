import Link from "next/link";
import { db } from "@/lib/db";
import { StatCard, Badge } from "@/components/ui";
import { Notice } from "@/components/notice";
import { runOverdueSweepAction } from "@/app/actions/admin";
import { formatMoney, formatDate, relativeTime, daysOverdue } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const now = new Date();

  const [
    totalBooks,
    totalCopies,
    freeCopies,
    pendingCount,
    activeCount,
    overdueCount,
    memberCount,
    unpaidAgg,
    feesAgg,
    recentRequests,
    overdueLoans,
    popular,
    monthLoans,
  ] = await Promise.all([
    db.book.count({ where: { status: { not: "RETIRED" } } }),
    db.bookCopy.count(),
    db.bookCopy.count({ where: { status: "AVAILABLE" } }),
    db.loan.count({ where: { status: "PENDING" } }),
    db.loan.count({ where: { status: { in: ["ACTIVE", "APPROVED"] } } }),
    db.loan.count({ where: { status: "OVERDUE" } }),
    db.user.count({ where: { role: "MEMBER" } }),
    db.fine.aggregate({ where: { status: "UNPAID" }, _sum: { amountCents: true } }),
    db.fine.aggregate({ where: { status: { in: ["PAID", "WAIVED"] } }, _sum: { amountCents: true } }),
    db.loan.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      take: 6,
      include: {
        user: { select: { name: true, memberNo: true } },
        book: { select: { title: true, slug: true } },
      },
    }),
    db.loan.findMany({
      where: { status: { in: ["OVERDUE", "ACTIVE"] }, dueAt: { lt: now } },
      orderBy: { dueAt: "asc" },
      take: 6,
      include: {
        user: { select: { name: true, memberNo: true } },
        book: { select: { title: true, slug: true } },
      },
    }),
    db.loan.groupBy({
      by: ["bookId"],
      _count: { _all: true },
      orderBy: { _count: { bookId: "desc" } },
      take: 5,
    }),
    db.loan.count({
      where: { requestedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
    }),
  ]);

  const popularBooks = await db.book.findMany({
    where: { id: { in: popular.map((p) => p.bookId) } },
    select: { id: true, title: true, slug: true },
  });
  const popularMap = new Map(popularBooks.map((b) => [b.id, b]));

  const unpaidTotal = unpaidAgg._sum.amountCents ?? 0;
  const collectedTotal = feesAgg._sum.amountCents ?? 0;

  return (
    <div className="space-y-8">
      <Notice ok={first(sp.ok)} err={first(sp.err)} />

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Titles in collection" value={totalBooks} hint={`${totalCopies} physical copies`} />
        <StatCard
          label="Copies free now"
          value={freeCopies}
          hint={`${totalCopies - freeCopies} out on loan`}
          tone="good"
        />
        <StatCard label="Active loans" value={activeCount} hint={`${monthLoans} requests in last 30 days`} />
        <StatCard
          label="Overdue"
          value={overdueCount}
          hint={overdueCount ? "Needs chasing" : "All returned on time"}
          tone={overdueCount ? "bad" : "good"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending requests" value={pendingCount} hint={pendingCount ? "Awaiting review" : "Queue empty"} tone={pendingCount ? "warn" : "default"} />
        <StatCard label="Members" value={memberCount} hint="Registered borrowers" />
        <StatCard label="Unpaid fines" value={formatMoney(unpaidTotal)} tone={unpaidTotal ? "bad" : "good"} />
        <StatCard label="Fines collected" value={formatMoney(collectedTotal)} tone="good" />
      </section>

      {/* Sweep */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Overdue sweep</h2>
          <p className="mt-1 text-sm text-ink-3">
            Flips active loans past their due date to overdue, opens the daily charges and
            notifies the borrower. Normally runs nightly — run it manually to test.
          </p>
        </div>
        <form action={runOverdueSweepAction}>
          <button type="submit" className="btn-secondary">
            Run sweep now
          </button>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending requests */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Requests awaiting review</h2>
            {pendingCount > 0 && (
              <Link href="/admin/requests" className="text-sm font-semibold text-forest-3 hover:underline">
                Review all →
              </Link>
            )}
          </div>

          {recentRequests.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-ink-3">
              No requests waiting. Nice.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {recentRequests.map((loan) => (
                <li key={loan.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link href={`/books/${loan.book.slug}`} className="block truncate font-medium hover:text-forest-3">
                      {loan.book.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {loan.user.name} · {loan.user.memberNo} · {relativeTime(loan.requestedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge status={loan.type} />
                    <Link href="/admin/requests" className="btn-secondary px-3 py-1.5 text-xs">
                      Review
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Overdue */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Overdue items</h2>
            <Link href="/admin/loans" className="text-sm font-semibold text-forest-3 hover:underline">
              Manage loans →
            </Link>
          </div>

          {overdueLoans.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-ink-3">
              Nothing overdue right now.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {overdueLoans.map((loan) => {
                const late = daysOverdue(loan.dueAt);
                return (
                  <li key={loan.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <Link href={`/books/${loan.book.slug}`} className="block truncate font-medium hover:text-forest-3">
                        {loan.book.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-3">
                        {loan.user.name} · due {formatDate(loan.dueAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-red-600">
                      {late > 0 ? `${late}d late` : "Due today"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Popular */}
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Most borrowed</h2>
        {popular.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-ink-3">
            No borrowing recorded yet.
          </p>
        ) : (
          <ol className="card divide-y divide-line">
            {popular.map((p, i) => {
              const book = popularMap.get(p.bookId);
              return (
                <li key={p.bookId} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-2 font-display text-sm font-semibold text-ink-2">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-medium">
                    {book ? (
                      <Link href={`/books/${book.slug}`} className="hover:text-forest-3">
                        {book.title}
                      </Link>
                    ) : (
                      <span className="text-ink-3">Removed title</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-ink-3">
                    {p._count._all} {p._count._all === 1 ? "loan" : "loans"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
