"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { registerAction, type FormState } from "@/app/actions/auth";
import { Callout } from "@/components/ui";

const EMPTY: FormState = {};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16"><div className="card h-[32rem] animate-pulse" /></div>}>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const [state, formAction, pending] = useActionState(registerAction, EMPTY);

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold">Join the library</h1>
        <p className="mt-2 text-[15px] text-ink-3">
          Free membership. Request books, track due dates and get notified.
        </p>
      </div>

      <div className="card p-6">
        {state.error && !state.fieldErrors && (
          <div className="mb-4">
            <Callout tone="danger">{state.error}</Callout>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className={`field ${state.fieldErrors?.name ? "field-error" : ""}`}
              placeholder="Jordan Reyes"
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
              autoComplete="email"
              className={`field ${state.fieldErrors?.email ? "field-error" : ""}`}
              placeholder="you@example.com"
            />
            {state.fieldErrors?.email && (
              <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="label">
              Phone <span className="text-ink-3">(optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className="field"
              placeholder="555-0100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={`field ${state.fieldErrors?.password ? "field-error" : ""}`}
                placeholder="At least 8 characters"
              />
              {state.fieldErrors?.password && (
                <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className={`field ${state.fieldErrors?.confirmPassword ? "field-error" : ""}`}
                placeholder="Repeat it"
              />
              {state.fieldErrors?.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={pending} className="btn-primary w-full py-3">
            {pending ? "Creating account…" : "Create my account"}
          </button>

          <p className="text-center text-xs leading-relaxed text-ink-3">
            By joining you agree to return borrowed items on time and to respect the
            library&apos;s terms of use.
          </p>
        </form>

        <p className="mt-5 text-center text-sm text-ink-3">
          Already a member?{" "}
          <Link href="/login" className="font-semibold text-forest-3 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
