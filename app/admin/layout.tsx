import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative role gate. `can()` is re-checked inside every action too.
  const user = await requireRole("LIBRARIAN", "ADMIN");

  const [pending, active, overdue, unpaidFines] = await Promise.all([
    db.loan.count({ where: { status: "PENDING" } }),
    db.loan.count({ where: { status: { in: ["ACTIVE", "APPROVED"] } } }),
    db.loan.count({ where: { status: "OVERDUE" } }),
    db.fine.count({ where: { status: "UNPAID" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-3">
            Staff area
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Library admin</h1>
          <p className="mt-1.5 text-[15px] text-ink-3">
            Signed in as {user.name} · {user.role}
          </p>
        </div>
        <a href="/" className="btn-secondary">
          ← Back to site
        </a>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:items-start">
        <AdminNav
          pending={pending}
          active={active}
          overdue={overdue}
          unpaidFines={unpaidFines}
          isAdmin={user.role === "ADMIN"}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
