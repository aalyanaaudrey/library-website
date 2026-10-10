# Library Website — System Architecture

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · SQLite + Prisma · Tailwind CSS v4
**Repo:** `aalyanaaudrey/library-website` · **Status:** built and running

---

## 1. Overview

A public-facing library system with five capability areas:

| # | Area | Primary users |
|---|------|---------------|
| 1 | **Book Catalog** — browse, search, filter, availability | Guests, Members |
| 2 | **Borrowing & Rental** — requests, approvals, renewals, fees | Members |
| 3 | **User Accounts** — registration, profile, history, balances | Members |
| 4 | **Admin Dashboard** — inventory, approvals, returns, penalties, reports | Librarian, Admin |
| 5 | **Announcements & Reviews** — blog posts, star ratings | All |

### Design principles

- **Server-first.** Catalog pages are Server Components — no client JS for reads. Keeps public book pages fast and SEO-friendly.
- **Role-gated by default.** Every mutation re-checks authorization server-side. UI hiding is a convenience, never the control.
- **Money and dates are explicit.** Fees, due dates and penalties are computed server-side and stored as immutable snapshots, so history never rewrites itself.
- **Auditable.** Every loan state change writes a `LoanEvent` row.
- **Vocabulary in one place.** SQLite has no native enums, so allowed string values live in `lib/constants.ts` and are validated with Zod at every edge.

---

## 2. High-level architecture

```
                        ┌──────────────────────────────┐
                        │          Browser             │
                        └──────────────┬───────────────┘
                                       │ HTTPS
                        ┌──────────────▼───────────────┐
                        │        Next.js (Node)        │
                        │                              │
                        │  ┌────────────────────────┐  │
                        │  │  App Router (RSC)      │  │  public pages,
                        │  │  Server Components     │  │  catalog, SSR
                        │  └────────────────────────┘  │
                        │  ┌────────────────────────┐  │
                        │  │  Server Actions        │  │  all mutations,
                        │  │  + 2 route handlers    │  │  auth, admin ops
                        │  └───────────┬────────────┘  │
                        │              │               │
                        │  ┌───────────▼────────────┐  │
                        │  │  Service layer         │  │  domain rules:
                        │  │  (lib/services)        │  │  loans, fees, RBAC
                        │  └───────────┬────────────┘  │
                        │              │               │
                        │  ┌───────────▼────────────┐  │
                        │  │  Prisma ORM            │  │
                        │  └───────────┬────────────┘  │
                        └──────────────┼───────────────┘
                                       │
                        ┌──────────────▼───────────────┐
                        │         SQLite               │
                        │   prisma/dev.db (local file)  │
                        └──────────────────────────────┘
```

**Key boundary:** UI never writes through Prisma directly for business operations. All rules live in `lib/services`, so the same logic serves a Server Action today and a future mobile client identically.

**Why SQLite.** The brief asks for a site that runs. SQLite needs no server, no Docker and no credentials — `npm run setup` produces a working database on any machine. Prisma isolates the choice, so swapping `provider = "sqlite"` for `postgresql` in `prisma/schema.prisma` is the only change required to move to a hosted database.

---

## 3. Directory structure

```
library-website/
├── app/
│   ├── page.tsx                   # home: hero, featured, latest news
│   ├── layout.tsx                 # shell, header, footer, session
│   ├── globals.css                # Tailwind v4 entry + design tokens
│   ├── books/
│   │   ├── page.tsx               # catalog + filters (search params)
│   │   └── [slug]/page.tsx        # book detail, reviews, borrow form
│   ├── announcements/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── about/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── account/                   # MEMBER+ (layout = account nav)
│   │   ├── page.tsx               # overview: balance, loans, notifications
│   │   ├── borrowings/page.tsx    # current / pending / history tabs
│   │   ├── fines/page.tsx         # charges + balance
│   │   └── profile/page.tsx       # profile + password
│   ├── admin/                     # LIBRARIAN+ (layout = admin nav + RBAC gate)
│   │   ├── page.tsx               # dashboard, stats, overdue sweep
│   │   ├── requests/page.tsx      # approve / reject queue
│   │   ├── loans/page.tsx         # active / approved / returns
│   │   ├── fines/page.tsx         # penalties + rental fees
│   │   ├── books/                 # inventory list, new, [id]
│   │   ├── announcements/         # list, new, [id]
│   │   └── members/page.tsx       # activate / deactivate, roles
│   ├── api/
│   │   ├── auth/signout/route.ts      # POST sign-out
│   │   └── notifications/read/route.ts # POST mark-all-read
│   ├── actions/                  # "use server" modules
│   │   ├── auth.ts               # register, login, profile, password
│   │   ├── loans.ts              # request, renew, cancel, review, fines
│   │   └── admin.ts              # inventory, announcements, sweep, members
│   ├── unauthorised/page.tsx
│   └── not-found.tsx
├── components/
│   ├── ui.tsx                    # Badge, Callout, StatCard, EmptyState…
│   ├── notice.tsx                # flash-notice banner (see §7)
│   ├── cover-image.tsx           # client: cover load failure
│   ├── account-nav.tsx
│   ├── catalog/                  # BookCard, CatalogControls, ReviewForm
│   ├── borrowing/                # BorrowForm
│   ├── admin/                    # AdminNav, BookForm, AnnouncementForm
│   ├── account/                  # ProfileForms
│   └── site/                     # Header, Footer
├── lib/
│   ├── auth.ts                   # session create/verify, requireUser, requireRole
│   ├── rbac.ts                   # capability-based role checks (authoritative)
│   ├── constants.ts              # ROLES, CATEGORIES, statuses, RULES, LABELS
│   ├── validators.ts             # Zod schemas shared by every action
│   ├── db.ts                     # Prisma singleton
│   ├── utils.ts                  # slugify, money/date formatters, notice helpers
│   └── services/                 # ★ all business logic
│       ├── catalog.service.ts    # search, facets, shapeBook
│       ├── loan.service.ts       # request/approve/renew/return, audit trail
│       ├── fine.service.ts       # balances, charges, settlement
│       └── user.service.ts       # registration, profile, notifications
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                   # 31 books, users, announcements, reviews
├── autosync.ps1                  # auto-commit/push watcher
├── Start-AutoSync.cmd
└── ARCHITECTURE.md
```

---

## 4. Data model

### Entity relationship (simplified)

```
User ──1:N──► Loan ──N:1──► Book ──N:M──► Author
  │             │             │  └─N:M──► Genre
  │             ▼             │
  │         LoanEvent         └──1:N──► BookCopy ──► (physical copy)
  │             │
  ├──1:N──► Fine◄──┘
  ├──1:N──► Review ──N:1──► Book
  ├──1:N──► Notification
  └──1:N──► Session

Announcement (standalone, broadcast)
```

### Vocabularies

Native Prisma enums were dropped because SQLite has no enum type. The
equivalent string unions live in `lib/constants.ts`:

```ts
ROLES         = MEMBER | LIBRARIAN | ADMIN
BOOK_STATUS   = AVAILABLE | BORROWED | RESERVED | MAINTENANCE | RETIRED
COPY_STATUS   = AVAILABLE | ON_LOAN | RESERVED | DAMAGED | LOST
LOAN_STATUS   = PENDING | APPROVED | ACTIVE | RETURNED | REJECTED | CANCELLED
LOAN_TYPE     = BORROW | RENTAL            // RENTAL accrues a fee
FINE_REASON   = OVERDUE | DAMAGED | LOST | RENTAL
FINE_STATUS   = UNPAID | PAID | WAIVED
CATEGORIES    = Fiction, Mystery & Thriller, Science Fiction & Fantasy, … (12)
```

`OVERDUE` is not a stored loan status — a loan is overdue when `dueAt < now()`
and its status is `ACTIVE`. Keeping it derived means a single overdue sweep
cannot put the row in two states at once.

### Core models

The full schema is `prisma/schema.prisma`. The parts that carry the domain:

```prisma
model Book {
  title       String
  slug        String  @unique
  isbn        String? @unique
  year        Int?
  category    String  @default("Fiction")   // broad shelf grouping
  status      String  @default("AVAILABLE")

  borrowFeeCents       Int  @default(0)     // 0 = free to borrow
  rentalFeeCents       Int?                 // null = not for rent
  overdueFinePerDayCents Int @default(50)

  authors  BookAuthor[]                     // N:M
  genres   BookGenre[]                      // N:M
  copies   BookCopy[]                       // physical stock
  loans    Loan[]
  reviews  Review[]
}

model BookCopy {                            // one physical item
  barcode String @unique                    // BC-00001, scanned at the desk
  status  String @default("AVAILABLE")
}

model Loan {
  type     String @default("BORROW")        // BORROW | RENTAL
  status   String @default("PENDING")
  periodWeeks  Int      @default(2)
  dueAt         DateTime?
  renewalsUsed  Int      @default(0)
  feeCents      Int      @default(0)        // snapshot at approval time
  copyId        String?                     // assigned on approval
  events   LoanEvent[]                      // append-only audit trail
  fines    Fine[]
}

model Review {
  rating Int                                 // 1..5, enforced by Zod
  @@unique([userId, bookId])                // one review per member per book
}
```

**Money is integer cents.** Never floats — `formatMoney()` in `lib/utils.ts`
is the only place a decimal is produced.

**Fees are snapshotted.** `Loan.feeCents` is written at approval, so changing a
book's price never rewrites what someone was charged.

---

## 5. Authorization

Capability-based, not role-name-based. `lib/rbac.ts` is the single authority:

```ts
can(role, capability)      // e.g. can(user.role, "loan:approve")
```

| Capability | MEMBER | LIBRARIAN | ADMIN |
|---|:--:|:--:|:--:|
| `catalog:read` · `loan:request` · `review:write` | ✓ | ✓ | ✓ |
| `loan:own:read` / `loan:own:renew` / `loan:own:cancel` | ✓ | ✓ | ✓ |
| `fine:own:pay` | ✓ | ✓ | ✓ |
| `loan:approve` · `loan:return` | — | ✓ | ✓ |
| `loan:renew` (on a member's behalf) | — | ✓ | ✓ |
| `inventory:manage` · `announcement:manage` | — | ✓ | ✓ |
| `report:read` | — | ✓ | ✓ |
| `member:manage` · `fine:waive` | — | — | ✓ |

Ownership variants exist alongside the staff ones: a member renews their own
loan via `loan:own:renew`, staff renew anyone's via `loan:renew`.
`canActOnOwn(role, ownCapability, isOwner)` is the helper for that split.

Checks run in three places, in this order:

1. **Route gate** — `app/admin/layout.tsx` and `app/account/layout.tsx` call
   `requireRole(...)`; the wrong role lands on `/unauthorised`.
2. **Action** — every Server Action re-checks before it touches the database.
   The UI is never the control.
3. **UI** — buttons are hidden when `can(...)` is false, so members are not
   shown controls they cannot use.

---

## 6. Borrowing state machine

```
                 ┌──────────────── cancel ────────────────┐
                 ▼                                        │
  [member] ── request ──► PENDING ── approve ──► APPROVED ── mark collected ──► ACTIVE
                 │            │                    │                            │
                 │            └── reject ──► REJECTED                          │
                 │                                                             │
                 └─────────────────────────────────────── return ──► RETURNED ◄─┤
                                                                              │
                                              renew (≤ MAX_RENEWALS) ─────────┘
                                                    moves dueAt forward
```

- **PENDING** — a free copy is *reserved* (its status flips off `AVAILABLE`) so
  two members cannot both request the last copy.
- **APPROVED** — a `BookCopy` and a `dueAt` are assigned; the loan waits for
  collection. The member is notified.
- **ACTIVE** — the copy is physically out. Renewals push `dueAt` forward while
  `renewalsUsed < MAX_RENEWALS`; returning an already-overdue loan is blocked
  (it must be settled first).
- **RETURNED** — the copy goes back to `AVAILABLE`, any overdue charge is
  calculated and recorded as a `Fine`.

Every transition appends a `LoanEvent` row (`from`, `to`, `actorId`, `note`),
so `/admin/loans` can show the full history of any item.

**Overdue** is derived, not stored. `runOverdueSweepAction` (dashboard button)
flags late loans, notifies the member and applies `overdueFinePerDayCents ×
daysLate` as a `Fine`. It is idempotent: a loan already carrying an overdue
charge is skipped.

---

## 7. Mutations, redirects and flash notices

### Why redirects

A Server Action cannot write to the page it was submitted from — it can only
return data or redirect. Every mutation therefore ends in a `redirect()` that
carries the outcome in the query string:

```
?ok=<key>       a known success key  → rendered from a dictionary
?err=<message>  a failure message     → rendered as an alert
```

`components/notice.tsx` holds the dictionary. `NOTICES` maps a key to a tone,
title, body and optional call-to-action, so user-facing copy lives in exactly
one place and raw query input is never rendered:

```tsx
<Notice ok={first(sp.ok)} err={first(sp.err)} />
// role="status" for success, role="alert" for failure
```

Two helpers make this one line in every action (`lib/utils.ts`, which is not a
`"use server"` module — those may only export async functions):

```ts
withNotice(path, "ok", "returned")   // → "/admin/loans?status=RETURNED&ok=returned"
safeReturnTo(value, fallback)        // validated return target, never an open redirect
```

The success destination **follows the item to its new tab** — approving sends
you to `?status=APPROVED`, recording a return sends you to `?status=RETURNED` —
so the confirmation always sits next to the row it is about.

Notices also survive a reload, because they are part of the URL.

### Flash-notice keys

`requested` · `cancelled` · `renewed` · `approved` · `rejected` ·
`collected` · `returned` · `fineSettled` · `saved` · `registered` ·
`created` · `bookRemoved` · `announcementSaved` · `announcementRemoved` · `swept`

### Forms that do *not* redirect

`useActionState` forms (profile, password, borrow request, review) return
`{ ok }` / `{ error }` / `{ fieldErrors }` from the action instead, because the
form stays on the page. Those render an inline `<Callout>` — there is no
`?ok=` involved.

---

## 8. Auth

Hand-rolled session authentication — no Auth.js, because it would add a
dependency and a config surface for what is a two-table problem.

1. **Register** (`registerAction`) — Zod-validates name/email/password,
   bcrypt-hashes (12 rounds), mints a `memberNo` (`LIB-000003`), creates a
   welcome `Notification` and signs the user in.
2. **Sign in** (`loginAction`) — verifies the hash, creates a `Session` row
   holding an opaque random token, and sets `lib_session` as an `httpOnly`,
   `sameSite=lax` cookie.
3. **Every request** — `getCurrentUser()` resolves the cookie to a user.
   `requireUser()` / `requireRole()` gate protected areas.
4. **Sign out** — `POST /api/auth/signout` deletes the session row.

`SESSION_DURATION_DAYS` (default 30) controls expiry; expired rows are ignored.
Changing a password deletes every other session for that user, then creates a
fresh one.

Password rules: minimum 8 characters, confirmed twice, hashed with bcrypt.

---

## 9. Catalog: search, filters, facets

`/books` reads `searchParams` in a Server Component, composes a Prisma `where`,
and renders. Fully shareable, bookmarkable, SEO-correct URLs with no client
state library.

| Param | Meaning |
|---|---|
| `q` | keyword across title, ISBN, description, author name, genre name and category |
| `genre` | genre slug (exact) |
| `category` | shelf category (exact) |
| `year` | publication year, or `recent` (last 5 years) or `pre2000` |
| `avail` | `1` → only titles with a free copy |
| `sort` | `title_asc` (default) · `title_desc` · `year_desc` · `year_asc` · `newest` |
| `page` | 1-based page |

`genre`, `category` and `year` are independent facets and compose freely —
`/books?category=Fiction&genre=classics` works, as does combining either with a
keyword.

Facet counts come from `listGenres()` / `listCategories()` / `listYears()`, so
the filter never offers an option with zero results.

**Category vs Genre.** `category` is the broad shelf a book sits on (one per
book, from a fixed 12-item list). `genre` is the finer tagging a book carries
(many per book: Dystopian, Classics, …). The brief asks for both, and a single
field cannot serve as both a coarse and a fine filter.

**Pagination is offset-based** (`skip`/`take`). For the collection sizes this
app targets — and with `@@index` on `title`, `status` and `category` — it is
simpler and correct. Cursor pagination would be the change if the catalog grew
by orders of magnitude.

`shapeBook()` is the one projection from a Prisma row to what the UI needs, so
book cards, the detail page and search results can never drift apart.

---

## 10. Validation

`lib/validators.ts` holds every Zod schema; Server Actions parse `FormData`
through them before touching the database.

A recurring trap is handled explicitly: **blank numeric inputs arrive as the
empty string**, and `z.coerce.number()` would turn that into `0` — inventing
"year 0" or failing a min bound with a confusing message. `optionalInt()`
normalises `""`/`null` to "unset" first, so leaving Year, Pages or Rental fee
blank stores `null`, not `0`.

Failures return `{ fieldErrors, error }` to `useActionState`, which highlights
the offending inputs inline.

---

## 11. Frontend

- **Server Components** for every catalog, detail, account and admin page.
  Almost all pages are `export const dynamic = "force-dynamic"` because they
  read a session cookie.
- **Client Components** only where interaction demands it:
  `CatalogControls` (filters), `BorrowForm`, `ReviewForm`, the admin forms,
  and `CoverImage` — a Server Component cannot take an `onError` handler, so
  cover-image failure handling has to be a client component.
- **Tailwind CSS v4** with `@theme` tokens in `app/globals.css`. No component
  library — `components/ui.tsx` holds the handful of primitives actually used
  (`Badge`, `Callout`, `StatCard`, `EmptyState`).
- **Zod** schemas are shared between client-visible form errors and server
  mutation, so the two can never disagree.

### Known platform quirks

- Server Components cannot accept event handlers — hence `CoverImage`.
- Tailwind v4 rejects `@apply` on user-defined classes; use plain utilities.
- `"use server"` modules may only export async functions, so `withNotice()` and
  `safeReturnTo()` live in `lib/utils.ts`.

---

## 12. Deployment

| Concern | Choice |
|---|---|
| Hosting | Any Node host — `npm run build && npm start`. Railway: attach a volume and set `DATABASE_URL` to an absolute path on it. Vercel has a read-only filesystem, so use a hosted Postgres there. |
| Database | SQLite locally and on a volume-backed container; swap to Postgres by changing one line in `prisma/schema.prisma` |
| Covers | Open Library cover URLs (`covers.openlibrary.org`), stored per book |
| Email | Out of scope for this build; `Notification` rows stand in for in-app mail |
| Cron | The overdue sweep is a dashboard button; wire `runOverdueSweepAction` to a cron route for unattended runs |

### Environment variables

See `.env.example`:

```bash
DATABASE_URL="file:./dev.db"     # production: absolute path on a volume
SESSION_DURATION_DAYS="30"

# Library rules
LOAN_PERIOD_WEEKS="2"
MAX_ACTIVE_LOANS="5"
MAX_RENEWALS="2"
OVERDUE_FINE_PER_DAY_CENTS="50"
```

`DATABASE_URL` is the only required variable; everything else has a working
default. Sessions are rows in the `Session` table, so there is no signing
secret to manage. `.env` is git-ignored; `.env.example` is committed.

### Boot sequence

`npm start` runs `prisma db push && tsx prisma/seed.ts && next start`.
`db push` is idempotent and the seed self-guards (it exits immediately if any
user row exists, unless `--force` is passed), so both are safe to run on every
container start. That is what makes a fresh volume populate itself on first
boot without wiping data on later ones.

---

## 13. Getting started

```bash
npm install
npm run setup      # prisma generate + db push + seed
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`.

### Seed data

31 books · 30 authors · 20 genres · 119 copies · 4 users · 4 announcements ·
11 reviews.

Demo accounts (password `password123` for all):

| Email | Role |
|---|---|
| `admin@library.test` | ADMIN |
| `librarian@library.test` | LIBRARIAN |
| `member@library.test` | MEMBER |
| `priya@library.test` | MEMBER |

`npm run db:reset` drops and reseeds. `prisma/dev.db` is git-ignored — every
clone starts clean.
