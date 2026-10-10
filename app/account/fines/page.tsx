import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listUserFines, getOutstandingBalanceCents } from "@/lib/services/fine.service";
import { Badge, EmptyState } from "@/components/ui";
import { Notice } from "@/components/notice";
import { settleFineAction } from "@/app/actions/loans";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Fines & balance" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FinesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const [fines, balance] = await Promise.all([
    listUserFines(user.id),
    getOutstandingBalanceCents(user.id),
  ]);

  const unpaid = fines.filter((f) => f.status === "UNPAID");

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">Fines &amp; balance</h2>
        <p className="mt-1 text-sm text-ink-3">
          Charges from overdue returns, damage or rentals.
        </p>
      </div>

      <Notice ok={first(sp.ok)} err={first(sp.err)} className="mb-6" />

      {/* Balance summary */}
      <div
        className={
          "card mb-6 p-6 " +
          (balance > 0 ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50")
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
              Outstanding balance
            </p>
            <p
              className={
                "mt-1 font-display text-4xl font-semibold tabular-nums " +
                (balance > 0 ? "text-red-700" : "text-emerald-700")
              }
            >
              {formatMoney(balance)}
            </p>
            <p className="mt-1.5 text-sm text-ink-3">
              {balance > 0
                ? "Settle this balance to resume borrowing."
                : "Nothing outstanding. Happy borrowing!"}
            </p>
          </div>

          {balance > 0 && (
            <div className="text-sm text-ink-3">
              <p className="max-w-xs leading-relaxed">
                Pay at the front desk. Once recorded, borrowing is re-enabled immediately.
              </p>
            </div>
          )}
        </div>
      </div>

      {fines.length === 0 ? (
        <EmptyState
          title="No fines on record"
          description="You have a clean record. Charges appear here if an item is returned late or damaged."
          action={{ href: "/account/borrowings", label: "My borrowings" }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
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
                      <span className="font-medium">{fine.reason}</span>
                      {fine.note && (
                        <p className="mt-0.5 max-w-56 text-xs text-ink-3">{fine.note}</p>
                      )}
                    </td>
                    <td className="max-w-48">
                      {fine.loan ? (
                        <Link
                          href={`/books/${fine.loan.book.slug}`}
                          className="line-clamp-1 text-forest-3 hover:underline"
                        >
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
                        <form action={settleFineAction} className="inline-block">
                          <input type="hidden" name="fineId" value={fine.id} />
                          <input type="hidden" name="action" value="PAID" />
                          <input type="hidden" name="returnTo" value="/account/fines" />
                          <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
                            Mark paid
                          </button>
                        </form>
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

      {unpaid.length > 0 && (
        <p className="mt-4 text-xs text-ink-3">
          “Mark paid” records an in-person payment at the front desk. Card payments are
          handled at the desk only.
        </p>
      )}
    </div>
  );
}
