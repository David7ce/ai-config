'use strict';

const fs = require('fs');
const path = require('path');
const CLEANUP_TARGETS = {
  claude: [
    { key: 'projects', label: 'Claude conversation transcripts', kind: 'files', relative: ['.claude', 'projects'], extensions: ['.jsonl'] },
    { key: 'plugin-cache', label: 'Claude plugin cache', kind: 'directories', relative: ['.claude', 'plugins', 'cache'] },
    { key: 'plugin-marketplaces', label: 'Claude plugin marketplaces', kind: 'directories', relative: ['.claude', 'plugins', 'marketplaces'] },
    { key: 'mcp-auth-cache', label: 'Claude MCP authentication cache', kind: 'files', relative: ['.claude'], names: ['mcp-needs-auth-cache.json'] },
  ],
  copilot: [
    { key: 'session-state', label: 'Copilot session state', kind: 'directories', relative: ['.copilot', 'session-state'] },
  ],
  codex: [
    { key: 'archived-sessions', label: 'Codex archived sessions', kind: 'files', relative: ['.codex', 'archived_sessions'] },
    { key: 'runtime-state', label: 'Codex runtime/session state', kind: 'files', relative: ['.codex'], names: ['logs_*.sqlite', 'logs_*.sqlite-shm', 'logs_*.sqlite-wal', 'state_*.sqlite', 'state_*.sqlite-shm', 'state_*.sqlite-wal', 'session_index.jsonl'] },
    { key: 'plugin-cache', label: 'Codex plugin cache/imports', kind: 'directories', relative: ['.codex', '.tmp', 'plugins'] },
    { key: 'plugin-imports', label: 'Codex imported plugin content', kind: 'directories', relative: ['.codex', 'vendor_imports'] },
  ],
};

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

function discoverCleanupItems(homeDir, agents, { includeFileHistory = false, now = Date.now() } = {}) {
  const items = [];
  for (const agent of agents) {
    for (const target of CLEANUP_TARGETS[agent] || []) {
      const root = path.join(homeDir, ...target.relative);
      const candidates = target.kind === 'files'
        ? walkFiles(root, target.extensions).filter((file) => !target.names || target.names.some((pattern) => new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`, 'i').test(path.basename(file))))
        : fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(root, entry.name)) : [];
      for (const targetPath of candidates) {
        items.push({ agent, target: target.key, label: target.label, path: targetPath, mtimeMs: readMtime(targetPath), ageDays: Math.max(0, (now - readMtime(targetPath)) / 86400000), kind: target.kind });
      }
    }
  }
  if (includeFileHistory && agents.includes('claude')) {
    const root = path.join(homeDir, '.claude', 'file-history');
    if (fs.existsSync(root)) {
      for (const entry of fs.readdirSync(root, { withFileTypes: true }).filter((item) => item.isDirectory())) {
        const targetPath = path.join(root, entry.name);
        items.push({ agent: 'claude', target: 'file-history', label: 'Claude file history', path: targetPath, mtimeMs: readMtime(targetPath), ageDays: Math.max(0, (now - readMtime(targetPath)) / 86400000), kind: 'directories' });
      }
    }
  }
  return items;
}

function cleanup(homeDir, { agents = Object.keys(CLEANUP_TARGETS), olderThanDays = 30, apply = false, includeFileHistory = false, now = Date.now() } = {}) {
  const cutoff = now - olderThanDays * 86400000;
  const discovered = discoverCleanupItems(homeDir, agents, { includeFileHistory, now });
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

module.exports = { CLEANUP_TARGETS, cleanup, discoverCleanupItems, formatCleanup, parseDays };