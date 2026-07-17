'use strict';
// dotfiles: applies .ai/dotfiles/<agent>/ (source of truth) to this machine's real user
// config for that agent. Multi-agent by design, same pattern as wrap.js's TARGETS — flags
// or a menu pick which agent(s), same reason (no arrow-key TUI dep, correct on every
// terminal). One direction only: .ai/dotfiles/<agent>/ is what you hand-edit, never the
// live homeDir. No export.
// Only Claude Code is wired up today — its ~/.claude path and shape (skills/, settings.json)
// are verified. Codex, Gemini CLI, opencode, Cursor etc. belong in DOTFILE_TARGETS once
// there's real content in .ai/dotfiles/<agent>/ AND a confirmed home-dir path for that
// tool — don't guess at where another tool's user config lives, a wrong guess here writes
// into a real profile.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { mirrorDir, pickFromMenu } = require('./lib');

const DOTFILE_TARGETS = [
  {
    key: 'claude',
    label: 'Claude Code',
    homeDir: path.join(os.homedir(), '.claude'),
  },
];

function parseArgs(argv) {
  const flags = new Set();
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') opts.source = argv[++i];
    else if (a.startsWith('--')) flags.add(a.slice(2));
    else rest.push(a);
  }
  return { flags, opts, rest };
}

async function pickTargets(flags) {
  if (flags.has('all')) return DOTFILE_TARGETS;
  const byFlag = DOTFILE_TARGETS.filter((t) => flags.has(t.key));
  if (byFlag.length) return byFlag;
  if (flags.size > 0) return []; // an unrecognized flag was passed — fail safe, don't guess
  const picked = await pickFromMenu(
    DOTFILE_TARGETS.map((t) => ({ key: t.key, label: t.label, extra: t.homeDir })),
    'AI Config dotfiles — which agent do you want to import into this machine?'
  );
  return DOTFILE_TARGETS.filter((t) => picked.has(t.key));
}

function dotfilesSourceDir(sourceDir, target) {
  return path.join(sourceDir, 'dotfiles', target.key);
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

function listOne(sourceDir, target) {
  const dot = dotfilesSourceDir(sourceDir, target);
  console.log(`\n--- ${target.label}: ${dot} (source of truth) vs ${target.homeDir} (this machine) ---`);

  showDrift('skills', listDirNames(path.join(dot, 'skills')), listDirNames(path.join(target.homeDir, 'skills')));

  const storeSettingsFile = path.join(dot, 'settings.json');
  const liveSettingsFile = path.join(target.homeDir, 'settings.json');
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
// command) — rewrite every "<anything>...\<homeDir's own name>" prefix to the current
// home dir. Matches JSON-escaped Windows (C:\\Users\\x\\.claude) and Linux forms.
function repairAbsolutePaths(target) {
  const file = path.join(target.homeDir, 'settings.json');
  if (!fs.existsSync(file)) return;
  const dirName = path.basename(target.homeDir).replace('.', '\\.'); // e.g. ".claude"
  const homeEsc = target.homeDir.replace(/\\/g, '\\\\');
  const pattern = new RegExp(`(?:[A-Za-z]:(?:\\\\\\\\|/)|/)[^":]*?(?:\\\\\\\\|/)${dirName}`, 'g');
  const raw = fs.readFileSync(file, 'utf8');
  const fixed = raw.replace(pattern, homeEsc);
  if (fixed !== raw) {
    fs.writeFileSync(file, fixed);
    console.log(`settings.json: absolute paths rewritten to ${target.homeDir}`);
  }
}

function importOne(sourceDir, target) {
  const dot = dotfilesSourceDir(sourceDir, target);
  if (!fs.existsSync(dot)) throw new Error(`${dot} not found — nothing to import for ${target.label}`);

  console.log(`\n${target.label}: ${dot}/skills -> ${target.homeDir}/skills`);
  mirrorDir(path.join(dot, 'skills'), path.join(target.homeDir, 'skills'));

  console.log(`${target.label}: settings.json -> ${target.homeDir}`);
  fs.mkdirSync(target.homeDir, { recursive: true });
  const src = path.join(dot, 'settings.json');
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(target.homeDir, 'settings.json'));

  repairAbsolutePaths(target);
  console.log(`done. Skills active now; plugins re-fetch from their marketplaces on next ${target.label} start.`);
}

function removeOne(sourceDir, target, name) {
  const dot = dotfilesSourceDir(sourceDir, target);
  let hit = false;
  for (const dir of [path.join(dot, 'skills', name), path.join(target.homeDir, 'skills', name)]) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`removed: ${dir}`);
      hit = true;
    }
  }
  return hit;
}

async function run(argv, defaultSourceDir) {
  const { flags, opts, rest } = parseArgs(argv);
  const sourceDir = path.resolve(opts.source || defaultSourceDir);
  const [action, name] = rest;

  if (!['import', 'list', 'remove', undefined].includes(action)) {
    console.log('usage: ai-config dotfiles <import|list|remove> [--claude|--all] [name] [--source <dir>]');
    return;
  }

  const targets = await pickTargets(flags);
  if (targets.length === 0) {
    console.log('Nothing selected. Nothing to do.');
    return;
  }

  if (action === 'remove' && !name) {
    throw new Error('usage: ai-config dotfiles remove <skill-name> [--claude|--all]');
  }

  for (const target of targets) {
    if (action === 'import') importOne(sourceDir, target);
    else if (action === 'remove') {
      const hit = removeOne(sourceDir, target, name);
      if (!hit) console.log(`${target.label}: skill not found: ${name}`);
    } else listOne(sourceDir, target);
  }
}

module.exports = { run };
