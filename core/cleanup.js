'use strict';

const fs = require('fs');
const path = require('path');
// Every concrete key is prefixed with its product family (claude-*/codex-*) so
// `--agent <name>` says on its face which app it targets. AGENT_GROUPS (below) lets the
// bare family name (`claude`, `codex`) keep working as a "clean everywhere for this
// product" shorthand — resolveAgents() expands it to all of that family's concrete keys.
const CLEANUP_TARGETS = {
  'claude-cli': [
    { key: 'projects', label: 'Claude conversation transcripts', kind: 'files', relative: ['.claude', 'projects'], extensions: ['.jsonl'] },
    { key: 'plugin-cache', label: 'Claude plugin cache', kind: 'directories', relative: ['.claude', 'plugins', 'cache'] },
    { key: 'plugin-marketplaces', label: 'Claude plugin marketplaces', kind: 'directories', relative: ['.claude', 'plugins', 'marketplaces'] },
    { key: 'mcp-auth-cache', label: 'Claude MCP authentication cache', kind: 'files', relative: ['.claude'], names: ['mcp-needs-auth-cache.json'] },
  ],
  copilot: [
    { key: 'session-state', label: 'Copilot session state', kind: 'directories', relative: ['.copilot', 'session-state'] },
  ],
  'codex-cli': [
    { key: 'archived-sessions', label: 'Codex archived sessions', kind: 'files', relative: ['.codex', 'archived_sessions'] },
    { key: 'runtime-state', label: 'Codex runtime/session state', kind: 'files', relative: ['.codex'], names: ['logs_*.sqlite', 'logs_*.sqlite-shm', 'logs_*.sqlite-wal', 'state_*.sqlite', 'state_*.sqlite-shm', 'state_*.sqlite-wal', 'session_index.jsonl'] },
    { key: 'plugin-cache', label: 'Codex plugin cache/imports', kind: 'directories', relative: ['.codex', '.tmp', 'plugins'] },
    { key: 'plugin-imports', label: 'Codex imported plugin content', kind: 'directories', relative: ['.codex', 'vendor_imports'] },
  ],
  // Claude Desktop (the standalone Electron chat app, distinct from the Claude Code CLI):
  // its profile lives under the OS app-data dir, not directly under $HOME — hence `base:
  // 'appData'`. Only cache/log/session data is listed; claude_desktop_config.json (MCP
  // config), Claude Extensions (installed desktop extensions), and auth/window state are
  // left alone, mirroring the "never touch config" rule the CLI targets follow. Verified
  // directly against a real Windows install; the app-data root and folder name follow
  // standard Electron conventions on macOS/Linux but haven't been checked there.
  'claude-desktop': [
    { key: 'render-cache', label: 'Claude Desktop render/GPU/browser caches', kind: 'directories', base: 'appData', relative: ['Claude'], names: ['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'Shared Dictionary', 'blob_storage', 'Crashpad'] },
    { key: 'coding-sessions', label: 'Claude Desktop coding session data', kind: 'directories', base: 'appData', relative: ['Claude', 'claude-code-sessions'] },
    { key: 'agent-mode-sessions', label: 'Claude Desktop agent-mode session data', kind: 'directories', base: 'appData', relative: ['Claude', 'local-agent-mode-sessions'] },
    { key: 'cli-bundle-cache', label: 'Claude Desktop bundled CLI version cache', kind: 'directories', base: 'appData', relative: ['Claude', 'claude-code'] },
    { key: 'logs', label: 'Claude Desktop logs', kind: 'files', base: 'appData', relative: ['Claude', 'logs'] },
  ],
  // Claude Code's VS Code extension: VS Code caches every extension's downloaded .vsix
  // package under its own app-data dir regardless of publisher, so this targets just the
  // anthropic.claude-code entries by name — covers both stable and Insiders.
  'claude-vscode': [
    { key: 'vsix-cache', label: 'Claude Code extension package cache (VS Code)', kind: 'files', base: 'appData', relative: ['Code', 'CachedExtensionVSIXs'], names: ['anthropic.claude-code-*'] },
    { key: 'vsix-cache-insiders', label: 'Claude Code extension package cache (VS Code Insiders)', kind: 'files', base: 'appData', relative: ['Code - Insiders', 'CachedExtensionVSIXs'], names: ['anthropic.claude-code-*'] },
  ],
  // ChatGPT Desktop (OpenAI's standalone chat app; Codex CLI has no desktop app of its
  // own). UNVERIFIED: unlike claude-desktop, this wasn't checked against a real install —
  // no ChatGPT Desktop instance was available to inspect. `ChatGPT` is a best-effort guess
  // at the app-data folder name (Electron apps normally use their product name); only
  // generic Chromium/Electron cache folder names are listed, since those come from
  // Electron itself rather than being app-specific. If the real folder name differs,
  // these targets simply match nothing — harmless, but confirm and fix the `relative`
  // path here before relying on this to reclaim space.
  'codex-desktop': [
    { key: 'render-cache', label: 'ChatGPT Desktop render/GPU/browser caches', kind: 'directories', base: 'appData', relative: ['ChatGPT'], names: ['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'Shared Dictionary', 'blob_storage', 'Crashpad'] },
    { key: 'logs', label: 'ChatGPT Desktop logs', kind: 'files', base: 'appData', relative: ['ChatGPT', 'logs'] },
  ],
  // Codex's VS Code extension is published as "Codex – OpenAI's coding agent", extension
  // id openai.chatgpt (confirmed via the Marketplace listing) — covers both stable and
  // Insiders, same mechanism as claude-vscode above.
  'codex-vscode': [
    { key: 'vsix-cache', label: 'Codex extension package cache (VS Code)', kind: 'files', base: 'appData', relative: ['Code', 'CachedExtensionVSIXs'], names: ['openai.chatgpt-*'] },
    { key: 'vsix-cache-insiders', label: 'Codex extension package cache (VS Code Insiders)', kind: 'files', base: 'appData', relative: ['Code - Insiders', 'CachedExtensionVSIXs'], names: ['openai.chatgpt-*'] },
  ],
};

const AGENT_GROUPS = {
  claude: ['claude-cli', 'claude-desktop', 'claude-vscode'],
  codex: ['codex-cli', 'codex-desktop', 'codex-vscode'],
};

function resolveAgents(agents) {
  const out = [];
  for (const agent of agents) out.push(...(AGENT_GROUPS[agent] || [agent]));
  return [...new Set(out)];
}

function appDataDir(homeDir) {
  if (process.platform === 'darwin') return path.join(homeDir, 'Library', 'Application Support');
  if (process.platform === 'win32') return path.join(homeDir, 'AppData', 'Roaming');
  return path.join(homeDir, '.config');
}

function parseDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days) || days < 0) throw new Error(`--older-than requires a non-negative number of days: ${value}`);
  return days;
}

function walkFiles(root, extensions = null) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, extensions));
    else if (!extensions || extensions.includes(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function readMtime(target) {
  try { return fs.statSync(target).mtimeMs; } catch { return 0; }
}

function nameMatcher(names) {
  if (!names) return null;
  const patterns = names.map((pattern) => new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`, 'i'));
  return (basename) => patterns.some((re) => re.test(basename));
}

function discoverCleanupItems(homeDir, agents, { includeFileHistory = false, now = Date.now() } = {}) {
  const items = [];
  for (const agent of agents) {
    for (const target of CLEANUP_TARGETS[agent] || []) {
      const root = path.join(target.base === 'appData' ? appDataDir(homeDir) : homeDir, ...target.relative);
      const matches = nameMatcher(target.names);
      const candidates = target.kind === 'files'
        ? walkFiles(root, target.extensions).filter((file) => !matches || matches(path.basename(file)))
        : fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && (!matches || matches(entry.name))).map((entry) => path.join(root, entry.name)) : [];
      for (const targetPath of candidates) {
        items.push({ agent, target: target.key, label: target.label, path: targetPath, mtimeMs: readMtime(targetPath), ageDays: Math.max(0, (now - readMtime(targetPath)) / 86400000), kind: target.kind });
      }
    }
  }
  if (includeFileHistory && agents.includes('claude-cli')) {
    const root = path.join(homeDir, '.claude', 'file-history');
    if (fs.existsSync(root)) {
      for (const entry of fs.readdirSync(root, { withFileTypes: true }).filter((item) => item.isDirectory())) {
        const targetPath = path.join(root, entry.name);
        items.push({ agent: 'claude-cli', target: 'file-history', label: 'Claude file history', path: targetPath, mtimeMs: readMtime(targetPath), ageDays: Math.max(0, (now - readMtime(targetPath)) / 86400000), kind: 'directories' });
      }
    }
  }
  return items;
}

function cleanup(homeDir, { agents = Object.keys(CLEANUP_TARGETS), olderThanDays = 30, apply = false, includeFileHistory = false, now = Date.now() } = {}) {
  const resolvedAgents = resolveAgents(agents);
  const cutoff = now - olderThanDays * 86400000;
  const discovered = discoverCleanupItems(homeDir, resolvedAgents, { includeFileHistory, now });
  const selected = discovered.filter((item) => item.mtimeMs <= cutoff);
  const results = selected.map((item) => ({ ...item, action: apply ? 'removed' : 'would-remove' }));
  if (apply) {
    for (const item of results) fs.rmSync(item.path, { recursive: item.kind === 'directories', force: true });
  }
  return { homeDir, olderThanDays, dryRun: !apply, discovered, selected: results };
}

function formatCleanup(result) {
  const lines = [`AI conversation cleanup (${result.dryRun ? 'dry run' : 'apply'})`, `Home: ${result.homeDir}`, `Older than: ${result.olderThanDays} day(s)`, `Candidates: ${result.discovered.length}`, `Selected: ${result.selected.length}`];
  for (const item of result.selected) lines.push(`${result.dryRun ? 'would remove' : 'removed'} [${item.agent}] ${item.path}`);
  if (result.dryRun) lines.push('No files were changed. Re-run with --apply to delete the selected items.');
  return lines.join('\n');
}

module.exports = { CLEANUP_TARGETS, AGENT_GROUPS, appDataDir, cleanup, discoverCleanupItems, formatCleanup, parseDays, resolveAgents };