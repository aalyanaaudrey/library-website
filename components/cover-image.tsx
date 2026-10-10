"use client";

import { useState } from "react";

/**
 * Book cover image with graceful failure.
 *
 * This must be a Client Component: it attaches an `onError` handler, and React
 * forbids passing event handlers through Server Component props. OpenLibrary
 * returns 404s for some ISBNs, so without this the grid would show empty boxes
 * instead of the designed gradient fallback underneath.
 */
export function CoverImage({
  src,
  alt,
  className,
  priority = false,
  decorative = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Marks a purely decorative image (empty alt, hidden from AT). */
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={decorative ? "" : alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
