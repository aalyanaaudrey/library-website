import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui";
import { toggleMemberAction } from "@/app/actions/loans";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const members = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { loans: true, fines: { where: { status: "UNPAID" } } } },
      fines: { where: { status: "UNPAID" }, select: { amountCents: true } },
      loans: {
        where: { status: { in: ["ACTIVE", "OVERDUE", "APPROVED"] } },
        select: { id: true },
      },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold">Members</h2>
        <p className="mt-1 text-sm text-ink-3">
          {members.length} registered {members.length === 1 ? "account" : "accounts"}.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base min-w-[820px]">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th className="text-center">On loan</th>
                <th className="text-center">Borrowings</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const balance = m.fines.reduce((a, f) => a + f.amountCents, 0);

                return (
                  <tr key={m.id} className={m.isActive ? "" : "opacity-60"}>
                    <td>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-ink-3">
                        {m.memberNo} · {m.email}
                      </p>
                      <p className="text-xs text-ink-3">Joined {formatDate(m.createdAt)}</p>
                    </td>

                    <td>
                      <Badge status={m.role} />
                    </td>

                    <td className="text-center tabular-nums">{m.loans.length}</td>
                    <td className="text-center tabular-nums">{m._count.loans}</td>

                    <td className="text-right tabular-nums">
                      {balance > 0 ? (
                        <span className="font-semibold text-red-600">{formatMoney(balance)}</span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>

                    <td>
                      <Badge status={m.isActive ? "AVAILABLE" : "REJECTED"}>
                        {m.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </td>

                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {balance > 0 && (
                          <Link href="/admin/fines" className="btn-secondary px-3 py-1.5 text-xs">
                            Fines
                          </Link>
                        )}
                        <form action={toggleMemberAction}>
                          <input type="hidden" name="userId" value={m.id} />
                          <button
                            type="submit"
                            className={
                              "px-3 py-1.5 text-xs font-semibold rounded-lg transition " +
                              (m.isActive
                                ? "bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")
                            }
                          >
                            {m.isActive ? "Suspend" : "Reactivate"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-3">
        Suspending a member ends their active sessions immediately. Their borrowing history
        and fines are preserved.
      </p>
    </div>
  );
}
