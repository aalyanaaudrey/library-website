import type { Role } from "@/lib/constants";

/**
 * Capability-based RBAC. Roles imply a set of capabilities; checks are made
 * against capabilities, never against role names scattered through the UI.
 *
 * This is used in the service layer as the authoritative check. Route guards
 * and UI conditionals are only fast-rejection and convenience.
 */
export const CAPABILITIES = [
  "catalog:read",
  "loan:request",
  "loan:own:read",
  "loan:own:renew",
  "loan:own:cancel",
  "review:write",
  "fine:own:pay",
  "loan:approve",
  "loan:return",
  "loan:renew",
  "inventory:manage",
  "announcement:manage",
  "report:read",
  "member:manage",
  "fine:waive",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const MEMBER_CAPS: Capability[] = [
  "catalog:read",
  "loan:request",
  "loan:own:read",
  "loan:own:renew",
  "loan:own:cancel",
  "review:write",
  "fine:own:pay",
];

const LIBRARIAN_CAPS: Capability[] = [
  ...MEMBER_CAPS,
  "loan:approve",
  "loan:return",
  "loan:renew",
  "inventory:manage",
  "announcement:manage",
  "report:read",
];

const ADMIN_CAPS: Capability[] = [...LIBRARIAN_CAPS, "member:manage", "fine:waive"];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  MEMBER: MEMBER_CAPS,
  LIBRARIAN: LIBRARIAN_CAPS,
  ADMIN: ADMIN_CAPS,
};

/** Authoritative check. Call this inside every mutating service function. */
export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export function isStaff(role: Role | undefined | null): boolean {
  return role === "LIBRARIAN" || role === "ADMIN";
}

/** Owner may act on their own resource if they hold the `:own` variant. */
export function canActOnOwn(
  role: Role | undefined | null,
  ownCapability: Capability,
  isOwner: boolean,
): boolean {
  if (isOwner) return can(role, ownCapability);
  return false;
}

export function highestRole(a: Role, b: Role): Role {
  const order: Role[] = ["MEMBER", "LIBRARIAN", "ADMIN"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}
