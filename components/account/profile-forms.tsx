"use client";

import { useActionState } from "react";
import {
  updateProfileAction,
  changePasswordAction,
  type FormState,
} from "@/app/actions/auth";
import { Callout } from "@/components/ui";
import { formatDate } from "@/lib/utils";

const EMPTY: FormState = {};

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  memberNo: string;
  /** ISO string — Dates are not serialisable across the RSC boundary. */
  createdAt: string;
};

export function ProfileForms({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-8">
      <ProfileDetails profile={profile} />
      <PasswordForm />
    </div>
  );
}

/* ------------------------------------------------------------------ details */

function ProfileDetails({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, EMPTY);

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Personal details</h3>
          <p className="mt-0.5 text-sm text-ink-3">
            Membership {profile.memberNo} · Member since {formatDate(profile.createdAt)}
          </p>
        </div>
      </div>

      {state.ok && (
        <div className="mb-4">
          <Callout tone="success" title="Saved">
            Your profile has been updated.
          </Callout>
        </div>
      )}
      {state.error && (
        <div className="mb-4">
          <Callout tone="danger">{state.error}</Callout>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={profile.name}
              className={`field ${state.fieldErrors?.name ? "field-error" : ""}`}
            />
            {state.fieldErrors?.name && (
              <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={profile.email}
              className={`field ${state.fieldErrors?.email ? "field-error" : ""}`}
            />
            {state.fieldErrors?.email && (
              <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.email}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="label">
              Phone <span className="text-ink-3">(optional)</span>
            </label>
            <input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} className="field" />
          </div>
          <div>
            <label htmlFor="address" className="label">
              Address <span className="text-ink-3">(optional)</span>
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={profile.address ?? ""}
              className="field"
              placeholder="Street, town"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ----------------------------------------------------------------- password */

function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, EMPTY);

  return (
    <section className="card p-6">
      <h3 className="font-display text-lg font-semibold">Change password</h3>
      <p className="mt-0.5 text-sm text-ink-3">
        Changing your password signs you out of every other device.
      </p>

      {state.ok && (
        <div className="mt-4">
          <Callout tone="success" title="Password changed">
            Your new password is active on this device.
          </Callout>
        </div>
      )}
      {state.error && (
        <div className="mt-4">
          <Callout tone="danger">{state.error}</Callout>
        </div>
      )}

      <form action={formAction} className="mt-5 space-y-4">
        <div>
          <label htmlFor="currentPassword" className="label">Current password</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={`field ${state.fieldErrors?.currentPassword ? "field-error" : ""}`}
          />
          {state.fieldErrors?.currentPassword && (
            <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.currentPassword}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="newPassword" className="label">New password</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={`field ${state.fieldErrors?.newPassword ? "field-error" : ""}`}
            />
            {state.fieldErrors?.newPassword && (
              <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.newPassword}</p>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="label">Confirm new password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className={`field ${state.fieldErrors?.confirmPassword ? "field-error" : ""}`}
            />
            {state.fieldErrors?.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </section>
  );
}
