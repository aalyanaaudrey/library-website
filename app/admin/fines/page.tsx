import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, EmptyState } from "@/components/ui";
import { Notice } from "@/components/notice";
import { settleFineAction } from "@/app/actions/loans";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Fines" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminFinesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const status = first(sp.status) ?? "UNPAID";

  const fines = await db.fine.findMany({
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, memberNo: true, email: true } },
      loan: { include: { book: { select: { title: true, slug: true } } } },
    },
  });

  const totals = await db.fine.groupBy({
    by: ["status"],
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  const map = new Map(totals.map((t) => [t.status, t]));

  const unpaidTotal = map.get("UNPAID")?._sum.amountCents ?? 0;

  const tabs = [
    { key: "UNPAID", label: "Unpaid" },
    { key: "PAID", label: "Paid" },
    { key: "WAIVED", label: "Waived" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Fines &amp; penalties</h2>
          <p className="mt-1 text-sm text-ink-3">
            Overdue charges, damage and replacement fees.
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Unpaid total
          </p>
          <p className="font-display text-xl font-semibold text-red-800">
            {formatMoney(unpaidTotal)}
          </p>
        </div>
      </div>

      <Notice ok={first(sp.ok)} err={first(sp.err)} className="mb-6" />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-line bg-paper-2 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/fines?status=${t.key}`}
            className={
              "flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition " +
              (status === t.key ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink")
            }
          >
            {t.label}
            {map.get(t.key)?._count._all ? (
              <span className="rounded-full bg-paper-3 px-1.5 text-[11px] text-ink-2">
                {map.get(t.key)!._count._all}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {fines.length === 0 ? (
        <EmptyState title="No fines in this view" description="Charges appear here when items are returned late or damaged." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Reason</th>
                  <th>Item</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((fine) => (
                  <tr key={fine.id}>
                    <td className="whitespace-nowrap text-ink-3">{formatDate(fine.createdAt)}</td>
                    <td>
                      <p className="font-medium">{fine.user.name}</p>
                      <p className="text-xs text-ink-3">{fine.user.memberNo}</p>
                    </td>
                    <td>
                      <span className="font-medium">{fine.reason}</span>
                      {fine.note && <p className="mt-0.5 max-w-48 text-xs text-ink-3">{fine.note}</p>}
                    </td>
                    <td className="max-w-44">
                      {fine.loan ? (
                        <Link href={`/books/${fine.loan.book.slug}`} className="line-clamp-1 text-forest-3 hover:underline">
                          {fine.loan.book.title}
                        </Link>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatMoney(fine.amountCents)}
                    </td>
                    <td>
                      <Badge status={fine.status} />
                    </td>
                    <td className="text-right">
                      {fine.status === "UNPAID" ? (
                        <div className="flex justify-end gap-1.5">
                          <form action={settleFineAction}>
                            <input type="hidden" name="fineId" value={fine.id} />
                            <input type="hidden" name="action" value="PAID" />
                            <input type="hidden" name="returnTo" value={`/admin/fines?status=${status}`} />
                            <button type="submit" className="btn-primary px-2.5 py-1.5 text-xs">
                              Paid
                            </button>
                          </form>
                          <form action={settleFineAction}>
                            <input type="hidden" name="fineId" value={fine.id} />
                            <input type="hidden" name="action" value="WAIVED" />
                            <input type="hidden" name="returnTo" value={`/admin/fines?status=${status}`} />
                            <button type="submit" className="btn-secondary px-2.5 py-1.5 text-xs">
                              Waive
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-3">
                          {fine.paidAt ? formatDate(fine.paidAt) : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-3">
        Waiving requires administrator rights. Every settlement is stamped with the acting
        staff member.
      </p>
    </div>
  );
}
