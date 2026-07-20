'use strict';
// dotfiles: applies this machine's slice of .ai/ (source of truth) to the real user
// config for each tool — machine-scoped, the counterpart to wrap.js's project-scoped
// generation (repo-local instead of user-scope). Multi-agent by design, same pattern as
// wrap.js's TARGETS — flags or a menu pick which agent(s), same reason (no arrow-key TUI
// dep, correct on every terminal). One direction only: these are what you hand-edit, never
// the live homeDir. No export.
// Everything here is flat under .ai/ (no <tool>/home/ nesting — there's no <tool>/project/
// left to disambiguate "home" from, see cli/wrap.js): tool-agnostic content sits at the
// root (skills/personal/, plugins.json — see their own comments for why), genuinely
// per-tool-schema content is a <key>-prefixed file instead of a subfolder
// (claude-settings.json, claude-hooks/) — settings.json's shape (effortLevel, hooks,
// enabledPlugins, ...) is Claude Code's own, not portable, so the prefix is honest about
// scope without needing a directory for it.
// Only Claude Code is wired up today — its ~/.claude path and shape are verified.
// Deliberately NOT tracked: plugins/ (9+ MB of cache + marketplace git clones) and ide/
// (per-process .lock files, pure runtime state, not config) — plugins.json (see `plugins`
// action below) reproduces both on demand instead, package-manager style, so there's
// nothing to duplicate or go stale.
// Codex, Gemini CLI, opencode, Cursor etc. belong in DOTFILE_TARGETS once there's real
// content for that tool AND a confirmed home-dir path — don't guess at where another
// tool's user config lives, a wrong guess here writes into a real profile.
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

// Genuinely per-tool schema (Claude Code's own settings.json shape) — a <key>-prefixed
// flat file, not a subfolder (see header comment).
function settingsFile(sourceDir, target) {
  return path.join(sourceDir, `${target.key}-settings.json`);
}

function sourceHooksDir(sourceDir, target) {
  return path.join(sourceDir, `${target.key}-hooks`);
}

// Tool-agnostic — flat at the .ai/ root, same reasoning as skills/core and skills/projects
// living outside any one tool's tree (see header comment).
function personalSkillsDir(sourceDir) {
  return path.join(sourceDir, 'skills', 'personal');
}

// Also tool-agnostic — see header comment. Not nested under any one tool's files because
// its entries aren't all about one tool (a `codex mcp add ...` entry is just as much at
// home here as a `claude plugin install ...` one).
function personalPluginsFile(sourceDir) {
  return path.join(sourceDir, 'plugins.json');
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
  console.log(`\n--- ${target.label}: .ai/ (source of truth) vs ${target.homeDir} (this machine) ---`);

  showDrift('skills', listDirNames(personalSkillsDir(sourceDir)), listDirNames(path.join(target.homeDir, 'skills')));
  showDrift(
    'hooks',
    listFileNames(sourceHooksDir(sourceDir, target)),
    listFileNames(path.join(target.homeDir, 'hooks'))
  );

  const storeSettingsFile = settingsFile(sourceDir, target);
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

  const pluginsFile = personalPluginsFile(sourceDir);
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
  const skillsSrc = personalSkillsDir(sourceDir);
  const hooksSrc = sourceHooksDir(sourceDir, target);
  const settingsSrc = settingsFile(sourceDir, target);
  if (![skillsSrc, hooksSrc, settingsSrc].some(fs.existsSync)) {
    throw new Error(`nothing to import for ${target.label} — none of ${skillsSrc}, ${hooksSrc}, ${settingsSrc} exist`);
  }

  console.log(`\n${target.label}: ${skillsSrc} -> ${target.homeDir}/skills`);
  mirrorDir(skillsSrc, path.join(target.homeDir, 'skills'));

  console.log(`${target.label}: ${hooksSrc} -> ${target.homeDir}/hooks`);
  const liveHooksDir = path.join(target.homeDir, 'hooks');
  if (mirrorDir(hooksSrc, liveHooksDir) && process.platform !== 'win32') {
    for (const f of fs.readdirSync(liveHooksDir)) fs.chmodSync(path.join(liveHooksDir, f), 0o755);
  }

  console.log(`${target.label}: settings.json -> ${target.homeDir}`);
  fs.mkdirSync(target.homeDir, { recursive: true });
  if (fs.existsSync(settingsSrc)) fs.copyFileSync(settingsSrc, path.join(target.homeDir, 'settings.json'));

  repairAbsolutePaths(target);
  console.log(`done. Skills active now. Run \`dotfiles plugins\` to install plugins/tools from plugins.json.`);
}

// Package-manager style: a labeled list of {command, args} — Claude plugin installs and
// third-party tool installers alike — run in order, one machine-modifying step per entry.
// Not chained into importOne(): import stays pure file-mirroring, plugins is the explicit
// "go install things" step (network calls, running remote scripts), same reason winget
// asks you to type `install` rather than doing it as a side effect of anything else.
function pluginsOne(sourceDir, target) {
  const file = personalPluginsFile(sourceDir);
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

// Everything at a glance for THIS machine: skills/personal/, <tool>-settings.json,
// plugins.json expanded into its actual marketplace/plugin entries — not just the
// filename. Project-scope stuff (agents, prompts) is wrap.js's job, not dotfiles' — it's
// generated per-project, not synced to this machine's home dir, so it doesn't belong here.
function treeOne(sourceDir, target) {
  console.log(`\n${target.label} — .ai/`);

  const skills = listDirNames(personalSkillsDir(sourceDir));
  if (skills.length) {
    console.log('  skills/personal/');
    for (const s of skills) console.log(`    ${s}`);
  }

  const settings = settingsFile(sourceDir, target);
  if (fs.existsSync(settings)) {
    console.log(`  ${target.key}-settings.json`);
    for (const k of Object.keys(JSON.parse(fs.readFileSync(settings, 'utf8')))) console.log(`    ${k}`);
  }

  const pluginsFile = personalPluginsFile(sourceDir);
  if (fs.existsSync(pluginsFile)) {
    console.log('  plugins.json  (run `dotfiles plugins` to install)');
    for (const i of JSON.parse(fs.readFileSync(pluginsFile, 'utf8'))) console.log(`    ${i.label}`);
  }
}

function removeOne(sourceDir, target, name) {
  let hit = false;
  for (const dir of [path.join(personalSkillsDir(sourceDir), name), path.join(target.homeDir, 'skills', name)]) {
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
