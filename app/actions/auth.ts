"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, requireUser } from "@/lib/auth";
import {
  authenticateUser,
  registerUser,
  updateProfile,
  changePassword,
} from "@/lib/services/user.service";
import {
  registerSchema,
  loginSchema,
  profileSchema,
  passwordChangeSchema,
  flattenErrors,
} from "@/lib/validators";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

function safeNext(raw: string | null | undefined): string {
  // Only allow same-origin relative paths so a crafted ?next= cannot bounce
  // users to an external phishing site.
  if (!raw) return "/account";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  const result = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return {
      error: result.error,
      fieldErrors: result.field ? { [result.field]: result.error } : undefined,
    };
  }

  await createSession(result.userId);
  redirect(safeNext(formData.get("next") as string));
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) {
    return {
      error: result.error,
      fieldErrors: result.field ? { [result.field]: result.error } : undefined,
    };
  }

  await createSession(result.userId);
  redirect("/account?ok=registered");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  try {
    await updateProfile(user.id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save your profile." };
  }

  return { ok: true };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error), error: "Please fix the fields below." };
  }

  try {
    await changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not change your password." };
  }

  // Password changed: invalidate every other session for safety.
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);

  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}
