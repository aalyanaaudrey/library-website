import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: {
    default: "Alyana Library — Catalogue & Lending",
    template: "%s · Alyana Library",
  },
  description:
    "Browse the Alyana Library collection, search by title, author or ISBN, and manage your borrowings online.",
};

/** Layouts cannot be Server Actions targets, so read data directly here. */
async function getHeaderData() {
  const user = await getCurrentUser();
  if (!user) return { user: null, notifications: [], unreadCount: 0 };

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      memberNo: user.memberNo,
    },
    notifications: notifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const header = await getHeaderData();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-forest focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        <Header {...header} />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
