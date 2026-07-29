# Plain-text import manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `dotfiles import --select`'s interactive tri-state checkbox picker with a
versioned, plain-text `.ai/<key>-import.txt` manifest per target agent — selection becomes
a hand-edited fact in `.ai/`, not a re-run-to-know-what-was-chosen interactive step.

**Architecture:** `cli/dotfiles.js` gains `readImportManifest`/`categorySelection`
(read `.ai/<key>-import.txt`, derive a per-category filter with "zero lines for this
category = unfiltered" fallback) and loses `buildCategories`/`selectionFile`/
`loadSelection`/`saveSelection`. `importOne`/`pluginsOne` keep their existing "`null` =
full copy, `Set` = filtered copy" branches — only what computes the selection changes.
`cli/lib.js` loses the entire checkbox UI (`pickTriState`, `renderMenu`, `toggle`,
`triState`, `TRI_STATE_MARK`); `pickFromMenu` (plain numbered agent picker) is unrelated
and stays untouched.

**Tech Stack:** Node.js, no dependencies (matches the existing repo — see
`docs/superpowers/specs/2026-07-29-selective-dotfiles-import-design.md`'s rejected
alternatives for why).

## Global Constraints

- No new dependencies — `package.json` stays dependency-free.
- Manifest filename: `.ai/<key>-import.txt` (e.g. `.ai/claude-import.txt`), matching the
  existing `<key>-settings.json` / `<key>-hooks/` prefix convention.
- Manifest format: one `category:item` per line; blank lines and lines starting with `#`
  are ignored.
- Filtering is per-category opt-in: a category with zero manifest lines is
  imported/installed in full (unfiltered) — only listing at least one line for a category
  narrows it to those items. This applies identically to `skills`, `hooks`, `settings`,
  `plugins`.
- `--select` flag is removed entirely. No flag is needed to trigger manifest-based
  filtering — presence of `.ai/<key>-import.txt` alone triggers it, every `import`/
  `plugins` run.
- `--all` ignores the manifest entirely and processes every item (in addition to its
  existing "target every configured agent" meaning).
- `.ai-config-selection.json` and its read/write functions are deleted, not deprecated —
  nothing reads it after this change; old copies on a machine become inert, no migration.

---

### Task 1: Manifest-driven `cli/dotfiles.js` + `cli/lib.js`, with matching test coverage

**Files:**
- Modify: `cli/dotfiles.js` (full-file rewrite of the sections below; everything else in
  the file — `DOTFILE_TARGETS`, `parseArgs`, `resolveTargets`, `settingsFile`,
  `sourceHooksDir`, `personalSkillsDir`, `personalPluginsFile`, `claudeInstallId`,
  `listDirNames`, `listFileNames`, `showDrift`, `listOne`, `repairAbsolutePaths`,
  `treeOne`, `removeOne` — is unchanged, keep as-is)
- Modify: `cli/lib.js` (full-file rewrite — see Step 3)
- Modify: `cli/test.js` (remove tri-state/`--select`/`buildCategories`/selection-file
  tests, add manifest tests — see Step 5)
- Modify: `README.md` (dotfiles section — see Step 7)

**Interfaces:**
- Produces (used by `cli/test.js` and `cli/index.js`):
  - `dotfiles.run(argv, defaultSourceDir, io = {})` — unchanged signature.
  - `dotfiles.importOne(sourceDir, target, manifest = null)` — `manifest` replaces the old
    `selection` parameter; same shape (`Set<string>` of `"category:item"` keys, or `null`),
    just sourced differently by the caller.
  - `dotfiles.pluginsOne(sourceDir, target, manifest = null)` — same rename/shape as above.
  - `dotfiles.readImportManifest(sourceDir, target)` → `Set<string> | null`.
  - `dotfiles.importManifestFile(sourceDir, target)` → `string` (the file path, so callers/
    tests don't hardcode the `<key>-import.txt` naming convention twice).
  - Removed from exports: `buildCategories`, `selectionFile`, `loadSelection`,
    `saveSelection`.
  - `cli/lib.js` exports shrink to `{ write, mirrorDir, pickFromMenu }` — `pickTriState`,
    `renderMenu`, `toggle`, `triState` are removed (no other file imports them once this
    task is done).

- [ ] **Step 1: Replace the header comment and `require` line in `cli/dotfiles.js`**

Replace the file's top comment block (everything from the `'use strict';` line through the
`const { mirrorDir, pickFromMenu, pickTriState } = require('./lib');` line) with:

```js
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
```

- [ ] **Step 2: Rewrite `pickTargets`, delete `buildCategories`, add the manifest helpers,
  rewrite `importOne`/`pluginsOne`/`run`, update exports — all in `cli/dotfiles.js`**

Replace the `pickTargets` function with (only change: the `unknownFlags` special-case for
`'select'` is gone, since `--select` no longer exists):

```js
async function pickTargets(flags, targets) {
  const byFlag = targets.filter((t) => flags.has(t.key));
  if (byFlag.length) return byFlag;
  if (flags.has('all')) return targets;
  if (flags.size > 0) return []; // an unrecognized flag was passed — fail safe, don't guess
  const picked = await pickFromMenu(
    targets.map((t) => ({ key: t.key, label: t.label, extra: t.homeDir })),
    'AI Config dotfiles — which agent do you want to import into this machine?'
  );
  return targets.filter((t) => picked.has(t.key));
}
```

Delete the entire `buildCategories` function (the block starting with its doc comment
`// Reads what's actually in .ai/ ...` and ending at its closing `}`).

Delete the entire "Machine-local runtime state" block: the doc comment above
`selectionFile`, and the `selectionFile`, `loadSelection`, `saveSelection` functions.

In their place (same spot — right after `personalPluginsFile`/`claudeInstallId`, before
`listDirNames`), add:

```js
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
```

Replace `importOne` (rename its `selection` parameter to `manifest`, and derive three
independent per-category selections instead of one global one) with:

```js
function importOne(sourceDir, target, manifest = null) {
  const skillsSrc = personalSkillsDir(sourceDir);
  const hooksSrc = sourceHooksDir(sourceDir, target);
  const settingsSrc = settingsFile(sourceDir, target);
  if (![skillsSrc, hooksSrc, settingsSrc].some(fs.existsSync)) {
    throw new Error(`nothing to import for ${target.label} — none of ${skillsSrc}, ${hooksSrc}, ${settingsSrc} exist`);
  }

  const skillsSelection = categorySelection(manifest, 'skills');
  const hooksSelection = categorySelection(manifest, 'hooks');
  const settingsSelection = categorySelection(manifest, 'settings');

  const liveSkillsDir = path.join(target.homeDir, 'skills');
  console.log(`\n${target.label}: ${skillsSrc} -> ${liveSkillsDir}`);
  if (skillsSelection === null) {
    mirrorDir(skillsSrc, liveSkillsDir);
  } else {
    for (const name of listDirNames(skillsSrc)) {
      if (skillsSelection.has(`skills:${name}`)) fs.cpSync(path.join(skillsSrc, name), path.join(liveSkillsDir, name), { recursive: true });
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

  console.log(`${target.label}: settings.json -> ${target.homeDir}`);
  fs.mkdirSync(target.homeDir, { recursive: true });
  if (fs.existsSync(settingsSrc)) {
    if (settingsSelection === null) {
      fs.copyFileSync(settingsSrc, path.join(target.homeDir, 'settings.json'));
    } else {
      const storeSettings = JSON.parse(fs.readFileSync(settingsSrc, 'utf8'));
      const filtered = Object.fromEntries(Object.entries(storeSettings).filter(([k]) => settingsSelection.has(`settings:${k}`)));
      fs.writeFileSync(path.join(target.homeDir, 'settings.json'), JSON.stringify(filtered, null, 2) + '\n');
    }
  }

  repairAbsolutePaths(target);
  console.log(`done. Skills active now. Run \`dotfiles plugins\` to install plugins/tools from plugins.json.`);
}
```

Replace `pluginsOne`'s selection handling (keep its doc comment and the `spawnSync` loop
unchanged; only the parameter name and the filtering call change):

```js
function pluginsOne(sourceDir, target, manifest = null) {
  const file = personalPluginsFile(sourceDir);
  if (!fs.existsSync(file)) {
    console.log(`${target.label}: no plugins.json — nothing to install`);
    return;
  }
  let packages = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pluginsSelection = categorySelection(manifest, 'plugins');
  if (pluginsSelection !== null) {
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
  for (const { label, installs } of packages) {
    for (const step of installs) {
      const cmdLine = step.shell || [step.command, ...step.args].map(quote).join(' ');
      console.log(`\n${target.label}: ${label}${step.agent ? ` (${step.agent})` : ''}\n  $ ${cmdLine}`);
      const result = spawnSync(cmdLine, { stdio: 'inherit', shell: true });
      if (result.error) console.log(`  failed to run: ${result.error.message}`);
      else if (result.status !== 0) console.log(`  exited ${result.status} — likely already installed, continuing`);
    }
  }
}
```

Replace `run()`'s usage string and its `import`/`plugins` branches:

```js
  if (!['import', 'list', 'remove', 'plugins', 'tree', undefined].includes(action)) {
    console.log(
      'usage: ai-config dotfiles <import|list|remove|plugins|tree> [--claude|--all] [name] [--source <dir>] [--home <dir>]'
    );
    return;
  }
```

```js
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
```

Replace the final `module.exports` line with:

```js
module.exports = { run, importOne, pluginsOne, readImportManifest, importManifestFile };
```

- [ ] **Step 3: Rewrite `cli/lib.js` to drop the checkbox UI**

Replace the entire file with:

```js
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Shared by wrap.js and dotfiles.js: numbered menu, no arrow-key TUI dependency — plain
// readline is correct on every terminal at zero extra installs (Windows raw-mode is a
// real footgun for arrow-key pickers). `items` need only `key` and `label`; `extra` is an
// optional third column (a path, usually).
function pickFromMenu(items, header) {
  console.log(`\n${header} (detected OS: ${process.platform}, home: ${os.homedir()})\n`);
  items.forEach((it, i) =>
    console.log(`  ${String(i + 1).padStart(2)}) ${it.label.padEnd(18)} ${it.extra || ''}`)
  );
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\nNumbers separated by spaces/commas, "a" for all, Enter to cancel: ', (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (!trimmed) return resolve(new Set());
      if (trimmed === 'a' || trimmed === 'all') return resolve(new Set(items.map((it) => it.key)));
      const picked = new Set();
      for (const tok of trimmed.split(/[\s,]+/)) {
        const item = items[parseInt(tok, 10) - 1];
        if (item) picked.add(item.key);
      }
      resolve(picked);
    });
  });
}

function write(targetDir, relPath, content) {
  const full = path.join(targetDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return relPath;
}

// Mirror src into dst: dst ends up an exact copy of src (extras in dst are deleted).
function mirrorDir(src, dst) {
  if (!fs.existsSync(src)) return false;
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
  return true;
}

module.exports = { write, mirrorDir, pickFromMenu };
```

- [ ] **Step 4: Run the (still partly old) test suite to confirm the expected breakage**

Run: `npm test`
Expected: FAIL — `cli/test.js` still calls `lib.triState`, `lib.renderMenu`, `lib.toggle`,
`lib.pickTriState`, `dotfiles.buildCategories`, `dotfiles.selectionFile`,
`dotfiles.loadSelection`, `dotfiles.saveSelection`, and passes `--select` to
`dotfiles.run`, all of which are now gone. This confirms Step 5 has real work to do.

- [ ] **Step 5: Update `cli/test.js`**

Delete these three functions entirely (they test removed `lib.js` functions):
`testTriStateHelpers`, `testPickTriState`, `testPickTriStateEOF`.

In `main()`, delete the three calls to them:

```js
  testTriStateHelpers();
  await testPickTriState();
  await testPickTriStateEOF();
```

Delete this block (it tests the removed `buildCategories`/`selectionFile`/`loadSelection`/
`saveSelection`):

```js
  const claudeTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(tmp, 'fake-home', '.claude') };
  const categories = dotfiles.buildCategories(sourceDir, claudeTarget);
  assert.deepStrictEqual(
    categories.map((c) => c.key),
    ['skills', 'hooks', 'settings'],
    'buildCategories: includes skills/hooks/settings (plugins.json not written yet at this point in the fixture), skips empty ones'
  );
  assert.deepStrictEqual(categories.find((c) => c.key === 'skills').items, [{ key: 'demo-skill', label: 'demo-skill' }], 'buildCategories: skills items come from skills/personal/');
  assert.deepStrictEqual(categories.find((c) => c.key === 'settings').items, [{ key: 'model', label: 'model' }], 'buildCategories: settings items are the top-level keys of claude-settings.json');

  const selectionPath = dotfiles.selectionFile(claudeTarget);
  assert.strictEqual(selectionPath, path.join(claudeTarget.homeDir, '.ai-config-selection.json'), 'selectionFile: lives directly under homeDir');
  assert.strictEqual(dotfiles.loadSelection(claudeTarget), null, 'loadSelection: null when no file exists yet');
  dotfiles.saveSelection(claudeTarget, new Set(['skills:demo-skill']));
  const loaded = dotfiles.loadSelection(claudeTarget);
  assert.ok(loaded.has('skills:demo-skill') && loaded.size === 1, 'loadSelection: round-trips what saveSelection wrote');
  fs.rmSync(selectionPath); // clean up so it doesn't leak into the later real import test below
```

and replace it with:

```js
  const claudeTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(tmp, 'fake-home', '.claude') };
  assert.strictEqual(dotfiles.readImportManifest(sourceDir, claudeTarget), null, 'readImportManifest: null when .ai/claude-import.txt does not exist');

  // readImportManifest / per-category opt-in unit coverage, independent of the end-to-end
  // behavior asserted further below.
  {
    const manifestUnitSource = path.join(tmp, 'manifest-unit-source');
    fs.mkdirSync(manifestUnitSource, { recursive: true });
    fs.writeFileSync(
      path.join(manifestUnitSource, 'claude-import.txt'),
      '# a comment\n\n  skills:demo-skill  \nsettings:model\n'
    );
    const unitTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(tmp, 'manifest-unit-home') };
    const manifest = dotfiles.readImportManifest(manifestUnitSource, unitTarget);
    assert.deepStrictEqual([...manifest].sort(), ['settings:model', 'skills:demo-skill'], 'readImportManifest: comments/blanks stripped, lines trimmed');
    assert.strictEqual(dotfiles.readImportManifest(manifestUnitSource, { key: 'gemini' }), null, 'readImportManifest: null for a target with no manifest file, even when another target has one');
  }
```

The next block (`importOne` with an explicit `new Set([...])` — currently commented
"importOne with an explicit selection — bypasses the interactive prompt entirely") stays
**unchanged**: `importOne`'s third parameter still accepts a raw combined `Set` exactly as
before, so this test already exercises `categorySelection` indirectly. Just below it, add
a new block testing the per-category opt-in fallback specifically:

```js
  // Per-category opt-in fallback: a manifest that only mentions skills: leaves
  // hooks/settings unfiltered (imported in full) — the safety property the design chose
  // over "whole-file-exhaustive" (see
  // docs/superpowers/specs/2026-07-29-manifest-dotfiles-import-design.md).
  const fallbackHome = path.join(tmp, 'fallback-home');
  const fallbackTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(fallbackHome, '.claude') };
  dotfiles.importOne(sourceDir, fallbackTarget, new Set(['skills:demo-skill'])); // no hooks:/settings: lines at all
  assert.ok(!fs.existsSync(path.join(fallbackHome, '.claude/skills/second-skill')), 'per-category opt-in: mentioned category (skills) is filtered');
  assert.ok(fs.existsSync(path.join(fallbackHome, '.claude/hooks/demo-hook')), 'per-category opt-in: unmentioned category (hooks) still imports in full');
  const fallbackSettings = JSON.parse(fs.readFileSync(path.join(fallbackHome, '.claude/settings.json'), 'utf8'));
  assert.deepStrictEqual(fallbackSettings, { model: 'test', theme: 'auto' }, 'per-category opt-in: unmentioned category (settings) still imports in full');
```

Find the existing "Finding #7 (opportunistic)" block:

```js
  // Finding #7 (opportunistic): a selective import with zero hooks selected must not create
  // an empty hooks/ dir — symmetric with the skills branch above, which creates nothing when
  // zero skills match.
  const noHooksHome = path.join(tmp, 'no-hooks-home');
  const noHooksTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(noHooksHome, '.claude') };
  dotfiles.importOne(sourceDir, noHooksTarget, new Set(['skills:demo-skill'])); // no hooks:* key selected
  assert.ok(
    !fs.existsSync(path.join(noHooksTarget.homeDir, 'hooks')),
    'selective import creates no hooks/ dir when zero hooks are selected (finding #7)'
  );
```

Replace it with (the input must now explicitly mention `hooks:` with a non-matching item,
otherwise — per the new per-category opt-in fallback just tested above — an *unmentioned*
hooks category would import in full instead of creating nothing):

```js
  // Finding #7 (opportunistic): a selective import with the hooks category mentioned but
  // matching nothing must not create an empty hooks/ dir — symmetric with the skills
  // branch above. (Omitting hooks: entirely would hit the per-category opt-in fallback
  // tested above instead — this uses a non-matching hooks: line to stay in the "mentioned
  // but empty" branch.)
  const noHooksHome = path.join(tmp, 'no-hooks-home');
  const noHooksTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(noHooksHome, '.claude') };
  dotfiles.importOne(sourceDir, noHooksTarget, new Set(['skills:demo-skill', 'hooks:nonexistent-hook']));
  assert.ok(
    !fs.existsSync(path.join(noHooksTarget.homeDir, 'hooks')),
    'selective import creates no hooks/ dir when the hooks category is mentioned but matches nothing (finding #7)'
  );
```

Find the "`--select` flag end-to-end" block (starts with the comment `// --select flag
end-to-end: pickTargets must not treat a bare "--select"...` and runs through its closing
`}`), and delete it entirely. Replace it with an end-to-end manifest test that goes through
`dotfiles.run` (no flag — presence of the file alone triggers filtering):

```js
  // Manifest end-to-end: .ai/claude-import.txt drives `dotfiles import` with no flag at
  // all — presence of the file is what triggers filtering, replacing the old --select flag.
  {
    const manifestFile = dotfiles.importManifestFile(sourceDir, claudeTarget);
    fs.writeFileSync(manifestFile, '# comment lines and blank lines are ignored\n\nskills:demo-skill\nsettings:model\n');

    const manifestHome = path.join(tmp, 'manifest-home');
    await dotfiles.run(['import', '--claude', '--home', manifestHome], sourceDir);

    assert.ok(fs.existsSync(path.join(manifestHome, '.claude/skills/demo-skill')), 'manifest end-to-end: listed skill is materialized');
    assert.ok(!fs.existsSync(path.join(manifestHome, '.claude/skills/second-skill')), 'manifest end-to-end: unlisted skill in a mentioned category is NOT materialized');
    assert.ok(fs.existsSync(path.join(manifestHome, '.claude/hooks/demo-hook')), 'manifest end-to-end: hooks (not mentioned in the manifest) still imports in full');
    const manifestSettings = JSON.parse(fs.readFileSync(path.join(manifestHome, '.claude/settings.json'), 'utf8'));
    assert.deepStrictEqual(manifestSettings, { model: 'test' }, 'manifest end-to-end: only the listed settings.json key is kept');

    // --all bypasses the manifest entirely, even though the file still exists.
    const manifestAllHome = path.join(tmp, 'manifest-all-home');
    await dotfiles.run(['import', '--claude', '--all', '--home', manifestAllHome], sourceDir);
    assert.ok(fs.existsSync(path.join(manifestAllHome, '.claude/skills/second-skill')), '--all bypasses the manifest even when it exists');

    fs.rmSync(manifestFile); // don't leak into later assertions in this file
  }
```

Find the "Finding #3" block (comment starts `// Finding #3: a later plain (non-selective)
dotfiles import must clear any selection saved by a previous --select run...`) and delete
it entirely — the mechanism it tested (a persisted selection file that must be cleared) no
longer exists; the manifest is read fresh from `.ai/` every run, nothing to go stale.

Find the "Finding #6" block and replace it with a version that doesn't reference
`--select`/`saveSelection`/`selectionFile` (the underlying property — a throwing
`importOne` must not leave a target home dir behind — still matters and is still checked):

```js
  // Finding #6 (opportunistic): if importOne throws (e.g. .ai/ only has plugins.json, none
  // of skills/hooks/settings for it to work with), no target home dir should be left behind.
  {
    const throwSourceDir = path.join(tmp, 'throw-source');
    fs.mkdirSync(throwSourceDir, { recursive: true });
    fs.writeFileSync(
      path.join(throwSourceDir, 'plugins.json'),
      JSON.stringify([{ label: 'only-package', installs: [{ agent: 'demo', command: process.execPath, args: ['--version'] }] }])
    );
    const throwHome = path.join(tmp, 'throw-home');
    const throwTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(throwHome, '.claude') };
    let threw = false;
    try {
      await dotfiles.run(['import', '--claude', '--home', throwHome], throwSourceDir);
    } catch {
      threw = true;
    }
    assert.ok(threw, 'sanity: importOne throws when .ai/ has only plugins.json (no skills/hooks/settings)');
    assert.ok(!fs.existsSync(throwTarget.homeDir), 'a throwing importOne must not leave an empty target home dir behind (finding #6)');
  }
```

Find the "Confirming with nothing selected must abort..." block (right after the Finding
#6 block, ending right before the `if (process.platform !== 'win32')` hook-permissions
check) and delete it entirely — it tested the interactive tri-state picker's empty-
selection abort path, which no longer exists (there's no interactive step to confirm).

Find the `categoriesWithPlugins = dotfiles.buildCategories(...)` block (right after the
`plugins.json` fixture with `demo installer`/`shell-demo`) and delete it entirely
(`buildCategories` is gone; plugin-label coverage is already provided by the
`pluginsOne`/`run(plugins)` tests).

Find the "Findings #1 and #4" block (comment starts `// Findings #1 and #4: \`dotfiles
plugins\`, run end-to-end through run()...`) and replace its body with manifest-file-based
coverage. Manifests live under `sourceDir` now (not per-`homeDir`), so each case that needs
different manifest content uses its own scratch source dir:

```js
  // dotfiles plugins honors the manifest's plugins: lines (per-category opt-in, same
  // mechanism as import); --all bypasses it; a manifest that never mentions plugins:
  // installs everything (the general per-category fallback, not a special case anymore —
  // see docs/superpowers/specs/2026-07-29-manifest-dotfiles-import-design.md).
  {
    const capture = async (fn) => {
      const captured = [];
      const orig = console.log;
      console.log = (...a) => captured.push(a.join(' '));
      try {
        await fn();
      } finally {
        console.log = orig;
      }
      return captured.join('\n');
    };
    const dollarLineCount = (output) => output.split('\n').filter((l) => l.trim().startsWith('$ ')).length;
    const twoPackagesFixture = () => ([
      { label: 'kept-package', installs: [{ agent: 'demo', command: process.execPath, args: ['--version'] }] },
      { label: 'excluded-package', installs: [{ agent: 'demo', command: process.execPath, args: ['--version'] }] },
    ]);

    // Case 1: a manifest listing only "plugins:kept-package" — plain `dotfiles plugins`
    // (no flags) honors it: only "kept-package" actually runs its install step.
    const honoredSourceDir = path.join(tmp, 'plugins-source-honored');
    fs.mkdirSync(honoredSourceDir, { recursive: true });
    fs.writeFileSync(path.join(honoredSourceDir, 'plugins.json'), JSON.stringify(twoPackagesFixture()));
    fs.writeFileSync(path.join(honoredSourceDir, 'claude-import.txt'), 'plugins:kept-package\n');
    const honoredHome = path.join(tmp, 'plugins-home-honored');
    const honoredOutput = await capture(() => dotfiles.run(['plugins', '--claude', '--home', honoredHome], honoredSourceDir));
    assert.strictEqual(dollarLineCount(honoredOutput), 1, 'run(plugins): only the listed package actually installs when a manifest mentions plugins:');
    assert.match(honoredOutput, /skipping excluded-package/, 'run(plugins): excluded package prints a skip line');

    // Case 2: --all bypasses the manifest entirely — both packages run.
    const allOutput = await capture(() => dotfiles.run(['plugins', '--claude', '--all', '--home', honoredHome], honoredSourceDir));
    assert.strictEqual(dollarLineCount(allOutput), 2, 'run(plugins --all): manifest is bypassed, both packages install');
    assert.doesNotMatch(allOutput, /skipping/, 'run(plugins --all): no skip line since the manifest is bypassed entirely');

    // Case 3 (per-category opt-in fallback): a manifest that exists but never mentions
    // plugins: at all — e.g. it only curates skills — must install every plugin, not zero.
    const neverMentionedSourceDir = path.join(tmp, 'plugins-source-never-mentioned');
    fs.mkdirSync(neverMentionedSourceDir, { recursive: true });
    fs.writeFileSync(path.join(neverMentionedSourceDir, 'plugins.json'), JSON.stringify(twoPackagesFixture()));
    fs.writeFileSync(path.join(neverMentionedSourceDir, 'claude-import.txt'), 'skills:some-skill\n'); // no plugins: line at all
    const neverMentionedHome = path.join(tmp, 'plugins-home-never-mentioned');
    const neverMentionedOutput = await capture(() => dotfiles.run(['plugins', '--claude', '--home', neverMentionedHome], neverMentionedSourceDir));
    assert.strictEqual(
      dollarLineCount(neverMentionedOutput),
      2,
      'run(plugins): a manifest that never mentions plugins: installs everything, not nothing (per-category opt-in fallback)'
    );
    assert.doesNotMatch(neverMentionedOutput, /skipping/, 'run(plugins): no skip lines when plugins: was never mentioned');
  }
```

Leave everything else in `cli/test.js` (the `wrap.run` assertions, `dotfiles list`/`tree`
assertions, the `remove` test, the plain `import`/`plugins` smoke calls, the DOTFILE_TARGETS
label/homeDir check) untouched.

- [ ] **Step 6: Run the test suite and confirm it passes**

Run: `npm test`
Expected: `ok — all checks passed` printed at the end, no assertion failures.

- [ ] **Step 7: Update `README.md`'s dotfiles documentation**

In the "Editing" section, replace the bullet that starts `- Applying this machine's
dotfiles (currently Claude Code only): ...` (it currently ends with `` `tree` prints this
machine's home-scope picture (personal skills, settings, plugins) generated from disk.``)
with:

```markdown
- Applying this machine's dotfiles (currently Claude Code only): `node cli/index.js dotfiles
  list` / `import` / `plugins` / `tree` — see [cli/dotfiles.js](cli/dotfiles.js) for flags
  and the `--home` sandbox option for testing without touching your real profile. `import`
  mirrors everything by default (personal skills, hooks, settings.json). To bring over a
  subset instead, hand-write `.ai/<key>-import.txt` (e.g. `.ai/claude-import.txt`) — a
  plain-text, versioned allowlist, one `category:item` per line (`skills:demo-skill`,
  `hooks:demo-hook`, `settings:model`, `plugins:demo installer`; `#` comments and blank
  lines are ignored). Run `dotfiles tree --claude` to see the available names to prefix.
  Filtering is per category: a category with zero lines in the file is imported/installed
  in full — only list a category once you want to narrow it to specific items. `import` and
  `plugins` both read this file automatically, every run, no flag needed. `plugins` runs
  `.ai/plugins.json`, package-manager style, kept as its own step since it hits the network
  and installs software or registers MCP servers. `--all` means two things at once: it
  targets every configured agent (no `--claude`/`--copilot`/`--gemini` needed), and it makes
  both `import` and `plugins` ignore `.ai/<key>-import.txt` entirely and process every item
  — the way to do a full "everything" run without editing or deleting the manifest file.
  `tree` prints this machine's home-scope picture (personal skills, settings, plugins)
  generated from `.ai/`, prefixed the same way manifest lines are.
```

- [ ] **Step 8: Commit**

```bash
git add cli/dotfiles.js cli/lib.js cli/test.js README.md
git commit -m "$(cat <<'EOF'
Replace interactive checkbox picker with a plain-text import manifest

dotfiles import --select's tri-state readline UI (and the machine-local
.ai-config-selection.json it wrote) is gone. Selection is now a
versioned .ai/<key>-import.txt file, read fresh every run: presence of
a category's lines filters that category, absence imports it in full.
EOF
)"
```

## Explicitly out of scope (YAGNI)

- No command to auto-generate/scaffold the manifest file — `dotfiles tree` already lists
  the names.
- No validation that a manifest line's item actually exists in `.ai/`.
- No migration tooling for old `.ai-config-selection.json` files.

(Matches the design spec's own out-of-scope list —
`docs/superpowers/specs/2026-07-29-manifest-dotfiles-import-design.md`.)
