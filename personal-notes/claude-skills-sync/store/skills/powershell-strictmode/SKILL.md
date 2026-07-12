---
name: powershell-strictmode
description: >-
  Pitfalls and fixes for PowerShell scripts running under Set-StrictMode -Version
  Latest combined with $ErrorActionPreference = 'Stop'. Use whenever writing or
  debugging PowerShell (.ps1) scripts, especially ones that die silently mid-run,
  crash with "property cannot be found on this object", or behave differently
  than in an interactive shell — even if the user doesn't mention StrictMode.
---

# StrictMode + ErrorActionPreference='Stop' survival guide

Many hardened scripts open with:

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
```

Good defaults — but they turn idioms that are harmless in a loose shell into
**silent mid-script death**: the error is terminating, nothing after it runs, and if
output isn't captured the window just closes. Every pattern below caused a real
production failure.

## The traps

**1. Property access on `$null` inside pipelines.**
`$null | Where-Object { $_.Something }` — piping `$null` sends ONE item through the
pipeline, and `$_.Something` on it throws under StrictMode. Classic source: object
properties that are sometimes null collections:

```powershell
# CRASHES when a task has no triggers ($_.Triggers is $null):
Get-ScheduledTask | Where-Object { $_.Triggers | Where-Object { $_.CimClass.CimClassName -eq '…' } }
# FIX: guard each level
Get-ScheduledTask | Where-Object { $_.Triggers -and
    ($_.Triggers | Where-Object { $_ -and $_.CimClass -and $_.CimClass.CimClassName -eq '…' }) }
```

**2. `.Count` on a scalar.** Cmdlets return a scalar for one result, an array for
many. `.Count` on the scalar throws under StrictMode ≥3. Always wrap: `@(...)`:

```powershell
$n = @(Get-ChildItem $dir -Recurse -File).Count   # not (Get-ChildItem ...).Count
```

**3. Undefined variables inside double-quoted here-strings.** `@"..."@` interpolates.
Bash-style `\$var` does NOT escape in PowerShell (backtick does) — so `\$name` reads
variable `$name`, which under StrictMode throws if undefined. When emitting literal
code/config (profiles, scripts, templates), use a single-quoted here-string and
concatenate the dynamic parts:

```powershell
$body = @'
function which($name) { (Get-Command $name -ErrorAction SilentlyContinue).Source }
'@
$block = "$header`r`n$body`r`n$footer"
```

**4. `Get-ItemProperty -ErrorAction SilentlyContinue` then dot-access.** Returns
`$null` when missing → property access throws. Two-step it:

```powershell
$ip = Get-ItemProperty -Path $key -Name $name -ErrorAction SilentlyContinue
$value = if ($ip) { $ip.($name) } else { $null }
```

**5. Non-terminating errors still fail the run.** With `-ErrorAction
SilentlyContinue` the message disappears but the cmdlet failure can still surface as
exit 1 to a calling harness. Truly-optional operations:
`try { Cmdlet ... -ErrorAction Stop } catch {}`.

## Diagnosis workflow

A script under these settings that stops producing log lines mid-run almost
certainly hit trap 1–4 at the first unlogged statement. To see the error when the
console window closes too fast, capture everything:

```powershell
pwsh -NoProfile -File script.ps1 *> transcript.txt
```

Then read the transcript — the terminating error is at the end. Fix the idiom, don't
remove StrictMode: it's finding real bugs (a loose-mode script would have silently
emitted broken output instead).
