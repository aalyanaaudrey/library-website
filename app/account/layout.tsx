import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getOutstandingBalanceCents } from "@/lib/services/fine.service";
import { countActiveLoans } from "@/lib/services/loan.service";
import { AccountNav, type AccountNavItem } from "@/components/account-nav";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [balance, activeLoans] = await Promise.all([
    getOutstandingBalanceCents(user.id),
    countActiveLoans(user.id),
  ]);

  const items: AccountNavItem[] = [
    { href: "/account", label: "Overview", exact: true },
    { href: "/account/borrowings", label: "My borrowings", count: activeLoans },
    { href: "/account/fines", label: "Fines & balance", count: balance > 0 ? 1 : 0 },
    { href: "/account/profile", label: "Profile & password" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">My account</h1>
        <p className="mt-1.5 text-[15px] text-ink-3">
          Signed in as <span className="font-medium text-ink">{user.name}</span> ·{" "}
          {user.memberNo}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[230px_1fr] lg:items-start">
        <AccountNav items={items} balanceCents={balance} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
