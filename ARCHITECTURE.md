# Library Website — System Architecture

**Stack:** Next.js 15 (App Router) · TypeScript · PostgreSQL · Prisma · Auth.js · Tailwind + shadcn/ui
**Repo:** `aalyanaaudrey/library-website` · **Status:** design stage

---

## 1. Overview

A public-facing library system with four capability areas:

| # | Area | Primary users |
|---|------|---------------|
| 1 | **Book Catalog** — browse, search, filter, availability | Guests, Members |
| 2 | **Borrowing & Rental** — requests, loans, renewals, fees | Members |
| 3 | **User Accounts** — registration, profile, borrowing history | Members |
| 4 | **Admin Dashboard** — inventory, approvals, returns, reports | Librarian, Admin |
| 5 | **Announcements & Reviews** — blog posts, ratings | All |

### Design principles

- **Server-first.** Catalog pages are Server Components — no client JS for reads. Keeps it fast and SEO-friendly for public book pages.
- **Role-gated by default.** Every mutating route re-checks authorization server-side. UI hiding is a convenience, never the control.
- **Money and dates are explicit.** Fees, due dates, and penalties are computed server-side and stored as immutable snapshots so history never rewrites itself.
- **Auditable.** Every loan state change writes an `LoanEvent` row.

---

## 2. High-level architecture

```
                        ┌──────────────────────────────┐
                        │          Browser             │
                        └──────────────┬───────────────┘
                                       │ HTTPS
                        ┌──────────────▼───────────────┐
                        │   Next.js (Vercel / Node)    │
                        │                              │
                        │  ┌────────────────────────┐  │
                        │  │  App Router (RSC)      │  │  public pages,
                        │  │  Server Components     │  │  catalog, SSR
                        │  └────────────────────────┘  │
                        │  ┌────────────────────────┐  │
                        │  │  Route Handlers /api   │  │  mutations, auth,
                        │  │  + Server Actions      │  │  admin ops
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
                        │        PostgreSQL            │
                        │   (Neon / Supabase / local)  │
                        └──────────────────────────────┘
```

**Key boundary:** UI never touches Prisma directly for writes. All business rules live in `lib/services`, so the same logic serves a Server Action, an API route, and a future mobile client identically.

---

## 3. Directory structure

```
library-website/
├── app/
│   ├── (public)/                  # no auth required
│   │   ├── page.tsx               # home
│   │   ├── books/
│   │   │   ├── page.tsx           # catalog + filters (search params)
│   │   │   └── [slug]/page.tsx    # book detail, reviews
│   │   ├── announcements/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   └── about/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (member)/                  # requires MEMBER+
│   │   ├── account/
│   │   │   ├── page.tsx           # profile
│   │   │   ├── borrowings/page.tsx
│   │   │   └── fines/page.tsx
│   │   └── borrow/[bookId]/page.tsx
│   ├── (admin)/                   # requires LIBRARIAN/ADMIN
│   │   └── admin/
│   │       ├── page.tsx           # dashboard + reports
│   │       ├── books/             # CRUD
│   │       ├── requests/page.tsx  # approve / reject
│   │       ├── returns/page.tsx
│   │       ├── members/page.tsx
│   │       └── announcements/
│   ├── api/                       # route handlers (external API surface)
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── books/route.ts
│   │   ├── loans/route.ts
│   │   └── admin/...
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui primitives
│   ├── catalog/                   # BookCard, Filters, SearchBar
│   ├── borrowing/                 # BorrowDialog, LoanStatusBadge
│   └── admin/                     # DataTable, ApproveButton
├── lib/
│   ├── auth.ts                    # Auth.js config
│   ├── db.ts                      # Prisma singleton
│   ├── rbac.ts                    # role checks + helpers
│   ├── services/                  # ★ all business logic
│   │   ├── catalog.service.ts
│   │   ├── loan.service.ts
│   │   ├── fine.service.ts
│   │   └── user.service.ts
│   ├── validators/                # Zod schemas
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                    # sample books, admin user
│   └── migrations/
├── emails/                        # React Email templates
└── tests/
    ├── unit/                      # service-layer rules
    └── e2e/                       # Playwright critical paths
```

---

## 4. Data model

### Entity relationship (simplified)

```
User ──1:N──► LoanRequest ──N:1──► Book ──N:M──► Author
  │               │                  │
  │               ▼                  ▼
  │           LoanEvent          BookCopy ──► (physical copy, status)
  │
  ├──1:N──► Review ──N:1──► Book
  ├──1:N──► Fine
  └──1:N──► Notification
                ▲
Announcement ───┘ (broadcast)
```

### Enums

```prisma
enum Role        { MEMBER  LIBRARIAN  ADMIN }
enum BookStatus  { AVAILABLE  BORROWED  RESERVED  MAINTENANCE  RETIRED }
enum CopyStatus  { AVAILABLE  ON_LOAN  RESERVED  DAMAGED  LOST }
enum LoanStatus  { PENDING  APPROVED  ACTIVE  RETURNED  REJECTED  CANCELLED  OVERDUE }
enum LoanType    { BORROW  RENTAL }        // RENTAL accrues a fee
enum FineStatus  { UNPAID  PAID  WAIVED }
```

### Core models

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?                      // null when OAuth-only
  name          String
  role          Role      @default(MEMBER)
  phone         String?
  address       String?
  memberNo      String    @unique            // library card number
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())

  loans         LoanRequest[]
  reviews       Review[]
  fines         Fine[]
  notifications Notification[]
}

model Author {
  id       String @id @default(cuid())
  name     String
  slug     String @unique
  bio      String?
  books    Book[]
}

model Genre {
  id    String @id @default(cuid())
  name  String @unique
  slug  String @unique
  books Book[]
}

model Book {
  id          String     @id @default(cuid())
  title       String
  slug        String     @unique
  isbn        String?    @unique
  publisher   String?
  year        Int?
  edition      String?
  pages       Int?
  description  String?
  coverUrl    String?
  status      BookStatus @default(AVAILABLE)
  feePerWeek  Decimal?   @default(0)        // null/0 => free to borrow
  rentPerWeek Decimal?                      // null => not for rent
  createdAt   DateTime   @default(now())

  authors     BookAuthor[]
  genres      BookGenre[]
  copies      BookCopy[]
  loans       LoanRequest[]
  reviews     Review[]

  @@index([title])
  @@index([isbn])
}

model BookCopy {                            // one physical copy
  id       String     @id @default(cuid())
  bookId   String
  barcode  String     @unique                // scanned at the desk
  status   CopyStatus @default(AVAILABLE)
  book     Book       @relation(fields: [bookId], references: [id])
}

model LoanRequest {
  id            String     @id @default(cuid())
  userId        String
  bookId        String
  type          LoanType   @default(BORROW)
  status        LoanStatus @default(PENDING)

  requestedAt   DateTime   @default(now())
  periodWeeks   Int        @default(2)
  approvedAt    DateTime?
  dueAt         DateTime?                    // set on approval
  returnedAt    DateTime?

  feeCents      Int        @default(0)        // snapshot at approval time
  renewalsUsed  Int        @default(0)

  user          User       @relation(fields: [userId], references: [id])
  book          Book       @relation(fields: [bookId], references: [id])
  events        LoanEvent[]
  fines         Fine[]

  @@index([status])
  @@index([dueAt])
  @@index([userId])
}

model LoanEvent {                            // append-only audit trail
  id        String   @id @default(cuid())
  loanId    String
  from      LoanStatus?
  to        LoanStatus
  note      String?
  actorId   String?
  createdAt DateTime @default(now())
  loan      LoanRequest @relation(fields: [loanId], references: [id], onDelete: Cascade)
}

model Fine {
  id        String     @id @default(cuid())
  userId    String
  loanId    String?
  amountCents Int
  reason    String                        // OVERDUE | DAMAGED | LOST | RENTAL
  status    FineStatus @default(UNPAID)
  createdAt DateTime   @default(now())
  paidAt    DateTime?
  user      User       @relation(fields: [userId], references: [id])
  loan      LoanRequest? @relation(fields: [loanId], references: [id])
}

model Review {
  id        String   @id @default(cuid())
  userId    String
  bookId    String
  rating    Int                            // 1..5, enforced by Zod
  title     String?
  body      String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  book      Book     @relation(fields: [bookId], references: [id])

  @@unique([userId, bookId])               // one review per member per book
}

model Announcement {
  id        String   @id @default(cuid())
  title     String
  slug      String   @unique
  body      String
  pinned    Boolean  @default(false)
  publishedAt DateTime?
  createdAt DateTime @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  body      String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

### Money handling

All amounts are **integer cents** (`feeCents`, `amountCents`) — never floats. Display layer divides by 100.

---

## 5. Borrowing domain rules

The loan lifecycle is the heart of the system. All of it lives in `lib/services/loan.service.ts`.

```
                     ┌──────────┐
   member submits ──►│ PENDING  │
                     └────┬─────┘
              approve │        │ reject
                       ▼        ▼
               ┌──────────┐  ┌──────────┐
               │ APPROVED │  │ REJECTED │ (terminal)
               └────┬─────┘  └──────────┘
         member picks up│
                    ▼
              ┌──────────┐   renew (max N)
              │  ACTIVE  │◄──────────────┐
              └──┬───┬───┘               │
      return     │   │  due date passes  │
                 ▼   └───────────────────┘
           ┌──────────┐
           │ RETURNED │ (terminal)  → may generate a Fine
           └──────────┘

   CANCELLED — member withdraws while PENDING/APPROVED
   OVERDUE   — derived view of ACTIVE where dueAt < now()
```

### Invariants enforced in the service layer

| Rule | Enforcement |
|------|-------------|
| Cannot borrow with an unpaid fine | `fine.service.hasOutstandingBalance()` gate in `createLoanRequest` |
| Max concurrent active loans per member | configurable, default **5** |
| Renewal cap | default **2** renewals, each extending by `periodWeeks` |
| One active loan per book copy | enforced with a transaction + row lock |
| Fee snapshot | `feeCents` copied from `Book` at approval; later price changes never rewrite history |
| Overdue blocks new requests | `isOverdue(userId)` gate |
| Availability | `Book.status` recomputed from `BookCopy` after every mutation |

### Overdue detection

A nightly job (Vercel Cron / node-cron) sweeps `LoanRequest` where `status = ACTIVE AND dueAt < now()`:

1. Set `status = OVERDUE`
2. Emit a `Notification`
3. Open a `Fine` of `overduePerDay × daysLate`

Checked lazily on read too, so the badge is correct even if the cron lags.

---

## 6. Authorization (RBAC)

```ts
// lib/rbac.ts
export const can = (role: Role, action: Action, resource?): boolean
```

| Capability | MEMBER | LIBRARIAN | ADMIN |
|---|:--:|:--:|:--:|
| Browse catalog | ✅ | ✅ | ✅ |
| Submit borrow request | ✅ | ✅ | ✅ |
| View own loans / fines | ✅ | ✅ | ✅ |
| Write reviews | ✅ | ✅ | ✅ |
| Approve / reject requests | ❌ | ✅ | ✅ |
| Record returns | ❌ | ✅ | ✅ |
| Manage inventory | ❌ | ✅ | ✅ |
| Manage members | ❌ | ❌ | ✅ |
| Manage announcements | ❌ | ✅ | ✅ |
| Waive fines | ❌ | ❌ | ✅ |
| View reports | ❌ | ✅ | ✅ |

**Enforced in three places**, always all three:
1. `middleware.ts` — route-level gate (fast rejection)
2. `lib/rbac.ts` — called inside every service mutation
3. UI conditional render (convenience only)

---

## 7. API surface

Server Actions for same-app mutations; Route Handlers for anything needing to be a real HTTP endpoint (webhooks, cron, external clients).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/books?q=&genre=&year=&page=` | public | search + filter + paginate |
| `GET` | `/api/books/[id]` | public | detail + avg rating |
| `POST` | `/api/loans` | member | submit borrow/rent request |
| `GET` | `/api/loans?scope=mine` | member | own borrowing history |
| `POST` | `/api/loans/[id]/renew` | member | request renewal |
| `POST` | `/api/loans/[id]/cancel` | member | withdraw request |
| `PATCH` | `/api/admin/loans/[id]` | librarian | approve / reject / mark returned |
| `GET` | `/api/admin/reports` | librarian | counts, overdue, popular titles |
| `POST` | `/api/cron/overdue` | cron secret | nightly overdue sweep |
| `POST` | `/api/auth/[...nextauth]` | — | Auth.js handlers |

### Search implementation

```sql
-- trigram index for typo-tolerant title/author search
CREATE INDEX book_title_trgm ON "Book" USING gin (title gin_trgm_ops);
```

Filters (genre, year, availability) are composed as a dynamic Prisma `where`. Pagination is **cursor-based** for the catalog to stay fast at scale.

---

## 8. Auth

**Auth.js (NextAuth) v5** with:
- **Credentials** — email + bcrypt password (primary)
- **Google OAuth** — optional, one-click signup
- Sessions via **JWT strategy** (no DB hit per request)

Registration requires: email, name, password, confirm password. On success a `memberNo` is auto-generated (`LIB-000123`) and a welcome `Notification` is created.

Password rules: minimum 8 characters, hashed with **bcrypt (12 rounds)**.

---

## 9. Frontend

- **Server Components** for all catalog/detail/announcement pages
- **Client Components** only where interaction demands it: filters, borrow dialog, review form, admin tables
- **TanStack Query** for client-side fetching in the admin dashboard
- **Zod** schemas shared between client form validation and server mutation
- **React Hook Form** for forms
- **shadcn/ui + Tailwind** for the component system

### Catalog query params drive the server

`/books?q=harry&genre=fantasy&year=2000&avail=1` → Server Component reads `searchParams`, queries Prisma, renders. Fully shareable, bookmarkable, SEO-correct URLs. No client state library needed for the public site.

---

## 10. Deployment

| Concern | Choice |
|---|---|
| Hosting | **Vercel** (first-class Next.js) |
| Database | **Neon** (Postgres, free tier) or Supabase |
| Files/covers | **Cloudinary** or Supabase Storage |
| Email | **Resend** + React Email |
| Cron | Vercel Cron (`/api/cron/overdue`) |
| Analytics | Vercel Analytics |

**Free-tier friendly:** Vercel + Neon + Cloudinary all have usable free tiers, so the whole thing can run at £0.

### Environment variables

```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_GITHUB_ID=""            # optional
AUTH_GITHUB_SECRET=""
CRON_SECRET=""
CLOUDINARY_URL=""
```

`.env` is git-ignored — credentials never enter the repo.

---

## 11. Build phases

| Phase | Deliverable | Est. |
|---|---|---|
| **0** | Scaffold Next.js + Tailwind + Prisma + Auth.js, seed data, CI | — |
| **1** | Catalog: list, detail, search, filters, availability | 2–3 days |
| **2** | Accounts: register, login, profile, borrowing history | 2 days |
| **3** | Borrowing: request → approve → active → returned, renewals | 3–4 days |
| **4** | Admin: inventory CRUD, request queue, returns, member mgmt | 3–4 days |
| **5** | Fines, penalties, reports, overdue cron | 2 days |
| **6** | Announcements + reviews + ratings | 2 days |
| **7** | Polish: a11y, SEO, email notifications, E2E tests | 2–3 days |

**Start with Phase 1.** It is fully independent, needs no auth, and produces something visible immediately.

---

## 12. Testing

| Layer | Tool | What |
|---|---|---|
| Unit | **Vitest** | loan rules, fine math, RBAC matrix |
| Integration | **Vitest + test DB** | service layer against real Postgres |
| E2E | **Playwright** | browse → borrow → approve → return |
| Static | **Biome / ESLint + tsc** | types and lint |

The RBAC matrix in §6 becomes a table-driven test — every role × every action, asserted.

---

## 13. Non-functional

- **Accessibility:** WCAG 2.1 AA — keyboard-navigable catalog, labelled forms, visible focus
- **Performance:** LCP < 2.5s; catalog is server-rendered with ISR (revalidate 60s)
- **Security:** CSRF via NextAuth, rate-limited auth routes, Zod-validated inputs, parameterised queries only, no secrets in the repo
- **Seed data:** `prisma/seed.ts` creates ~40 books, 3 authors, 1 admin, 2 members so the app is demo-able on first run
