'use strict';
// dotfiles: applies .ai/<agent>/home/ (source of truth) to this machine's real user config
// for that agent — the counterpart to wrap.js's .ai/<agent>/project/ (repo-scoped instead
// of user-scoped). Multi-agent by design, same pattern as wrap.js's TARGETS — flags or a
// menu pick which agent(s), same reason (no arrow-key TUI dep, correct on every terminal).
// One direction only: .ai/<agent>/home/ is what you hand-edit, never the live homeDir. No export.
// Only Claude Code is wired up today — its ~/.claude path and shape (skills/, hooks/,
// settings.json, plugins.json) are verified. Deliberately NOT tracked: plugins/ (9+ MB
// of cache + marketplace git clones) and ide/ (per-process .lock files, pure runtime state,
// not config) — plugins.json (see `plugins` action below) reproduces both on demand
// instead, package-manager style, so there's nothing to duplicate or go stale.
// Codex, Gemini CLI, opencode, Cursor etc. belong in DOTFILE_TARGETS once there's real
// content in .ai/<agent>/home/ AND a confirmed home-dir path for that tool — don't guess
// at where another tool's user config lives, a wrong guess here writes into a real profile.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { mirrorDir, pickFromMenu } = require('./lib');

// dirName, not a precomputed absolute path: lets --home override where "home" is (see run()),
// so `import` can be pointed at a scratch dir instead of the real profile for testing.
const DOTFILE_TARGETS = [{ key: 'claude', label: 'Claude Code', dirName: '.claude' }];

function parseArgs(argv) {
  const flags = new Set();
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source' || a === '--home') opts[a.slice(2)] = argv[++i];
    else if (a.startsWith('--')) flags.add(a.slice(2));
    else rest.push(a);
  }
  return { flags, opts, rest };
}

function resolveTargets(homeBase) {
  return DOTFILE_TARGETS.map((t) => ({ ...t, homeDir: path.join(homeBase, t.dirName) }));
}

async function pickTargets(flags, targets) {
  if (flags.has('all')) return targets;
  const byFlag = targets.filter((t) => flags.has(t.key));
  if (byFlag.length) return byFlag;
  if (flags.size > 0) return []; // an unrecognized flag was passed — fail safe, don't guess
  const picked = await pickFromMenu(
    targets.map((t) => ({ key: t.key, label: t.label, extra: t.homeDir })),
    'AI Config dotfiles — which agent do you want to import into this machine?'
  );
  return targets.filter((t) => picked.has(t.key));
}

function dotfilesSourceDir(sourceDir, target) {
  return path.join(sourceDir, target.key, 'home');
}

function listDirNames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()) : [];
}

function listFileNames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()) : [];
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
  showDrift('hooks', listFileNames(path.join(dot, 'hooks')), listFileNames(path.join(target.homeDir, 'hooks')));

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

  const pluginsFile = path.join(dot, 'plugins.json');
  if (fs.existsSync(pluginsFile) && fs.existsSync(liveSettingsFile)) {
    const installers = JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
    const claudePlugins = installers
      .filter((i) => i.command === 'claude' && i.args[0] === 'plugin' && i.args[1] === 'install')
      .map((i) => i.args[2]);
    const live = JSON.parse(fs.readFileSync(liveSettingsFile, 'utf8'));
    showDrift('plugins (run `dotfiles plugins` to install)', claudePlugins, Object.keys(live.enabledPlugins || {}));
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

  console.log(`${target.label}: ${dot}/hooks -> ${target.homeDir}/hooks`);
  const hooksDir = path.join(target.homeDir, 'hooks');
  if (mirrorDir(path.join(dot, 'hooks'), hooksDir) && process.platform !== 'win32') {
    for (const f of fs.readdirSync(hooksDir)) fs.chmodSync(path.join(hooksDir, f), 0o755);
  }

  console.log(`${target.label}: settings.json -> ${target.homeDir}`);
  fs.mkdirSync(target.homeDir, { recursive: true });
  const src = path.join(dot, 'settings.json');
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(target.homeDir, 'settings.json'));

  repairAbsolutePaths(target);
  console.log(`done. Skills active now. Run \`dotfiles plugins\` to install plugins/tools from plugins.json.`);
}

// Package-manager style: a labeled list of {command, args} — Claude plugin installs and
// third-party tool installers alike — run in order, one machine-modifying step per entry.
// Not chained into importOne(): import stays pure file-mirroring, plugins is the explicit
// "go install things" step (network calls, running remote scripts), same reason winget
// asks you to type `install` rather than doing it as a side effect of anything else.
function pluginsOne(sourceDir, target) {
  const file = path.join(dotfilesSourceDir(sourceDir, target), 'plugins.json');
  if (!fs.existsSync(file)) {
    console.log(`${target.label}: no plugins.json — nothing to install`);
    return;
  }
  const installers = JSON.parse(fs.readFileSync(file, 'utf8'));
  const quote = (a) => (/\s/.test(a) ? `"${a}"` : a);
  for (const { label, command, args } of installers) {
    const cmdLine = [command, ...args].map(quote).join(' ');
    console.log(`\n${target.label}: ${label}\n  $ ${cmdLine}`);
    // shell:true with a single pre-quoted string (no separate args array) — the safe form;
    // shell:true *with* an args array lets the shell re-split unescaped strings (Node
    // flags this, DEP0190) and breaks paths with spaces like "C:\Program Files\...".
    const result = spawnSync(cmdLine, { stdio: 'inherit', shell: true });
    if (result.error) console.log(`  failed to run: ${result.error.message}`);
    else if (result.status !== 0) console.log(`  exited ${result.status} — likely already installed, continuing`);
  }
}

function listMdNames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
}

// Everything at a glance: .ai/<tool>/project/ (agents, commands/prompts) + .ai/<tool>/home/
// (skills, settings, plugins.json expanded into its actual marketplace/plugin entries —
// not just the filename). Generated from disk every run, nothing here to hand-maintain or
// let go stale.
function treeOne(sourceDir, target) {
  const projectDir = path.join(sourceDir, target.key, 'project');
  const home = dotfilesSourceDir(sourceDir, target);
  console.log(`\n${target.label} — .ai/${target.key}/`);

  for (const sub of ['agents', 'commands']) {
    const names = listMdNames(path.join(projectDir, sub));
    if (names.length) {
      console.log(`  project/${sub}/${sub === 'commands' ? '  (prompts)' : ''}`);
      for (const n of names) console.log(`    ${n}`);
    }
  }

  const skills = listDirNames(path.join(home, 'skills'));
  if (skills.length) {
    console.log('  home/skills/');
    for (const s of skills) console.log(`    ${s}`);
  }

  const settingsFile = path.join(home, 'settings.json');
  if (fs.existsSync(settingsFile)) {
    console.log('  home/settings.json');
    for (const k of Object.keys(JSON.parse(fs.readFileSync(settingsFile, 'utf8')))) console.log(`    ${k}`);
  }

  const pluginsFile = path.join(home, 'plugins.json');
  if (fs.existsSync(pluginsFile)) {
    console.log('  home/plugins.json  (run `dotfiles plugins` to install)');
    for (const i of JSON.parse(fs.readFileSync(pluginsFile, 'utf8'))) console.log(`    ${i.label}`);
  }
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
  const homeBase = path.resolve(opts.home || os.homedir());
  const targets = resolveTargets(homeBase);
  const [action, name] = rest;

  if (!['import', 'list', 'remove', 'plugins', 'tree', undefined].includes(action)) {
    console.log(
      'usage: ai-config dotfiles <import|list|remove|plugins|tree> [--claude|--all] [name] [--source <dir>] [--home <dir>]'
    );
    return;
  }

  if (opts.home) console.log(`(--home override: treating ${homeBase} as the home directory, not ${os.homedir()})`);

  const selected = await pickTargets(flags, targets);
  if (selected.length === 0) {
    console.log('Nothing selected. Nothing to do.');
    return;
  }

  if (action === 'remove' && !name) {
    throw new Error('usage: ai-config dotfiles remove <skill-name> [--claude|--all]');
  }

  for (const target of selected) {
    if (action === 'import') importOne(sourceDir, target);
    else if (action === 'plugins') pluginsOne(sourceDir, target);
    else if (action === 'tree') treeOne(sourceDir, target);
    else if (action === 'remove') {
      const hit = removeOne(sourceDir, target, name);
      if (!hit) console.log(`${target.label}: skill not found: ${name}`);
    } else listOne(sourceDir, target);
  }
}

module.exports = { run };
