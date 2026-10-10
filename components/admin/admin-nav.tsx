"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; count?: number; exact?: boolean };

export function AdminNav({
  pending,
  active,
  overdue,
  unpaidFines,
  isAdmin,
}: {
  pending: number;
  active: number;
  overdue: number;
  unpaidFines: number;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Overview",
      items: [{ href: "/admin", label: "Dashboard", exact: true }],
    },
    {
      title: "Lending",
      items: [
        { href: "/admin/requests", label: "Requests", count: pending },
        { href: "/admin/loans", label: "Active loans", count: active },
        { href: "/admin/fines", label: "Fines", count: unpaidFines },
      ],
    },
    {
      title: "Collection",
      items: [
        { href: "/admin/books", label: "Inventory" },
        { href: "/admin/announcements", label: "Announcements" },
      ],
    },
    {
      title: "People",
      items: [{ href: "/admin/members", label: "Members", count: overdue || undefined }],
    },
  ];

  // Admin-only entries are filtered out for librarians.
  const visible = isAdmin
    ? groups
    : groups.filter((g) => g.title !== "People" || g.items.some((i) => i.href !== "/admin/members"));

  return (
    <nav className="lg:sticky lg:top-24" aria-label="Admin sections">
      <ul className="space-y-5">
        {visible.map((group) => (
          <li key={group.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active_ = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active_ ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                        active_
                          ? "bg-forest-soft text-forest-2"
                          : "text-ink-2 hover:bg-paper-2 hover:text-ink",
                      )}
                    >
                      <span>{item.label}</span>
                      {item.count ? (
                        <span
                          className={cn(
                            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                            item.label === "Fines" || item.label === "Members"
                              ? "bg-red-100 text-red-700"
                              : "bg-forest text-white",
                          )}
                        >
                          {item.count > 99 ? "99+" : item.count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
