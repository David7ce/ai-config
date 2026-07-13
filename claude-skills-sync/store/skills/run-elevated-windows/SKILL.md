---
name: run-elevated-windows
description: >-
  Run scripts that require Administrator from a non-elevated agent session on
  Windows: UAC via Start-Process -Verb RunAs, output capture, and verifying results
  through evidence files. Use whenever a script has #Requires -RunAsAdministrator,
  a command fails with "requires elevation"/"Access is denied", or the task touches
  services, scheduled tasks, HKLM, restore points, or Defender settings.
---

# Running elevated work from a non-admin agent session

Agent shells are usually non-elevated, and there's no sudo on Windows — you cannot
read the elevated process's stdout directly. The working pattern: launch through
UAC, force all output into files, verify from the files.

## Check elevation first

```powershell
[Security.Principal.WindowsPrincipal]::new(
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
```

`False` → don't retry the failing command; switch to this pattern.

## Launch pattern

```powershell
Start-Process pwsh -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass',
    '-Command', "& 'C:\path\script.ps1' *> 'C:\path\transcript.txt'"
```

- **`*>` transcript is non-negotiable.** The elevated console is a separate window
  that closes on exit — without redirection a crash is invisible. A run that "worked"
  (exit 0) but wrote nothing is indistinguishable from one that died at line 3.
- `-Wait` returns when the process ends. Run it in the background if the harness
  supports it — UAC sits until the human clicks.
- **Warn the user a UAC prompt is coming.** Unannounced prompts get reflex-denied.
- Batch multiple scripts into ONE elevated process (one UAC click):
  `-Command "& { & 'a.ps1'; & 'b.ps1' } *> 'transcript.txt'"`.

## Verify — exit 0 proves nothing

`Start-Process` exit 0 = the *wrapper* worked, not the script. Verify from evidence:

1. Read the transcript end-to-end — a script that stops logging mid-way crashed there.
2. Check the artifacts the script claims to produce (files, registry values, task
   state) from the non-elevated session — most are readable without admin.
3. **"Access is denied" ≠ "not found"** when querying results: a SYSTEM-principal
   scheduled task returns *denied* to a standard user — that actually proves it
   exists. Absence reads as *cannot find*.

## Boundaries

- Some state is per-user: the elevated process runs as the same user (different
  token), so HKCU and `$PROFILE` still target the right account — but network drives
  mapped in the non-elevated session may not exist in the elevated one.
- Never disable UAC or use scheduled-task/service tricks to bypass the prompt; the
  prompt is the authorization step.
