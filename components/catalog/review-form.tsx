"use client";

import { useActionState, useState } from "react";
import { submitReviewAction, type LoanActionState } from "@/app/actions/loans";
import { Callout } from "@/components/ui";
import Link from "next/link";

const EMPTY: LoanActionState = {};

export function ReviewForm({
  bookId,
  existing,
}: {
  bookId: string;
  existing?: { rating: number; title: string | null; body: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState(submitReviewAction, EMPTY);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);

  if (state.ok) {
    return (
      <Callout tone="success" title="Thanks for reviewing">
        Your review has been saved and is now visible on this page.
      </Callout>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="rating" value={rating} />

      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div>
        <span className="label" id="rating-label">
          Your rating
        </span>
        <div
          className="flex items-center gap-1"
          role="radiogroup"
          aria-labelledby="rating-label"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              className="p-0.5 transition hover:scale-110"
            >
              <svg
                viewBox="0 0 20 20"
                className={`h-7 w-7 ${(hover || rating) >= i ? "text-amber" : "text-line"}`}
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118L2.075 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674Z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-ink-3">
            {rating > 0 ? `${rating} of 5` : "Pick a rating"}
          </span>
        </div>
        {state.fieldErrors?.rating && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.rating}</p>
        )}
      </div>

      <div>
        <label htmlFor="review-title" className="label">Headline <span className="text-ink-3">(optional)</span></label>
        <input
          id="review-title"
          name="title"
          defaultValue={existing?.title ?? ""}
          maxLength={120}
          className="field"
          placeholder="Sums it up in a few words"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="label">Your review <span className="text-ink-3">(optional)</span></label>
        <textarea
          id="review-body"
          name="body"
          defaultValue={existing?.body ?? ""}
          rows={4}
          maxLength={4000}
          className="field resize-y"
          placeholder="What did you think? No spoilers, please."
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : existing ? "Update my review" : "Post review"}
      </button>
    </form>
  );
}

export function ReviewSignInPrompt({ next }: { next: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-paper-2 px-4 py-6 text-center">
      <p className="text-sm text-ink-3">Sign in to rate this book and share your thoughts.</p>
      <div className="mt-3 flex justify-center gap-2">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-secondary">
          Sign in
        </Link>
        <Link href="/register" className="btn-primary">
          Create account
        </Link>
      </div>
    </div>
  );
}
