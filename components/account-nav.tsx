"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, formatMoney } from "@/lib/utils";

export type AccountNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  count?: number;
};

export function AccountNav({
  items,
  balanceCents,
}: {
  items: AccountNavItem[];
  balanceCents: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="lg:sticky lg:top-24" aria-label="Account sections">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-forest-soft text-forest-2"
                    : "text-ink-2 hover:bg-paper-2 hover:text-ink",
                )}
              >
                <span>{item.label}</span>
                {item.count ? (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                      item.label.includes("balance") || item.label.includes("Fines")
                        ? "bg-red-100 text-red-700"
                        : "bg-forest text-white",
                    )}
                  >
                    {item.count > 9 ? "9+" : item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {balanceCents > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Outstanding balance
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-red-800">
            {formatMoney(balanceCents)}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-red-700">
            Borrowing is paused until this is settled.
          </p>
          <Link
            href="/account/fines"
            className="mt-3 inline-flex text-xs font-semibold text-red-800 underline"
          >
            View fines →
          </Link>
        </div>
      )}

      <div className="mt-6 hidden rounded-lg bg-paper-2 p-4 lg:block">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Need help?</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-3">
          Speak to staff at the front desk, or call during opening hours to renew or
          report a lost item.
        </p>
      </div>
    </nav>
  );
}
