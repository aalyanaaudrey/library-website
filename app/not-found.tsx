import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-7xl font-semibold text-forest/25">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
        The page you were looking for has moved, been retired, or never existed. The
        catalogue is still where you left it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary px-6 py-3">
          Back to home
        </Link>
        <Link href="/books" className="btn-secondary px-6 py-3">
          Browse catalogue
        </Link>
      </div>
    </div>
  );
}
