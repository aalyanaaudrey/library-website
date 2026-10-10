import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Role } from "@/lib/constants";

const COOKIE_NAME = "lib_session";
const SESSION_DAYS = Number(process.env.SESSION_DURATION_DAYS ?? 30);

/**
 * Sessions are opaque random tokens stored in the database, not signed JWTs.
 * That makes them instantly revocable (delete the row) and means a stolen
 * cookie can be invalidated without rotating a signing key.
 */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.session.create({ data: { token, userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }
  store.delete(COOKIE_NAME);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  memberNo: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
};

/** Current user, or null. Cached per request so RSC can call it repeatedly. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          memberNo: true,
          phone: true,
          address: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;

  return session.user as SessionUser;
});

/** Throws a redirect to /login when unauthenticated. Use in pages/actions. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user as SessionUser;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    const { redirect } = await import("next/navigation");
    redirect("/unauthorised");
  }
  return user;
}

/** Cheap boolean for conditional rendering. */
export async function isLibrarian(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && (user.role === "LIBRARIAN" || user.role === "ADMIN");
}
