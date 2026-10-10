"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loginAction, type FormState } from "@/app/actions/auth";
import { Callout } from "@/components/ui";

const EMPTY: FormState = {};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16"><div className="card h-96 animate-pulse" /></div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [state, formAction, pending] = useActionState(loginAction, EMPTY);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-[15px] text-ink-3">
          Sign in to manage your borrowings and account.
        </p>
      </div>

      <div className="card p-6">
        {state.error && !state.fieldErrors && (
          <div className="mb-4">
            <Callout tone="danger">{state.error}</Callout>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <div>
            <label htmlFor="email" className="label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue=""
              className={`field ${state.fieldErrors?.email ? "field-error" : ""}`}
              placeholder="you@example.com"
            />
            {state.fieldErrors?.email && (
              <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={`field ${state.fieldErrors?.password ? "field-error" : ""}`}
              placeholder="••••••••"
            />
            {state.fieldErrors?.password && (
              <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" disabled={pending} className="btn-primary w-full py-3">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-3">
          New here?{" "}
          <Link
            href={`/register${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-forest-3 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Demo accounts - handy for evaluating the site. */}
      <div className="card mt-5 border-dashed p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Demo accounts</p>
        <p className="mt-1 text-xs text-ink-3">Password for all: <code className="font-mono">password123</code></p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {[
            { e: "admin@library.test", r: "Administrator" },
            { e: "librarian@library.test", r: "Librarian" },
            { e: "member@library.test", r: "Member" },
          ].map((d) => (
            <li key={d.e} className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-ink-2">{d.e}</span>
              <span className="text-xs text-ink-3">{d.r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
