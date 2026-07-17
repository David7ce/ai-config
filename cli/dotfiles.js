'use strict';
// dotfiles: applies .ai/dotfiles/claude/ (source of truth) to this machine's ~/.claude.
// One direction only, by design: edit .ai/dotfiles/claude/ by hand (with help, via prompts),
// run `import` to apply it. No export/capture-back — ~/.claude is never hand-edited as the
// source, .ai/dotfiles/claude/ always is. Mirrors: destination extras get deleted on import.
// Plugins aren't tracked as a separate registry: settings.json's enabledPlugins +
// extraKnownMarketplaces is enough — Claude Code re-fetches the actual plugin content from
// those marketplaces on next start. installPath/version/commit-sha are machine-local cache,
// not source of truth, so they don't belong here.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { mirrorDir } = require('./lib');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');

function parseArgs(argv) {
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') opts.source = argv[++i];
    else rest.push(a);
  }
  return { opts, rest };
}

function dotfilesClaudeDir(sourceDir) {
  return path.join(sourceDir, 'dotfiles', 'claude');
}

function listDirNames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()) : [];
}

function showDrift(label, storeItems, liveItems) {
  const missing = storeItems.filter((i) => !liveItems.includes(i));
  const extra = liveItems.filter((i) => !storeItems.includes(i));
  if (missing.length) console.log(`${label} — repo has, system missing: ${missing.join(', ')}`);
  if (extra.length) console.log(`${label} — system has, not in repo: ${extra.join(', ')}`);
}

function list(sourceDir) {
  const dot = dotfilesClaudeDir(sourceDir);
  console.log('--- drift: .ai/dotfiles/claude (source of truth) vs ~/.claude (this machine) ---');

  showDrift('skills', listDirNames(path.join(dot, 'skills')), listDirNames(path.join(CLAUDE_DIR, 'skills')));

  const storeSettingsFile = path.join(dot, 'settings.json');
  const liveSettingsFile = path.join(CLAUDE_DIR, 'settings.json');
  if (fs.existsSync(storeSettingsFile) && fs.existsSync(liveSettingsFile)) {
    const store = JSON.parse(fs.readFileSync(storeSettingsFile, 'utf8'));
    const live = JSON.parse(fs.readFileSync(liveSettingsFile, 'utf8'));
    const storeKeys = Object.keys(store);
    const liveKeys = Object.keys(live);
    showDrift('settings.json', storeKeys, liveKeys);
    const changed = storeKeys.filter(
      (k) => liveKeys.includes(k) && JSON.stringify(store[k]) !== JSON.stringify(live[k])
    );
    if (changed.length) console.log(`settings.json — differs on both sides: ${changed.join(', ')}`);
  }
}

// settings.json can carry an absolute path from the source machine (e.g. a statusLine
// command) — rewrite every "<anything>...\.claude" prefix to the current home dir. Matches
// JSON-escaped Windows (C:\\Users\\x\\.claude) and Linux forms.
function repairAbsolutePaths() {
  const file = path.join(CLAUDE_DIR, 'settings.json');
  if (!fs.existsSync(file)) return;
  const claudeEsc = CLAUDE_DIR.replace(/\\/g, '\\\\');
  const pattern = /(?:[A-Za-z]:(?:\\\\|\/)|\/)[^":]*?(?:\\\\|\/)\.claude/g;
  const raw = fs.readFileSync(file, 'utf8');
  const fixed = raw.replace(pattern, claudeEsc);
  if (fixed !== raw) {
    fs.writeFileSync(file, fixed);
    console.log(`settings.json: absolute paths rewritten to ${CLAUDE_DIR}`);
  }
}

function importDotfiles(sourceDir) {
  const dot = dotfilesClaudeDir(sourceDir);
  if (!fs.existsSync(dot)) throw new Error(`.ai/dotfiles/claude not found at ${dot} — nothing to import`);

  console.log(`skills: ${dot}/skills -> ${CLAUDE_DIR}/skills`);
  mirrorDir(path.join(dot, 'skills'), path.join(CLAUDE_DIR, 'skills'));

  console.log('config: settings.json -> ~/.claude');
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  const src = path.join(dot, 'settings.json');
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(CLAUDE_DIR, 'settings.json'));

  repairAbsolutePaths();
  console.log('done. Skills active now; plugins re-fetch from their marketplaces on next Claude Code start (check with /plugin).');
}

function remove(sourceDir, name) {
  if (!name) throw new Error('usage: ai-config dotfiles remove <skill-name>');
  const dot = dotfilesClaudeDir(sourceDir);
  let hit = false;
  for (const dir of [path.join(dot, 'skills', name), path.join(CLAUDE_DIR, 'skills', name)]) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`removed: ${dir}`);
      hit = true;
    }
  }
  if (!hit) throw new Error(`skill not found in .ai/dotfiles/claude or ~/.claude: ${name} (plugins: use /plugin to uninstall)`);
}

async function run(argv, defaultSourceDir) {
  const { opts, rest } = parseArgs(argv);
  const sourceDir = path.resolve(opts.source || defaultSourceDir);
  const [action, name] = rest;

  switch (action) {
    case 'import':
      importDotfiles(sourceDir);
      break;
    case 'list':
    case undefined:
      list(sourceDir);
      break;
    case 'remove':
      remove(sourceDir, name);
      break;
    default:
      console.log('usage: ai-config dotfiles <import|list|remove> [name] [--source <dir>]');
  }
}

module.exports = { run };
