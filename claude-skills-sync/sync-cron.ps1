# sync-cron.ps1 — weekly unattended: export skills/plugins/config, commit, push
# CONTRACT: invoked by scheduled task 'claude-skills-sync-weekly' (user scope, no admin).
#           Touches only this folder's store/. Needs GCM-cached GitHub creds for push.
#           Remove task: schtasks /delete /tn claude-skills-sync-weekly /f
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

& (Join-Path $PSScriptRoot 'skills-sync.ps1') export
git add -A -- .
if (git status --porcelain -- .) {
    git commit -m "chore(claude-skills-sync): weekly auto-export"
    git push
}
