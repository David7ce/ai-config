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
// Claude Code, GitHub Copilot CLI, and Antigravity CLI are wired up today — their home
// paths and shapes are verified. Antigravity retains the former Gemini home path.
// Deliberately NOT tracked: plugins/ (9+ MB of cache + marketplace git clones) and ide/
// (per-process .lock files, pure runtime state, not config) — plugins.json (see `plugins`
// action below) reproduces both on demand instead, package-manager style, so there's
// nothing to duplicate or go stale.
// Codex, opencode, Cursor etc. belong in DOTFILE_TARGETS once there's real
// content for that tool AND a confirmed home-dir path — don't guess at where another
// tool's user config lives, a wrong guess here writes into a real profile.
// import/plugins bring EVERYTHING across by default. To bring a subset, hand-write
// .ai/<key>-import.txt (see readImportManifest below) — a plain-text, versioned,
// per-category opt-in allowlist. Replaces an earlier interactive checkbox picker: a
// manifest is diffable, reviewable, and portable across machines the way an interactive
// prompt's machine-local answer never was (see
// docs/superpowers/specs/2026-07-29-manifest-dotfiles-import-design.md).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { mirrorDir, pickFromMenu } = require('./lib');

// dirName, not a precomputed absolute path: lets --home override where "home" is (see run()),
// so `import` can be pointed at a scratch dir instead of the real profile for testing.
// skills: whether this tool has a directory-based personal-skill concept at all
// (Antigravity does not currently expose one). Every other category (hooks,
// settings.json) already works the same way for every target with no flag needed.
const DOTFILE_TARGETS = [
  { key: 'claude', label: 'Claude Code', dirName: '.claude', skills: true },
  { key: 'copilot', label: 'GitHub Copilot CLI', dirName: '.copilot', skills: true },
  { key: 'antigravity', label: 'Antigravity CLI', dirName: '.gemini', skills: false },
  { key: 'codex', label: 'Codex', dirName: '.codex', skills: false, config: 'toml' },
];

const TARGET_ALIASES = {
  gemini: 'antigravity',
};

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
  const normalizedFlags = new Set([...flags].map((flag) => TARGET_ALIASES[flag] || flag));
  const byFlag = targets.filter((t) => normalizedFlags.has(t.key));
  if (byFlag.length) return byFlag;
  if (flags.has('all')) return targets;
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
  return path.join(sourceDir, `${target.key}-settings.${target.config || 'json'}`);
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

function userMcpFile(sourceDir, target) {
  return path.join(sourceDir, `${target.key}-user-mcp.json`);
}

// Pulls the installed plugin@marketplace id out of an install step, whether it's a plain
// {command, args} form or a chained {shell} form — used to compare against this machine's
// live enabledPlugins. Returns null for steps that aren't a `claude plugin install`.
function claudeInstallId(step) {
  if (step.command === 'claude' && step.args[0] === 'plugin' && step.args[1] === 'install') return step.args[2];
  const m = (step.shell || '').match(/claude plugin install (\S+)/);
  return m ? m[1] : null;
}

// Manifest file per target: .ai/<key>-import.txt — versioned, plain-text, one
// "category:item" per line (# comments and blank lines ignored). Read fresh from .ai/
// every run, so there's nothing to persist per machine (unlike the old interactive
// picker's .ai-config-selection.json — see header comment).
function importManifestFile(sourceDir, target) {
  return path.join(sourceDir, `${target.key}-import.txt`);
}

function readImportManifest(sourceDir, target) {
  const file = importManifestFile(sourceDir, target);
  if (!fs.existsSync(file)) return null;
  const lines = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  return new Set(lines);
}

// Per-category opt-in: a category with zero manifest lines is unfiltered (import/install
// everything in it) — only listing at least one line for a category narrows it to those
// items. Returns null for "unfiltered", else the Set of that category's "<prefix>:<item>"
// keys (a subset of `manifest`, filtered to one prefix).
function categorySelection(manifest, prefix) {
  if (!manifest) return null;
  const items = [...manifest].filter((k) => k.startsWith(`${prefix}:`));
  return items.length ? new Set(items) : null;
}

// Surfaces a manifest line that named a category (at least one line with that prefix
// exists) but matched nothing on disk — a typo'd name, a trailing comment
// ("skills:foo # note", which readImportManifest doesn't strip), or a stale entry for
// something since removed from .ai/. Cheap enough to warn on every category, not just
// settings — see the settings-specific guard below for why settings additionally refuses
// to write an empty file.
function warnUnmatched(target, prefix, selection, knownNames) {
  if (!selection) return;
  for (const key of selection) {
    if (!knownNames.includes(key.slice(prefix.length + 1))) {
      console.log(`${target.label}: warning — "${key}" in .ai/${target.key}-import.txt matches nothing, ignored`);
    }
  }
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
    const packages = JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
    const claudePlugins = packages.flatMap((p) => p.installs).map(claudeInstallId).filter(Boolean);
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

function importOne(sourceDir, target, manifest = null) {
  const skillsSrc = personalSkillsDir(sourceDir);
  const hooksSrc = sourceHooksDir(sourceDir, target);
  const settingsSrc = settingsFile(sourceDir, target);
  const userMcpSrc = userMcpFile(sourceDir, target);
  if (![skillsSrc, hooksSrc, settingsSrc, userMcpSrc].some(fs.existsSync)) {
    throw new Error(`nothing to import for ${target.label} — none of ${skillsSrc}, ${hooksSrc}, ${settingsSrc} exist`);
  }

  const skillsSelection = categorySelection(manifest, 'skills');
  const hooksSelection = categorySelection(manifest, 'hooks');
  const settingsSelection = categorySelection(manifest, 'settings');

  warnUnmatched(target, 'skills', skillsSelection, listDirNames(skillsSrc));
  warnUnmatched(target, 'hooks', hooksSelection, listFileNames(hooksSrc));

  if (target.skills !== false) {
    const liveSkillsDir = path.join(target.homeDir, 'skills');
    console.log(`\n${target.label}: ${skillsSrc} -> ${liveSkillsDir}`);
    if (skillsSelection === null) {
      mirrorDir(skillsSrc, liveSkillsDir);
    } else {
      for (const name of listDirNames(skillsSrc)) {
        if (skillsSelection.has(`skills:${name}`)) fs.cpSync(path.join(skillsSrc, name), path.join(liveSkillsDir, name), { recursive: true });
      }
    }
  }

  const liveHooksDir = path.join(target.homeDir, 'hooks');
  console.log(`${target.label}: ${hooksSrc} -> ${liveHooksDir}`);
  let copiedHooks = [];
  if (hooksSelection === null) {
    if (mirrorDir(hooksSrc, liveHooksDir)) copiedHooks = listFileNames(liveHooksDir);
  } else {
    // Lazy mkdir — only create hooks/ if at least one hook is actually going to be copied,
    // symmetric with the skills branch above (which creates nothing when zero skills match).
    let hooksDirMade = false;
    for (const name of listFileNames(hooksSrc)) {
      if (hooksSelection.has(`hooks:${name}`)) {
        if (!hooksDirMade) {
          fs.mkdirSync(liveHooksDir, { recursive: true });
          hooksDirMade = true;
        }
        fs.cpSync(path.join(hooksSrc, name), path.join(liveHooksDir, name));
        copiedHooks.push(name);
      }
    }
  }
  if (copiedHooks.length && process.platform !== 'win32') {
    for (const f of copiedHooks) fs.chmodSync(path.join(liveHooksDir, f), 0o755);
  }

  console.log(`${target.label}: settings -> ${target.homeDir}`);
  fs.mkdirSync(target.homeDir, { recursive: true });
  if (fs.existsSync(settingsSrc)) {
    if (target.config === 'toml') {
      fs.copyFileSync(settingsSrc, path.join(target.homeDir, 'config.toml'));
      console.log(`${target.label}: config.toml copied; MCP and plugin declarations preserved`);
      return;
    }
    if (settingsSelection === null) {
      fs.copyFileSync(settingsSrc, path.join(target.homeDir, 'settings.json'));
    } else {
      const storeSettings = JSON.parse(fs.readFileSync(settingsSrc, 'utf8'));
      warnUnmatched(target, 'settings', settingsSelection, Object.keys(storeSettings));
      const filtered = Object.fromEntries(Object.entries(storeSettings).filter(([k]) => settingsSelection.has(`settings:${k}`)));
      if (Object.keys(filtered).length === 0 && Object.keys(storeSettings).length > 0) {
        console.log(`${target.label}: settings.json — every settings: line in .ai/${target.key}-import.txt matched nothing; leaving settings.json as-is instead of writing {}`);
      } else {
        fs.writeFileSync(path.join(target.homeDir, 'settings.json'), JSON.stringify(filtered, null, 2) + '\n');
      }
    }
  }

  repairAbsolutePaths(target);
  if (fs.existsSync(userMcpSrc)) {
    const liveUserConfig = target.key === 'claude' ? path.join(path.dirname(target.homeDir), '.claude.json') : null;
    if (liveUserConfig) {
      const current = fs.existsSync(liveUserConfig) ? JSON.parse(fs.readFileSync(liveUserConfig, 'utf8')) : {};
      const userMcp = JSON.parse(fs.readFileSync(userMcpSrc, 'utf8'));
      fs.writeFileSync(liveUserConfig, JSON.stringify({ ...current, mcpServers: userMcp }, null, 2) + '\n');
      console.log(`${target.label}: user MCP -> ${liveUserConfig}`);
    }
  }
  console.log(`done. Skills active now. Run \`dotfiles plugins\` to install plugins/tools from plugins.json.`);
}

// Package-manager style: a labeled list of packages, each with one or more install steps
// — run in order, one machine-modifying step per entry. A package with steps for more
// than one agent (e.g. a plugin that installs into both Claude and Codex) is one entry,
// not a copy per agent — the label states what's being installed once, and each step says
// which agent it's for. A step is normally {agent, command, args}; when an agent
// genuinely needs more than one invocation (e.g. `plugin marketplace add` must run before
// `plugin install` can reference it), that's still ONE step for that agent — {agent,
// shell: "cmd1 && cmd2"} — not two separate steps, so "how many claude steps does this
// package have" always answers "one per agent it supports."
// Not chained into importOne(): import stays pure file-mirroring, plugins is the explicit
// "go install things" step (network calls, running remote scripts), same reason winget
// asks you to type `install` rather than doing it as a side effect of anything else.
function pluginsOne(sourceDir, target, manifest = null) {
  const file = personalPluginsFile(sourceDir);
  if (!fs.existsSync(file)) {
    console.log(`${target.label}: no plugins.json — nothing to install`);
    return;
  }
  let packages = JSON.parse(fs.readFileSync(file, 'utf8'));
  packages = packages.map((pkg) => ({ ...pkg, installs: pkg.installs.filter((step) => !step.agent || TARGET_ALIASES[step.agent] === target.key || step.agent === target.key) }));
  const pluginsSelection = categorySelection(manifest, 'plugins');
  if (pluginsSelection !== null) {
    warnUnmatched(target, 'plugins', pluginsSelection, packages.map((p) => p.label));
    packages = packages.filter(({ label }) => {
      const included = pluginsSelection.has(`plugins:${label}`);
      if (!included) {
        console.log(
          `${target.label}: skipping ${label} (not listed in .ai/${target.key}-import.txt — add "plugins:${label}" to include it, or run \`dotfiles plugins --all\`)`
        );
      }
      return included;
    });
  }
  const quote = (a) => (/\s/.test(a) ? `"${a}"` : a);
  for (const { label, installs } of packages.filter((pkg) => pkg.installs.length > 0)) {
    for (const step of installs) {
      // shell:true with a single pre-quoted string (no separate args array) — the safe form;
      // shell:true *with* an args array lets the shell re-split unescaped strings (Node
      // flags this, DEP0190) and breaks paths with spaces like "C:\Program Files\...".
      const cmdLine = step.shell || [step.command, ...step.args].map(quote).join(' ');
      console.log(`\n${target.label}: ${label}${step.agent ? ` (${step.agent})` : ''}\n  $ ${cmdLine}`);
      const result = spawnSync(cmdLine, { stdio: 'inherit', shell: true });
      if (result.error) console.log(`  failed to run: ${result.error.message}`);
      else if (result.status !== 0) console.log(`  exited ${result.status} — likely already installed, continuing`);
    }
  }
}

// Everything at a glance for THIS machine: skills/personal/, <tool>-hooks/,
// <tool>-settings.json, plugins.json expanded into its actual marketplace/plugin entries —
// not just the filename. Project-scope stuff (agents, prompts) is wrap.js's job, not
// dotfiles' — it's generated per-project, not synced to this machine's home dir, so it
// doesn't belong here.
function treeOne(sourceDir, target) {
  console.log(`\n${target.label} — .ai/`);

  const skills = listDirNames(personalSkillsDir(sourceDir));
  if (skills.length) {
    console.log('  skills/personal/');
    for (const s of skills) console.log(`    ${s}`);
  }

  const hooks = listFileNames(sourceHooksDir(sourceDir, target));
  if (hooks.length) {
    console.log(`  ${target.key}-hooks/`);
    for (const h of hooks) console.log(`    ${h}`);
  }

  const settings = settingsFile(sourceDir, target);
  if (fs.existsSync(settings)) {
    console.log(`  ${target.key}-settings.json`);
    for (const k of Object.keys(JSON.parse(fs.readFileSync(settings, 'utf8')))) console.log(`    ${k}`);
  }

  const pluginsFile = personalPluginsFile(sourceDir);
  if (fs.existsSync(pluginsFile)) {
    console.log('  plugins.json  (run `dotfiles plugins` to install)');
    for (const p of JSON.parse(fs.readFileSync(pluginsFile, 'utf8'))) {
      const agents = [...new Set(p.installs.map((i) => i.agent).filter(Boolean))];
      console.log(`    ${p.label}${agents.length ? ` [${agents.join(', ')}]` : ''}`);
    }
  }
}

// Unlike every other action here, this deletes from sourceDir for real — --home only
// redirects target.homeDir (the live copy), it does not sandbox the source. Testing this
// against the real .ai/ deletes a real personal skill; always pass a throwaway sourceDir.
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
      'usage: ai-config dotfiles <import|list|remove|plugins|tree> [--claude|--copilot|--gemini|--antigravity|--all] [name] [--source <dir>] [--home <dir>]'
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
    throw new Error('usage: ai-config dotfiles remove <skill-name> [--claude|--copilot|--gemini|--antigravity|--all]');
  }

  for (const target of selected) {
    if (action === 'import') {
      const manifest = flags.has('all') ? null : readImportManifest(sourceDir, target);
      importOne(sourceDir, target, manifest);
    } else if (action === 'plugins') {
      const manifest = flags.has('all') ? null : readImportManifest(sourceDir, target);
      pluginsOne(sourceDir, target, manifest);
    } else if (action === 'tree') treeOne(sourceDir, target);
    else if (action === 'remove') {
      const hit = removeOne(sourceDir, target, name);
      if (!hit) console.log(`${target.label}: skill not found: ${name}`);
    } else listOne(sourceDir, target);
  }
}

module.exports = { run, importOne, pluginsOne, readImportManifest, importManifestFile };
