# Library Website

A library management website built with **Next.js 15 · TypeScript · PostgreSQL · Prisma · Auth.js**.

📖 **[Full system architecture →](./ARCHITECTURE.md)**

## Features

| Area | Capabilities |
|---|---|
| **Book Catalog** | Browse, search by title/author/ISBN, filter by genre & year, live availability |
| **Borrowing & Rental** | Borrow/rent requests, renewals, due dates, transaction history |
| **User Accounts** | Register, login, profile, borrowing history, balances |
| **Admin Dashboard** | Inventory CRUD, approve/reject requests, record returns, penalties, reports |
| **Announcements & Reviews** | Library blog posts, star ratings and member reviews |

**Roles:** `MEMBER` → `LIBRARIAN` → `ADMIN`, enforced in middleware, service layer, and UI.

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
