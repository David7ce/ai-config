# Combined statusline: runs caveman + ponytail badge scripts, joins their output.
# Resolves each via wildcard so plugin version bumps don't break the path.
# ponytail: if one script is missing/errors, its badge is just omitted.
$ErrorActionPreference = 'SilentlyContinue'
$stdin = [Console]::In.ReadToEnd()

$scripts = @(
  Get-ChildItem "$HOME\.claude\plugins\cache\caveman\*\*\src\hooks\caveman-statusline.ps1"  | Select-Object -First 1
  Get-ChildItem "$HOME\.claude\plugins\cache\ponytail\*\*\hooks\ponytail-statusline.ps1"     | Select-Object -First 1
) | Where-Object { $_ }

$parts = foreach ($s in $scripts) {
  $out = $stdin | pwsh -NoProfile -ExecutionPolicy Bypass -File $s.FullName 2>$null
  if ($out) { ($out -join ' ').Trim() }
}
($parts | Where-Object { $_ }) -join ' '
