import "server-only";
import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@/lib/constants";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; field?: string };

/** Generate a stable, human-friendly membership number: LIB-000417 */
async function generateMemberNo(): Promise<string> {
  const count = await db.user.count();
  let candidate = `LIB-${String(count + 1).padStart(6, "0")}`;
  // Guard against collisions if rows were deleted.
  for (let i = 0; i < 20; i++) {
    const exists = await db.user.findUnique({ where: { memberNo: candidate } });
    if (!exists) return candidate;
    candidate = `LIB-${String(count + 1 + i + 1).padStart(6, "0")}`;
  }
  return `LIB-${Date.now().toString().slice(-6)}`;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<AuthResult> {
  const email = input.email.toLowerCase().trim();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "An account with this email already exists.", field: "email" };
  }

  const passwordHash = await hash(input.password, 12);
  const memberNo = await generateMemberNo();

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        phone: input.phone?.trim() || null,
        memberNo,
        role: "MEMBER",
      },
    });

    await tx.notification.create({
      data: {
        userId: created.id,
        title: "Welcome to the library",
        body: `Your membership number is ${memberNo}. Browse the catalogue and start borrowing.`,
        href: "/books",
      },
    });

    return created;
  });

  return { ok: true, userId: user.id };
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Same message for "no such user" and "wrong password" so the endpoint does
  // not leak which emails are registered.
  if (!user) return { ok: false, error: "Incorrect email or password.", field: "password" };

  const valid = await compare(password, user.passwordHash);
  if (!valid) return { ok: false, error: "Incorrect email or password.", field: "password" };

  if (!user.isActive)
    return { ok: false, error: "This account has been suspended. Contact the library.", field: "email" };

  return { ok: true, userId: user.id };
}

export async function updateProfile(
  userId: string,
  input: { name: string; email: string; phone?: string; address?: string },
) {
  const email = input.email.toLowerCase().trim();

  const clash = await db.user.findFirst({ where: { email, NOT: { id: userId } } });
  if (clash) throw new Error("That email is already in use by another account.");

  return db.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
    },
  });
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Account not found.");

  const valid = await compare(current, user.passwordHash);
  if (!valid) throw new Error("Your current password is incorrect.");

  return db.user.update({
    where: { id: userId },
    data: { passwordHash: await hash(next, 12) },
  });
}

export async function listMembers(role?: Role) {
  return db.user.findMany({
    where: role ? { role } : {},
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      memberNo: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { loans: true, fines: { where: { status: "UNPAID" } } } },
    },
  });
}

export async function getMemberById(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      loans: {
        orderBy: { requestedAt: "desc" },
        include: { book: { select: { title: true, slug: true, coverUrl: true } } },
      },
      fines: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}
