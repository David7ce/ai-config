'use strict';
// Post-install fixup for the `playwright` plugin (.ai/plugins.json): Playwright MCP
// defaults to the "chrome" channel, which looks for a real Google Chrome install and
// fails hard (with an unhelpful "run npx playwright install chrome" pointer that itself
// needs admin rights on a locked-down machine) when only a bundled/standalone Chromium is
// present instead. If this machine has a Chromium under the per-user AppData path but no
// Chrome, patch the plugin's own cached .mcp.json to add --executable-path pointing at it
// — bypasses channel detection entirely, no admin rights needed. No-op everywhere else
// (real Chrome present, no Chromium fallback present, or already patched), so this is
// safe to always chain onto the install step rather than needing a flag.
// Windows-only: the "chrome channel missing, Chromium present in per-user AppData" failure
// mode is specific to how Playwright resolves browsers on Windows; on macOS/Linux the
// channel lookup and typical install locations differ enough that this heuristic doesn't
// apply, so this file simply does nothing there instead of guessing at other platforms'
// paths.
// $USER-portable by construction: every path below is built from os.homedir(), never a
// literal C:\Users\<name>\... — safe to run unmodified on any machine this repo is cloned
// onto, not just the one this was written on.
if (process.platform !== 'win32') return;

const fs = require('fs');
const path = require('path');
const os = require('os');

const home = os.homedir();
const chromiumPath = path.join(home, 'AppData', 'Local', 'Chromium', 'Application', 'chrome.exe');
// Same path Playwright itself reports missing in the "chrome channel not found" error —
// checking it directly (rather than trying to invoke Chrome) keeps this a pure fs read.
const chromePath = path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe');

if (!fs.existsSync(chromiumPath) || fs.existsSync(chromePath)) {
  // No Chromium fallback to point at, or a real Chrome is already there — nothing to do.
  process.exit(0);
}

// Versioned cache dir (.claude/plugins/cache/claude-plugins-official/playwright/<version>/
// .mcp.json) — read every version dir present rather than assuming a fixed name like
// "unknown", since that folder name isn't a documented, stable part of the plugin cache
// layout.
const pluginDir = path.join(home, '.claude', 'plugins', 'cache', 'claude-plugins-official', 'playwright');
if (!fs.existsSync(pluginDir)) {
  console.log('playwright-chromium-fallback: plugin cache dir not found yet, skipping (install may still be in progress)');
  process.exit(0);
}

for (const versionDir of fs.readdirSync(pluginDir)) {
  const mcpConfigPath = path.join(pluginDir, versionDir, '.mcp.json');
  if (!fs.existsSync(mcpConfigPath)) continue;

  const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  const args = config.playwright && config.playwright.args;
  if (!Array.isArray(args) || args.includes('--executable-path')) continue; // already patched, or unexpected shape

  args.push('--executable-path', chromiumPath);
  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2) + '\n');
  console.log(`playwright-chromium-fallback: patched ${mcpConfigPath} to use ${chromiumPath}`);
}
