"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestLoanAction, type LoanActionState } from "@/app/actions/loans";
import { RULES } from "@/lib/constants";
import { formatMoney, addWeeks } from "@/lib/utils";
import { Callout } from "@/components/ui";
import Link from "next/link";

const EMPTY: LoanActionState = {};

export function BorrowForm({
  bookId,
  bookTitle,
  isAvailable,
  copiesAvailable,
  borrowFeeCents,
  rentalFeeCents,
  signedIn,
  next,
}: {
  bookId: string;
  bookTitle: string;
  isAvailable: boolean;
  copiesAvailable: number;
  borrowFeeCents: number;
  rentalFeeCents: number | null;
  signedIn: boolean;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(requestLoanAction, EMPTY);
  const [type, setType] = useState<"BORROW" | "RENTAL">("BORROW");
  const [weeks, setWeeks] = useState(RULES.loanPeriodWeeks);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state.error]);

  if (!signedIn) {
    return (
      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold">Borrow this book</h2>
        <p className="mt-2 text-sm text-ink-3">
          Sign in with your library account to request a loan or rental.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary flex-1">
            Sign in
          </Link>
          <Link href="/register" className="btn-secondary flex-1">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold">Borrow this book</h2>
        <Callout tone="warning" title="All copies are on loan">
          Every copy is currently out. Sign in and check back, or search for a similar title.
        </Callout>
        <Link href="/books?avail=1" className="btn-secondary mt-4 w-full">
          Browse available books
        </Link>
      </div>
    );
  }

  const fee = type === "RENTAL" ? (rentalFeeCents ?? 0) : borrowFeeCents;
  const dueDate = addWeeks(new Date(), weeks);

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg font-semibold">Request this book</h2>
      <p className="mt-1.5 text-sm text-ink-3">
        {copiesAvailable} {copiesAvailable === 1 ? "copy" : "copies"} available now.
      </p>

      {state.error && (
        <div ref={errorRef} tabIndex={-1} className="mt-4 outline-none">
          <Callout tone="danger" title="Cannot submit request">
            {state.error}
          </Callout>
        </div>
      )}

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="bookId" value={bookId} />

        {/* Loan type */}
        <fieldset>
          <legend className="label">What do you need?</legend>
          <div className="grid grid-cols-2 gap-2">
            <TypeOption
              name="BORROW"
              current={type}
              onSelect={setType}
              title="Borrow"
              price={borrowFeeCents === 0 ? "Free" : formatMoney(borrowFeeCents)}
              note="Standard library loan"
            />
            <TypeOption
              name="RENTAL"
              current={type}
              onSelect={setType}
              title="Rent"
              price={rentalFeeCents ? formatMoney(rentalFeeCents) : "N/A"}
              note="Longer-term rental"
              disabled={!rentalFeeCents}
            />
          </div>
          <input type="hidden" name="type" value={type} />
        </fieldset>

        {/* Period */}
        <div>
          <label htmlFor="periodWeeks" className="label">
            Borrowing period
          </label>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setWeeks((w) => Math.max(RULES.minPeriodWeeks, w - 1))}
              disabled={weeks <= RULES.minPeriodWeeks}
              className="btn-secondary w-11 shrink-0 px-0"
              aria-label="Decrease period"
            >
              −
            </button>
            <div className="relative flex-1">
              <input
                id="periodWeeks"
                name="periodWeeks"
                type="number"
                min={RULES.minPeriodWeeks}
                max={RULES.maxPeriodWeeks}
                value={weeks}
                onChange={(e) =>
                  setWeeks(
                    Math.min(
                      RULES.maxPeriodWeeks,
                      Math.max(RULES.minPeriodWeeks, Number(e.target.value) || 1),
                    ),
                  )
                }
                className="field pr-16 text-center"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-3">
                {weeks === 1 ? "week" : "weeks"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWeeks((w) => Math.min(RULES.maxPeriodWeeks, w + 1))}
              disabled={weeks >= RULES.maxPeriodWeeks}
              className="btn-secondary w-11 shrink-0 px-0"
              aria-label="Increase period"
            >
              +
            </button>
          </div>
          {state.fieldErrors?.periodWeeks && (
            <p className="mt-1.5 text-xs text-red-600">{state.fieldErrors.periodWeeks}</p>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-paper-2 p-4 text-sm">
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">Fee</dt>
              <dd className="font-semibold">{formatMoney(fee)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">Expected return</dt>
              <dd className="font-semibold">{dueDate.toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">Max renewals</dt>
              <dd className="font-semibold">{RULES.maxRenewals}</dd>
            </div>
          </dl>
          {fee > 0 && (
            <p className="mt-3 border-t border-line pt-3 text-xs text-ink-3">
              Payable on collection. Overdue returns accrue a daily charge.
            </p>
          )}
        </div>

        <button type="submit" disabled={pending} className="btn-primary w-full py-3">
          {pending ? "Submitting…" : "Request this book"}
        </button>

        <p className="text-center text-xs text-ink-3">
          A librarian will review your request. You will be notified when it is approved.
        </p>
      </form>
    </div>
  );
}

function TypeOption({
  name,
  current,
  onSelect,
  title,
  price,
  note,
  disabled,
}: {
  name: "BORROW" | "RENTAL";
  current: string;
  onSelect: (v: "BORROW" | "RENTAL") => void;
  title: string;
  price: string;
  note: string;
  disabled?: boolean;
}) {
  const active = current === name;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(name)}
      aria-pressed={active}
      className={[
        "rounded-lg border p-3 text-left transition",
        disabled
          ? "cursor-not-allowed border-line bg-paper-2 opacity-50"
          : active
            ? "border-forest bg-forest-soft ring-2 ring-forest/30"
            : "border-line bg-white hover:border-forest/40",
      ].join(" ")}
    >
      <span className="flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm font-semibold text-forest-2">{price}</span>
      </span>
      <span className="mt-0.5 block text-xs text-ink-3">{disabled ? "Not offered" : note}</span>
    </button>
  );
}
