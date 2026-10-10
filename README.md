# Library Website

A library management website built with **Next.js 15 · React 19 · TypeScript · SQLite + Prisma · Tailwind CSS v4**.

📖 **[Full system architecture →](./ARCHITECTURE.md)**

## Features

| Area | Capabilities |
|---|---|
| **Book Catalog** | Browse, search by title/author/ISBN/keyword, filter by **genre, category and publication year**, sort, paginate, live availability |
| **Borrowing & Rental** | Borrow or rent requests, chosen period, fee and expected return shown up front, approve/reject, collect, renew within library rules, full loan history |
| **User Accounts** | Register, sign in, edit profile and password, current and past borrowings, due dates, outstanding balance, in-app notifications |
| **Admin Dashboard** | Add/edit/remove books, availability per copy, approve/reject requests, record hand-outs and returns, overdue sweep, penalties and rental fees, report cards |
| **Announcements & Reviews** | Library news with pinned posts, star ratings and member reviews (one per member per book) |

**Roles:** `MEMBER` → `LIBRARIAN` → `ADMIN`, enforced by capability checks in the route layout, the service layer and the UI.

## Getting started

```bash
npm install
npm run setup      # prisma generate + db push + seed
npm run dev        # http://localhost:3000
```

Production build: `npm run build && npm start`.

Other scripts: `npm run db:reset` (drop and reseed), `npm run db:studio`,
`npm run db:seed`.

Copy `.env.example` to `.env` and set `AUTH_SECRET` before deploying.

### Demo accounts

Password for all four is `password123`.

| Email | Role |
|---|---|
| `admin@library.test` | ADMIN |
| `librarian@library.test` | LIBRARIAN |
| `member@library.test` | MEMBER |
| `priya@library.test` | MEMBER |

The seed creates 31 books, 30 authors, 20 genres, 119 physical copies,
4 announcements and 11 reviews. The database file (`prisma/dev.db`) is
git-ignored, so every fresh clone starts clean.

## Project skills

Twelve focused skills are installed in `.opencode/skills/` for this stack:

`nextjs-developer` · `react-expert` · `typescript-pro` · `fullstack-dev` ·
`api-designer` · `postgres-pro` · `database-optimizer` · `secure-code-guardian` ·
`web-design` · `test-master` · `code-reviewer` · `debugging-wizard`

## Auto-sync to GitHub

This folder is wired to automatically commit and push to
[`aalyanaaudrey/library-website`](https://github.com/aalyanaaudrey/library-website)
whenever files change.

### How it works

`autosync.ps1` polls the working tree every 5 seconds. Once changes have
settled for 20 seconds (so it waits for you to stop typing), it runs:

```
git add -A
git commit -m "autosync: N file(s) changed at <timestamp>"
git push
```

If the machine goes offline, commits are held locally and pushed
automatically on the next successful cycle.

### Running it

**Double-click** `Start-AutoSync.cmd`, or from a terminal:

```powershell
.\autosync.ps1              # watch for changes (Ctrl+C to stop)
.\autosync.ps1 -Once        # sync once right now, then exit
.\autosync.ps1 -QuietSeconds 60   # fewer, larger commits
```

### Start automatically at login

```powershell
$action    = New-ScheduledTaskAction -Execute "pwsh.exe" `
               -Argument "-NoProfile -ExecutionPolicy Bypass -File `"C:\AI WEB\Website Alyana\autosync.ps1`""
$trigger   = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERNAME"
$settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
               -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
Register-ScheduledTask -TaskName "AlyanaAutoSync" -Action $action `
               -Trigger $trigger -Settings $settings -Force
```

Disable it later with `Unregister-ScheduledTask -TaskName "AlyanaAutoSync" -Confirm:$false`.

### Logs

Activity is written to `.git/autosync.log` (never tracked by git).

## Credentials

Git auth is stored in **Windows Credential Manager**, not in any file in this
repository. To rotate the token:

1. Revoke the old token at <https://github.com/settings/tokens>.
2. Create a new one with the `repo` scope.
3. Run:

```powershell
git credential-manager erase <<< "protocol=https
host=github.com"
```

then the next `git push` will prompt for the new username and token.
