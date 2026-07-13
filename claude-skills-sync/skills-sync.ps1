# skills-sync.ps1 — import / export / list / remove for Claude Code skills + plugin registry + config
# CONTRACT:
#   This repo (./store/) is the source of truth. 'import' applies it to this machine's
#   live ~/.claude (the main, day-to-day action); 'export' captures a live change back
#   into the repo so it becomes the new source of truth (run after installing a plugin
#   or hand-editing a skill live), then commit/push.
#   Mirrors   ~/.claude/skills                    <->  ./store/skills/        (full content)
#   Copies    ~/.claude/plugins/installed_plugins.json
#             ~/.claude/plugins/known_marketplaces.json  <->  ./store/plugins/
#   Copies    ~/.claude/settings.json, statusline-combined.ps1  <->  ./store/config/
#   NEVER stored: .credentials.json (secrets), history/runtime state.
#   Plugin cache/marketplaces/data are NOT stored — regenerable from the two registries
#   (marketplaces re-clone from their git repos; plugins reinstall from marketplaces).
#   READ-ONLY for 'list'. 'import'/'export' mirror skills (destination extras deleted).
#   'remove' deletes a SKILL from both sides (plugins: uninstall via /plugin instead).
#   'import' rewrites absolute …\.claude paths in registries AND settings.json to $HOME.
#   No admin. Reversible via git history. Cross-platform pwsh 7 (Windows/Linux).
#
# USAGE:
#   ./skills-sync.ps1                  # list (manifest view + repo<->system drift: skills, plugins, settings.json)
#   ./skills-sync.ps1 import           # store -> live (main action: apply this repo's config to this machine)
#   ./skills-sync.ps1 export           # live -> store, regenerate manifest.json (capture a local change into the repo)
#   ./skills-sync.ps1 remove <name>    # delete skill from store AND live, update manifest
param(
    [ValidateSet('list', 'import', 'export', 'remove')]
    [string]$Action = 'list',
    [string]$Name
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ClaudeDir     = Join-Path $HOME '.claude'
$LiveSkills    = Join-Path $ClaudeDir 'skills'
$LivePlugins   = Join-Path $ClaudeDir 'plugins'
$StoreSkills   = Join-Path $PSScriptRoot 'store/skills'
$StorePlugins  = Join-Path $PSScriptRoot 'store/plugins'
$StoreConfig   = Join-Path $PSScriptRoot 'store/config'
$Manifest      = Join-Path $PSScriptRoot 'manifest.json'
$RegistryFiles = @('installed_plugins.json', 'known_marketplaces.json')
$ConfigFiles   = @('settings.json', 'statusline-combined.ps1')   # never .credentials.json

function Get-SkillMeta([string]$dir) {
    # name + description from SKILL.md YAML frontmatter (best-effort regex, no yaml dep)
    $md = Join-Path $dir 'SKILL.md'
    $meta = [ordered]@{
        name        = Split-Path $dir -Leaf
        description = ''
        files       = @(Get-ChildItem $dir -Recurse -File).Count
        updated     = (Get-ChildItem $dir -Recurse -File |
                       Measure-Object LastWriteTimeUtc -Maximum).Maximum.ToString('s') + 'Z'
    }
    if (Test-Path $md) {
        $raw = Get-Content $md -Raw
        if ($raw -match '(?ms)^---\s*\n(.*?)\n---') {
            $fm = $Matches[1]
            if ($fm -match '(?m)^name:\s*(.+)$') { $meta.name = $Matches[1].Trim() }
            # description: single line, quoted, or folded (>-) block
            if ($fm -match '(?ms)^description:\s*>-?\s*\n((?:[ \t]+.+\n?)+)') {
                $meta.description = (($Matches[1] -split '\n') | ForEach-Object { $_.Trim() }) -join ' '
            } elseif ($fm -match '(?m)^description:\s*(.+)$') {
                $meta.description = $Matches[1].Trim(' "''')
            }
        }
    }
    [pscustomobject]$meta
}

function Get-PluginList([string]$dir) {
    $reg = Join-Path $dir 'installed_plugins.json'
    if (-not (Test-Path $reg)) { return @() }
    $json = Get-Content $reg -Raw | ConvertFrom-Json
    @($json.plugins.PSObject.Properties | ForEach-Object {
        $e = $_.Value | Select-Object -First 1
        [pscustomobject]@{ name = $_.Name; version = $e.version; lastUpdated = $e.lastUpdated }
    })
}

function Write-Manifest {
    $skills  = @(Get-ChildItem $StoreSkills -Directory -ErrorAction SilentlyContinue |
                 ForEach-Object { Get-SkillMeta $_.FullName })
    $plugins = Get-PluginList $StorePlugins
    [ordered]@{
        generated = (Get-Date).ToUniversalTime().ToString('s') + 'Z'
        skills    = $skills
        plugins   = $plugins
    } | ConvertTo-Json -Depth 4 | Set-Content $Manifest -Encoding utf8
    Write-Host "manifest.json: $($skills.Count) skills, $(@($plugins).Count) plugins" -ForegroundColor Green
}

function Mirror([string]$src, [string]$dst) {
    if (-not (Test-Path $src)) { throw "source not found: $src" }
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
    Copy-Item $src -Destination $dst -Recurse
}

function Show-Drift([string]$label, [string[]]$storeItems, [string[]]$liveItems) {
    $missing = @($storeItems | Where-Object { $_ -and $_ -notin $liveItems })
    $extra   = @($liveItems  | Where-Object { $_ -and $_ -notin $storeItems })
    if ($missing) { Write-Host "$label — repo has, system missing: $($missing -join ', ')" -ForegroundColor Yellow }
    if ($extra)   { Write-Host "$label — system has, not in repo: $($extra -join ', ')"   -ForegroundColor Yellow }
}

function Repair-AbsolutePaths {
    # Registries and settings.json carry absolute paths from the source machine
    # (installPath, installLocation, statusLine command) — rewrite every
    # "<anything>…/.claude" prefix, wherever it sits inside a JSON string, to the
    # current $HOME. Matches JSON-escaped Windows (C:\\Users\\x\\.claude) and
    # Linux (/home/x/.claude) forms.
    $targets = @($RegistryFiles | ForEach-Object { Join-Path $LivePlugins $_ }) +
               @(Join-Path $ClaudeDir 'settings.json')
    # String .Replace, not -replace: regex replacement would double the escapes.
    $claudeEsc = $ClaudeDir.Replace('\', '\\')
    foreach ($reg in $targets) {
        if (-not (Test-Path $reg)) { continue }
        $raw = Get-Content $reg -Raw
        $fixedRaw = $raw -replace '(?:[A-Za-z]:(?:\\\\|/)|/)[^":]*?(?:\\\\|/)\.claude', $claudeEsc
        if ($fixedRaw -ne $raw) {
            Set-Content $reg -Value $fixedRaw -Encoding utf8
            Write-Host "$(Split-Path $reg -Leaf): absolute paths rewritten to $ClaudeDir" -ForegroundColor Green
        }
    }
}

switch ($Action) {
    'import' {
        if (-not (Test-Path $StoreSkills)) { throw "store empty — run 'export' on the source machine first" }
        Write-Host "skills: store -> live ($LiveSkills)" -ForegroundColor Cyan
        Mirror $StoreSkills $LiveSkills
        Write-Host "plugins: registries -> live" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $LivePlugins -Force | Out-Null
        foreach ($f in $RegistryFiles) {
            Copy-Item (Join-Path $StorePlugins $f) -Destination $LivePlugins -Force
        }
        Write-Host "config: store -> live" -ForegroundColor Cyan
        foreach ($f in $ConfigFiles) {
            $src = Join-Path $StoreConfig $f
            if (Test-Path $src) { Copy-Item $src -Destination $ClaudeDir -Force }
        }
        Repair-AbsolutePaths
        Write-Host "done. Skills active now; plugins re-fetch from their marketplaces" -ForegroundColor Green
        Write-Host "on next Claude Code start (check with /plugin)." -ForegroundColor Green
    }
    'export' {
        Write-Host "skills: live -> store" -ForegroundColor Cyan
        Mirror $LiveSkills $StoreSkills
        Write-Host "plugins: registries -> store" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $StorePlugins -Force | Out-Null
        foreach ($f in $RegistryFiles) {
            Copy-Item (Join-Path $LivePlugins $f) -Destination $StorePlugins -Force
            Write-Host "  $f"
        }
        Write-Host "config: -> store" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $StoreConfig -Force | Out-Null
        foreach ($f in $ConfigFiles) {
            $src = Join-Path $ClaudeDir $f
            if (Test-Path $src) { Copy-Item $src -Destination $StoreConfig -Force; Write-Host "  $f" }
        }
        Write-Manifest
        Write-Host "now: git add/commit/push so this becomes the source of truth" -ForegroundColor DarkGray
    }
    'remove' {
        if (-not $Name) { throw "usage: skills-sync.ps1 remove <skill-name>" }
        $hit = $false
        foreach ($root in @($StoreSkills, $LiveSkills)) {
            $p = Join-Path $root $Name
            if (Test-Path $p) { Remove-Item $p -Recurse -Force; Write-Host "removed: $p"; $hit = $true }
        }
        if (-not $hit) { throw "skill not found in store or live: $Name (plugins: use /plugin to uninstall)" }
        Write-Manifest
    }
    'list' {
        if (Test-Path $Manifest) {
            $m = Get-Content $Manifest -Raw | ConvertFrom-Json
            Write-Host "manifest ($($m.generated))" -ForegroundColor Cyan
            Write-Host "--- skills ---"
            $m.skills | Format-Table name, files, updated, description -AutoSize
            Write-Host "--- plugins (registry only; content re-fetches on import) ---"
            $m.plugins | Format-Table name, version, lastUpdated -AutoSize
        } else {
            Write-Host "no manifest yet — run: ./skills-sync.ps1 export" -ForegroundColor Yellow
        }
        Write-Host "--- drift: repo (source of truth) vs this system ---" -ForegroundColor Cyan
        if (Test-Path $LiveSkills) {
            Show-Drift 'skills' `
                (Get-ChildItem $StoreSkills -Directory -ErrorAction SilentlyContinue).Name `
                (Get-ChildItem $LiveSkills  -Directory -ErrorAction SilentlyContinue).Name
        }
        Show-Drift 'plugins' (Get-PluginList $StorePlugins).name (Get-PluginList $LivePlugins).name

        $liveSettings  = Join-Path $ClaudeDir 'settings.json'
        $storeSettings = Join-Path $StoreConfig 'settings.json'
        if ((Test-Path $liveSettings) -and (Test-Path $storeSettings)) {
            $live  = Get-Content $liveSettings  -Raw | ConvertFrom-Json
            $store = Get-Content $storeSettings -Raw | ConvertFrom-Json
            $liveKeys  = @($live.PSObject.Properties.Name)
            $storeKeys = @($store.PSObject.Properties.Name)
            Show-Drift 'settings.json' $storeKeys $liveKeys
            $changed = @($storeKeys | Where-Object { $_ -in $liveKeys -and
                (($live.$_ | ConvertTo-Json -Depth 10 -Compress) -ne ($store.$_ | ConvertTo-Json -Depth 10 -Compress)) })
            if ($changed) { Write-Host "settings.json — differs on both sides: $($changed -join ', ')" -ForegroundColor Yellow }
        }
    }
}
