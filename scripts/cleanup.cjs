// ============================================================================
// Cleanup leaked Next.js postcss.js build workers (orphans + live idle excess)
// ============================================================================
// PROBLEM: The Turbopack dev server spawns one postcss.js worker per CSS
// compile and never reaps idle ones. Over a session this grows 1 -> 1000+
// workers (~28 MB each) -> RAM exhaustion -> VS Code crashes, laptop heats up.
// (Dev now defaults to webpack via "dev": "next dev --webpack", which does NOT
// spawn these workers, but this script remains a safety net for dev:turbo.)
//
// FIX (three tiers):
//   1. ORPHANS: workers whose parent process is dead. Always safe to kill.
//   2. IDLE EXCESS: workers of a LIVE server that used almost no CPU over a
//      1.2s sampling window, when the live total exceeds MAX_WORKERS (4).
//      These are leaked/accumulated workers, not active compilers. Turbopack
//      respawns workers on demand, so killing idle ones is safe. The 2 most
//      recently spawned workers are always kept to avoid racing a fresh
//      compile.
//   3. --all : kill EVERY postcss worker (use before restarting the server).
//
// Usage:  npm run cleanup            (default: orphans + idle excess)
//         npm run cleanup -- --all   (kill all postcss workers)
// ============================================================================

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const killAll = process.argv.includes("--all");

const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$MAX_WORKERS = 4
$IDLE_MS = 100
$killAll = ${killAll ? "$true" : "$false"}

function Get-PostcssWorkers {
  @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'postcss\\.js' })
}

$postcss = Get-PostcssWorkers
if ($postcss.Count -eq 0) {
  Write-Output 'No postcss workers found - system is clean.'
  exit
}

$orphans = @()
$parentAlive = @()
foreach ($p in $postcss) {
  $parent = Get-Process -Id $p.ParentProcessId -ErrorAction SilentlyContinue
  if (-not $parent) { $orphans += $p.ProcessId } else { $parentAlive += $p.ProcessId }
}

$toKill = @()
if ($killAll) {
  $toKill = @($postcss | ForEach-Object { $_.ProcessId })
  Write-Output ("[--all] Killing all {0} postcss worker(s)..." -f $toKill.Count)
} else {
  if ($orphans.Count -gt 0) {
    $toKill += $orphans
    Write-Output ("Killing {0} orphaned postcss worker(s) (parent dead)..." -f $orphans.Count)
  }
  if ($parentAlive.Count -gt $MAX_WORKERS) {
    # Sample CPU over a short window to find workers that are NOT compiling
    $t0 = @{}
    foreach ($p in $postcss) { $t0[$p.ProcessId] = $p.KernelModeTime + $p.UserModeTime }
    Start-Sleep -Milliseconds 1200
    $idle = @()
    foreach ($p in Get-PostcssWorkers) {
      $prev = $t0[$p.ProcessId]
      if ($null -eq $prev) { continue }
      $deltaMs = (($p.KernelModeTime + $p.UserModeTime) - $prev) / 10000
      if ($deltaMs -lt $IDLE_MS) { $idle += $p.ProcessId }
    }
    # Always keep the 2 most recently spawned workers even if idle
    $keep = @($idle | Sort-Object CreationDate -Descending | Select-Object -First 2)
    $idleExcess = @($idle | Where-Object { $_ -notin $keep })
    if ($idleExcess.Count -gt 0) {
      $toKill += $idleExcess
      Write-Output ("Killing {0} idle leaked worker(s) of the live server (total {1} > max {2})..." -f $idleExcess.Count, $parentAlive.Count, $MAX_WORKERS)
    } else {
      Write-Output ("Live server has {0} workers (within limit {1}) - nothing to reap." -f $parentAlive.Count, $MAX_WORKERS)
    }
  } else {
    Write-Output ("Live server worker count {0} within limit ({1}) - nothing to reap." -f $parentAlive.Count, $MAX_WORKERS)
  }
}

if ($toKill.Count -gt 0) {
  Stop-Process -Id ($toKill | Select-Object -Unique) -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 800
} else {
  Write-Output 'Nothing to kill - system is clean.'
}

$remaining = @(Get-PostcssWorkers)
Write-Output ("Remaining postcss workers: {0}" -f $remaining.Count)
`;

// NOTE: 'postcss\\.js' in the .ps1 file is the regex postcss\.js which matches
// the literal text "postcss.js" in the worker command line.

const tmpFile = path.join(os.tmpdir(), `vscode-cleanup-${process.pid}.ps1`);
fs.writeFileSync(tmpFile, psScript, "utf8");

try {
  const out = execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmpFile],
    { encoding: "utf8", windowsHide: true },
  );
  console.log(out);
} catch (err) {
  console.log("Cleanup ran with a warning:");
  console.log(err.stderr ? err.stderr.toString() : err.message);
} finally {
  fs.unlinkSync(tmpFile);
}
