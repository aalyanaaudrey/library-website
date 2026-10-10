import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "About",
  description: "Opening hours, membership rules and how to use the library.",
};
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [bookCount, copyCount, genreCount] = await Promise.all([
    db.book.count({ where: { status: { not: "RETIRED" } } }),
    db.bookCopy.count(),
    db.genre.count(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="mb-4 text-sm text-ink-3" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">About</span>
      </nav>

      <h1 className="font-display text-3xl font-semibold sm:text-4xl">About the library</h1>

      <p className="mt-5 text-[17px] leading-[1.8] text-ink-2">
        Alyana Library is a community lending library open to all registered members. Our
        whole collection can be searched online — check availability, request a borrow or
        rental, and track everything from your account, then collect in person.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { k: "Titles", v: bookCount },
          { k: "Physical copies", v: copyCount },
          { k: "Genres", v: genreCount },
        ].map((s) => (
          <div key={s.k} className="card p-5 text-center">
            <p className="font-display text-3xl font-semibold text-forest">{s.v}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-3">{s.k}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Opening hours</h2>
        <div className="card mt-4 overflow-hidden">
          <table className="table-base">
            <tbody>
              {[
                ["Monday – Wednesday", "9:00 – 18:00"],
                ["Thursday", "9:00 – 20:00"],
                ["Friday – Saturday", "9:00 – 17:00"],
                ["Sunday", "Closed"],
              ].map(([d, h]) => (
                <tr key={d}>
                  <td className="font-medium">{d}</td>
                  <td className="text-right">{h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-3">
          Self-service returns are available at the drop box beside the main entrance at any
          time.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">How borrowing works</h2>
        <ol className="mt-4 space-y-4">
          {[
            {
              t: "Search and request",
              d: "Find a title in the catalogue and send a borrow or rental request, choosing how long you need it.",
            },
            {
              t: "Wait for approval",
              d: "A librarian checks availability and approves the request. You are notified as soon as it is ready.",
            },
            {
              t: "Collect in person",
              d: "Bring your membership card within five working days and collect from the front desk.",
            },
            {
              t: "Return or renew",
              d: "Return by the due date, or renew online up to twice unless someone else is waiting.",
            },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest font-display text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-base font-semibold">{s.t}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-3">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Membership rules</h2>
        <div className="card mt-4 p-6">
          <ul className="space-y-3 text-[15px] leading-relaxed text-ink-2">
            {[
              "Standard loans run for two weeks and can be renewed up to twice.",
              "You may hold up to five active loans at a time.",
              "Overdue items are charged a daily fee, set per title.",
              "Borrowing is paused while any fine remains unpaid.",
              "Damaged or lost items are charged at repair or replacement value.",
              "Requests are held for five days after approval.",
            ].map((r) => (
              <li key={r} className="flex gap-3">
                <svg viewBox="0 0 20 20" className="mt-1 h-4 w-4 shrink-0 text-forest-3" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Visit us</h2>
        <div className="card mt-4 p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-3">Address</dt>
              <dd className="mt-1 text-[15px]">12 Reading Lane, Alyana</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-3">Telephone</dt>
              <dd className="mt-1 text-[15px]">555-0100</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-3">Email</dt>
              <dd className="mt-1 text-[15px]">desk@alyanalibrary.test</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-3">Membership</dt>
              <dd className="mt-1 text-[15px]">Free for all residents</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/register" className="btn-primary px-6 py-3 text-base">
          Join the library
        </Link>
        <Link href="/books" className="btn-secondary px-6 py-3 text-base">
          Browse the catalogue
        </Link>
      </div>
    </div>
  );
}
