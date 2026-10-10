"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn, relativeTime } from "@/lib/utils";
import { isStaff } from "@/lib/rbac";
import type { Role } from "@/lib/constants";

export type HeaderUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  memberNo: string;
} | null;

export type HeaderNotification = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const PUBLIC_NAV = [
  { href: "/books", label: "Catalogue" },
  { href: "/announcements", label: "News" },
  { href: "/about", label: "About" },
];

export function Header({
  user,
  notifications,
  unreadCount,
}: {
  user: HeaderUser;
  notifications: HeaderNotification[];
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close menus on navigation.
  useEffect(() => {
    setOpen(false);
    setBellOpen(false);
  }, [pathname]);

  // Close the notification panel on outside click / Escape.
  useEffect(() => {
    if (!bellOpen) return;
    const onDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRefRef_contains(bellRef, e.target)) setBellOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBellOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [bellOpen]);

  const nav = [
    ...PUBLIC_NAV,
    ...(user ? [{ href: "/account/borrowings", label: "My borrowings" }] : []),
    ...(user && isStaff(user.role) ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-semibold">Alyana Library</span>
            <span className="block text-[11px] text-ink-3">Catalogue &amp; Lending</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                active(item.href)
                  ? "bg-forest-soft text-forest-2"
                  : "text-ink-2 hover:bg-paper-2 hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Search shortcut */}
        <Link href="/books" className="btn-ghost hidden sm:inline-flex" aria-label="Search the catalogue">
          <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth="1.75">
            <path d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
          </svg>
          Search
        </Link>

        {user ? (
          <>
            {/* Notifications */}
            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
                aria-expanded={bellOpen}
                className="btn-ghost relative px-2.5"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
                  <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-lift">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                    <p className="text-sm font-semibold">Notifications</p>
                    <MarkAllRead />
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-ink-3">
                        Nothing yet. Updates about your loans will appear here.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href ?? "/account"}
                          className={cn(
                            "block border-b border-line/60 px-4 py-3 last:border-0 hover:bg-paper-2",
                            !n.read && "bg-forest-soft/50",
                          )}
                        >
                          <p className="text-sm font-medium text-ink">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-3">{n.body}</p>
                          <p className="mt-1 text-[11px] text-ink-3">{relativeTime(n.createdAt)}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account */}
            <Link href="/account" className="hidden items-center gap-2 rounded-lg py-1 pr-2 pl-1 hover:bg-paper-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
                {initials(user.name)}
              </span>
              <span className="leading-tight">
                <span className="block max-w-28 truncate text-sm font-medium">{user.name}</span>
                <span className="block text-[11px] text-ink-3">{user.memberNo}</span>
              </span>
            </Link>

            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary hidden sm:inline-flex">
              Join
            </Link>
          </>
        )}

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn-ghost px-2.5 lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75">
            {open ? (
              <path d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="border-t border-line bg-paper px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  active(item.href) ? "bg-forest-soft text-forest-2" : "text-ink-2 hover:bg-paper-2",
                )}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/account" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-paper-2">
                  My account
                </Link>
                <Link href="/account/fines" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-paper-2">
                  Fines &amp; balance
                </Link>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link href="/login" className="btn-secondary flex-1">Sign in</Link>
                <Link href="/register" className="btn-primary flex-1">Join</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------- fragments */

function bellRefRef_contains(ref: React.RefObject<HTMLDivElement | null>, target: EventTarget | null) {
  return ref.current?.contains(target as Node) ?? false;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function MarkAllRead() {
  return (
    <form action="/api/notifications/read" method="post">
      <button type="submit" className="text-xs font-medium text-forest-3 hover:underline">
        Mark all read
      </button>
    </form>
  );
}

function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post">
      <button type="submit" className="btn-ghost px-2.5" aria-label="Sign out" title="Sign out">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
          <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
        </svg>
      </button>
    </form>
  );
}
