import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-paper-2">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </span>
              <span className="font-display text-base font-semibold">Alyana Library</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-3">
              Browse the collection, reserve titles and manage your loans — all from home.
            </p>
          </div>

          <FooterCol
            title="Browse"
            links={[
              { href: "/books", label: "Full catalogue" },
              { href: "/books?avail=1", label: "Available now" },
              { href: "/announcements", label: "News & events" },
              { href: "/about", label: "About us" },
            ]}
          />

          <FooterCol
            title="Your account"
            links={[
              { href: "/account/borrowings", label: "My borrowings" },
              { href: "/account/fines", label: "Fines & balance" },
              { href: "/account", label: "Profile" },
              { href: "/register", label: "Join the library" },
            ]}
          />

          <div>
            <h3 className="text-sm font-semibold">Opening hours</h3>
            <dl className="mt-3 space-y-1.5 text-sm text-ink-3">
              <div className="flex justify-between gap-4">
                <dt>Mon – Wed</dt>
                <dd>9:00 – 18:00</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Thursday</dt>
                <dd>9:00 – 20:00</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Fri – Sat</dt>
                <dd>9:00 – 17:00</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Sunday</dt>
                <dd>Closed</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-ink-3 sm:flex-row">
          <p>© {new Date().getFullYear()} Alyana Library. Built with Next.js.</p>
          <p>
            Self-service returns available at the drop box beside the main entrance.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-ink-3 transition hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
