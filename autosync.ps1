<#
.SYNOPSIS
    Auto-commits and pushes this folder to GitHub whenever files change.

.DESCRIPTION
    Polls `git status` on a short interval. When the working tree has changes
    and has then stayed quiet for -QuietSeconds (default 20s, so it waits for
    you to stop typing), it stages everything, commits, and pushes.

    Polling rather than FileSystemWatcher is deliberate: it is far easier to
    reason about, immune to missed events, and `git status` is the ground
    truth for "did anything actually change that git cares about". Churn in
    ignored folders (node_modules, .git itself) produces no diff, so it never
    generates a commit.

    Safety properties:
      * Never runs two syncs at once.
      * A failed push (offline / auth) does not kill the watcher. Commits stay
        local and get pushed on the next successful cycle.
      * Everything is written to .git\autosync.log, which is never tracked.

.PARAMETER QuietSeconds
    How long the tree must stay unchanged before syncing. Default 20.

.PARAMETER PollSeconds
    How often to check for changes. Default 5.

.PARAMETER Once
    Run a single sync immediately and exit. Handy for a one-shot backup or
    for verifying the setup works.

.EXAMPLE
    .\autosync.ps1
    Start watching and sync on every change.

.EXAMPLE
    .\autosync.ps1 -Once
    Sync right now, then exit.

.EXAMPLE
    .\autosync.ps1 -QuietSeconds 60 -PollSeconds 10
    Wait a full minute of quiet, checking every 10s. Fewer, larger commits.
#>
[CmdletBinding()]
param(
    [int]$QuietSeconds = 20,
    [int]$PollSeconds  = 5,
    [switch]$Once,
    [string]$CommitPrefix = "autosync"
)

$ProjectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location $ProjectRoot

$LogPath  = Join-Path $ProjectRoot ".git\autosync.log"
$Upstream = "origin/main"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $line = "{0} [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    try { Add-Content -Path $LogPath -Value $line -Encoding UTF8 } catch { }
    switch ($Level) {
        "ERROR" { Write-Host $line -ForegroundColor Red   }
        "WARN"  { Write-Host $line -ForegroundColor Yellow }
        default { Write-Host $line -ForegroundColor Gray   }
    }
}

function Get-ChangeCount {
    # Number of paths git considers modified/untracked. 0 means clean.
    $out = git status --porcelain 2>$null
    if (-not $out) { return 0 }
    return ($out | Measure-Object).Count
}

function Test-RemoteReachable {
    # Probes the remote using the same credential helper a real push uses, so
    # it doubles as an auth check. Pass the REMOTE NAME, not a tracking ref -
    # "origin/main" does not exist locally until the first push succeeds.
    #
    # Do NOT use --exit-code here: it returns 2 when no refs match, and a
    # brand-new empty repository always has no refs. That made the first push
    # (the one that matters most) look like an offline failure.
    #   0 = refs found, 2 = reachable but empty, 128 = offline/auth failure.
    git ls-remote origin HEAD 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 2)
}

function Get-PendingCount {
    # How many local commits have not reached origin/main yet.
    $remoteRef = git rev-parse --verify --quiet "refs/remotes/origin/main" 2>$null
    if ($remoteRef) {
        $out = @(git rev-list --count "$remoteRef..HEAD" 2>$null)
    } else {
        # Never pushed successfully, so every commit is still pending.
        $out = @(git rev-list --count "HEAD" 2>$null)
    }
    if ($out -and $out[0] -match '^\d+$') { return [int]$out[0] }
    return 0
}

function Invoke-Sync {
    $pendingCount = Get-PendingCount
    $staged       = Get-ChangeCount

    if ($staged -gt 0) {
        git add -A 2>&1 | Out-Null

        if (git diff --cached --quiet 2>$null) {
            # Raced with something else, or everything was ignored.
            return
        }

        $stamp  = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $branch = git branch --show-current
        $msg    = "{0}: {1} file(s) changed at {2}" -f $CommitPrefix, $staged, $stamp

        git commit -m $msg --quiet 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Committed $staged file(s) to '$branch'"
            $pendingCount++
        } else {
            Write-Log "git commit returned non-zero; nothing committed." "WARN"
            return
        }
    }

    if ($pendingCount -le 0) { return }   # clean tree, nothing to push

    if (Test-RemoteReachable) {
        git push -u origin HEAD --quiet 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Pushed $pendingCount commit(s) to $Upstream"
        } else {
            Write-Log "Push rejected (auth/permission). $pendingCount commit(s) kept locally." "WARN"
        }
    } else {
        Write-Log "Remote unreachable - $pendingCount commit(s) held locally, will retry." "WARN"
    }
}

# ------------------------------------------------------------- Preconditions --
if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
    Write-Log "Not a git repository. Run 'git init' first." "ERROR"
    exit 1
}
$null = New-Item -ItemType File -Path $LogPath -Force -ErrorAction SilentlyContinue

# ----------------------------------------------------------------- One-shot --
if ($Once) {
    Write-Log "Manual sync requested."
    Invoke-Sync
    exit 0
}

# -------------------------------------------------------------------- Watch --
Write-Log "AutoSync watching: $ProjectRoot"
Write-Log "Quiet=${QuietSeconds}s  Poll=${PollSeconds}s  Upstream=$Upstream  (Ctrl+C to stop)"

$lastSeen       = 0
$changeDetected = $false
$quietStart     = Get-Date
$lastFlush      = Get-Date

while ($true) {
    Start-Sleep -Seconds ([Math]::Max(1, $PollSeconds))

    $count = Get-ChangeCount

    if ($count -gt 0) {
        if (-not $changeDetected) {
            $changeDetected = $true
            $quietStart     = Get-Date
            $lastSeen       = $count
            Write-Log "Change detected ($count path(s)). Waiting ${QuietSeconds}s for edits to settle..."
        }
        elseif ($count -ne $lastSeen) {
            # Still actively changing - restart the quiet clock.
            $lastSeen   = $count
            $quietStart = Get-Date
        }
        elseif (((Get-Date) - $quietStart).TotalSeconds -ge [Math]::Max(1, $QuietSeconds)) {
            Invoke-Sync
            $changeDetected = $false
            $lastSeen       = 0
        }
    }
    else {
        if ($changeDetected) {
            # Changes may have been reverted before the quiet window elapsed.
            if (((Get-Date) - $quietStart).TotalSeconds -ge [Math]::Max(1, $QuietSeconds)) {
                $changeDetected = $false
                $lastSeen       = 0
            }
        }

        # Even with a clean tree, retry a push once a minute. This flushes any
        # commit that was held locally because the machine was offline.
        if (((Get-Date) - $lastFlush).TotalSeconds -ge 60) {
            $lastFlush = Get-Date
            if ((Get-PendingCount) -gt 0) {
                Invoke-Sync
            }
        }
    }
}
