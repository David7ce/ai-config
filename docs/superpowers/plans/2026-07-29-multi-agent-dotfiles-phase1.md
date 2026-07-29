# Multi-Agent Dotfiles Phase 1 (Copilot CLI + Gemini CLI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `dotfiles import`/`plugins`/`list`/`tree`/`remove` beyond Claude Code to also cover GitHub Copilot CLI (`~/.copilot/`) and Gemini CLI (`~/.gemini/`), reusing the exact same `skills/personal/`, `<key>-hooks/`, `<key>-settings.json` mechanism already built for Claude.

**Architecture:** `DOTFILE_TARGETS` in `cli/dotfiles.js` grows from one entry to three, each carrying a new `skills: boolean` capability flag (Gemini CLI has no skills concept; Copilot CLI does, using the same `SKILL.md` format as Claude). Every other function (`buildCategories`, `importOne`, `listOne`, `treeOne`) already reads `target.key`/`target.label`/`target.homeDir` generically — they just need to also respect `target.skills` wherever they currently touch the shared `skills/personal/` source unconditionally. No new files, no new dependencies, no MCP-server sync (that stays a `plugins.json` installer concern, unchanged).

**Tech Stack:** Node.js (`fs`, `path`), no new dependencies. Existing `assert`-based smoke test (`cli/test.js`).

## Global Constraints

- No new npm dependencies.
- `target.skills !== false` is the check everywhere (not `target.skills === true`) — this means any target object that doesn't set `skills` at all (e.g. ad-hoc test fixtures built as plain `{key, label, homeDir}` objects, which several existing tests already do) keeps defaulting to "skills supported," matching today's unconditional behavior and not breaking any pre-existing test.
- MCP server config (Copilot's `mcp-config.json`, Gemini's embedded `mcpServers`) is out of scope — do not add any code that reads, writes, or syncs it.
- Do not populate `.ai/copilot-settings.json`, `.ai/copilot-hooks/`, or `.ai/gemini-settings.json` with real content in this plan — only throwaway fixtures inside `cli/test.js`'s temp-dir tests. Populating real content is a separate follow-up.
- Spec: `docs/superpowers/specs/2026-07-29-multi-agent-dotfiles-phase1-design.md`

---

### Task 1: Add Copilot CLI and Gemini CLI to `DOTFILE_TARGETS`

**Files:**
- Modify: `cli/dotfiles.js`
- Test: `cli/test.js`

**Interfaces:**
- Produces: `DOTFILE_TARGETS` now has three entries: `{key: 'claude', label: 'Claude Code', dirName: '.claude', skills: true}`, `{key: 'copilot', label: 'GitHub Copilot CLI', dirName: '.copilot', skills: true}`, `{key: 'gemini', label: 'Gemini CLI', dirName: '.gemini', skills: false}`. `resolveTargets` already spreads every field of each `DOTFILE_TARGETS` entry (`{...t, homeDir: ...}`), so `skills` flows through to every `target` object without any change to `resolveTargets` itself.

- [ ] **Step 1: Write the failing test**

Add to `cli/test.js`, right after the existing three `dotfiles.run(['list', ...])` calls (search for `await dotfiles.run(['list', '--nonexistent-flag'], sourceDir);` — insert immediately after that line):

```js
  // New DOTFILE_TARGETS entries are selectable by flag and resolve to the right label/homeDir
  // — checked indirectly via listOne's printed header line, since DOTFILE_TARGETS/
  // resolveTargets aren't exported (same reasoning the rest of this file already uses:
  // exercise behavior through dotfiles.run, not internals that aren't part of the module's
  // public surface).
  {
    const targetsHome = path.join(tmp, 'targets-home');
    const logs = [];
    const origLog = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    await dotfiles.run(['list', '--copilot', '--home', targetsHome], sourceDir);
    await dotfiles.run(['list', '--gemini', '--home', targetsHome], sourceDir);
    console.log = origLog;
    const output = logs.join('\n');
    assert.match(
      output,
      new RegExp(`GitHub Copilot CLI: \\.ai/ \\(source of truth\\) vs ${path.join(targetsHome, '.copilot').replace(/[\\.]/g, '\\$&')}`),
      'DOTFILE_TARGETS: copilot resolves to label "GitHub Copilot CLI" and homeDir <home>/.copilot'
    );
    assert.match(
      output,
      new RegExp(`Gemini CLI: \\.ai/ \\(source of truth\\) vs ${path.join(targetsHome, '.gemini').replace(/[\\.]/g, '\\$&')}`),
      'DOTFILE_TARGETS: gemini resolves to label "Gemini CLI" and homeDir <home>/.gemini'
    );
  }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: the new assertions fail (no match found) because `pickTargets` doesn't recognize `--copilot`/`--gemini` as target keys yet — `dotfiles.run(['list', '--copilot', ...])` currently falls into the "unrecognized flag" fail-safe and selects zero targets, so `listOne` never runs and the expected log lines never appear.

- [ ] **Step 3: Write minimal implementation**

In `cli/dotfiles.js`, replace line 31:

```js
const DOTFILE_TARGETS = [{ key: 'claude', label: 'Claude Code', dirName: '.claude' }];
```

with:

```js
// skills: whether this tool has a directory-based personal-skill concept at all (Gemini
// CLI doesn't — see the design spec's research table). Every other category (hooks,
// settings.json) already works the same way for every target with no flag needed.
const DOTFILE_TARGETS = [
  { key: 'claude', label: 'Claude Code', dirName: '.claude', skills: true },
  { key: 'copilot', label: 'GitHub Copilot CLI', dirName: '.copilot', skills: true },
  { key: 'gemini', label: 'Gemini CLI', dirName: '.gemini', skills: false },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: the new assertions pass; no pre-existing assertion breaks (every existing test that targets Claude uses `--claude` explicitly, which still resolves to exactly the claude target).

- [ ] **Step 5: Commit**

```bash
git add cli/dotfiles.js cli/test.js
git commit -m "Add Copilot CLI and Gemini CLI to DOTFILE_TARGETS"
```

---

### Task 2: Thread the `skills` capability flag through `buildCategories`/`importOne`/`listOne`/`treeOne`

**Files:**
- Modify: `cli/dotfiles.js`
- Test: `cli/test.js`

**Interfaces:**
- Consumes: `target.skills` (Task 1).
- Produces: no signature changes — `buildCategories(sourceDir, target)`, `importOne(sourceDir, target, selection)`, `listOne(sourceDir, target)`, `treeOne(sourceDir, target)` all keep their existing signatures; they just skip every skills-related step when `target.skills === false`.

- [ ] **Step 1: Write the failing test**

This test needs `sourceDir/skills/personal/demo-skill` to already exist (it checks real
copy/drift behavior against it), so it must go AFTER the existing fixture that creates it —
NOT right after Task 1's block, which runs earlier in the file, before that fixture exists.
Add to `cli/test.js` right after this existing line (search for it exactly):

```js
  fs.writeFileSync(path.join(sourceDir, 'claude-settings.json'), '{"model":"test"}\n');
```

insert immediately after it (this is still before `const fakeHome = path.join(tmp, 'fake-home');`):

```js
  // skills:false must suppress every skills-related step: buildCategories never offers a
  // skills category, importOne never creates a skills/ dir at the destination (even though
  // the shared skills/personal/ source has content), and listOne/treeOne never print a
  // skills section for this target — while a skills:true target with identical source
  // content still does all three, proving the flag (not the source content) is what's
  // being checked.
  {
    const flagHome = path.join(tmp, 'skills-flag-home');
    const skillsFalseTarget = { key: 'gemini', label: 'Gemini CLI', homeDir: path.join(flagHome, '.gemini'), skills: false };
    const skillsTrueTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(flagHome, '.claude'), skills: true };

    const categoriesFalse = dotfiles.buildCategories(sourceDir, skillsFalseTarget);
    assert.ok(!categoriesFalse.some((c) => c.key === 'skills'), 'buildCategories: skills:false target never gets a skills category');
    const categoriesTrue = dotfiles.buildCategories(sourceDir, skillsTrueTarget);
    assert.ok(categoriesTrue.some((c) => c.key === 'skills'), 'buildCategories: skills:true target still gets a skills category (sanity check)');

    // list/tree BEFORE either target has anything imported into it, so the store (sourceDir,
    // which already has skills/personal/demo-skill from the fixture above) and the live
    // homeDir (freshly named, nothing there yet) genuinely differ — that's what makes
    // showDrift's "skills" line appear at all for the skills:true sanity check below. If the
    // importOne calls ran first, live would already match store and no drift line would
    // print, making the sanity check meaningless.
    const captureLogs = async (argv) => {
      const logs = [];
      const orig = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      await dotfiles.run(argv, sourceDir);
      console.log = orig;
      return logs.join('\n');
    };
    const geminiList = await captureLogs(['list', '--gemini', '--home', flagHome]);
    const geminiTree = await captureLogs(['tree', '--gemini', '--home', flagHome]);
    const claudeList = await captureLogs(['list', '--claude', '--home', flagHome]);
    const claudeTree = await captureLogs(['tree', '--claude', '--home', flagHome]);

    assert.doesNotMatch(geminiList, /^skills/m, 'listOne: skills:false target prints no skills drift line');
    assert.doesNotMatch(geminiTree, /skills\/personal\//, 'treeOne: skills:false target prints no skills/personal/ section');
    assert.match(claudeList, /^skills/m, 'listOne: skills:true target still prints a skills drift line (sanity check)');
    assert.match(claudeTree, /skills\/personal\//, 'treeOne: skills:true target still prints a skills/personal/ section (sanity check)');

    // Now actually import — this is read-write, so it must run after the read-only list/tree
    // checks above, not before.
    dotfiles.importOne(sourceDir, skillsFalseTarget);
    assert.ok(!fs.existsSync(path.join(skillsFalseTarget.homeDir, 'skills')), 'importOne: skills:false target gets no skills/ dir even though skills/personal/ has content');
    dotfiles.importOne(sourceDir, skillsTrueTarget);
    assert.ok(fs.existsSync(path.join(skillsTrueTarget.homeDir, 'skills', 'demo-skill')), 'importOne: skills:true target still gets skills/ (sanity check)');
  }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: fails on the `importOne: skills:false target gets no skills/ dir` assertion (and/or the `buildCategories` one) — today every target unconditionally gets a skills category and a skills/ copy, since nothing checks `target.skills` yet.

- [ ] **Step 3: Write minimal implementation**

In `cli/dotfiles.js`, modify `buildCategories` — wrap the skills block (currently the first two lines inside the function body) so it's skipped when `target.skills === false`:

```js
function buildCategories(sourceDir, target) {
  const categories = [];

  if (target.skills !== false) {
    const skills = listDirNames(personalSkillsDir(sourceDir));
    if (skills.length) categories.push({ key: 'skills', label: 'skills/personal/', items: skills.map((s) => ({ key: s, label: s })) });
  }

  const hooks = listFileNames(sourceHooksDir(sourceDir, target));
  if (hooks.length) categories.push({ key: 'hooks', label: `${target.key}-hooks/`, items: hooks.map((h) => ({ key: h, label: h })) });

  const settingsSrc = settingsFile(sourceDir, target);
  if (fs.existsSync(settingsSrc)) {
    const keys = Object.keys(JSON.parse(fs.readFileSync(settingsSrc, 'utf8')));
    if (keys.length) categories.push({ key: 'settings', label: `${target.key}-settings.json`, items: keys.map((k) => ({ key: k, label: k })) });
  }

  const pluginsFile = personalPluginsFile(sourceDir);
  if (fs.existsSync(pluginsFile)) {
    const labels = JSON.parse(fs.readFileSync(pluginsFile, 'utf8')).map((p) => p.label);
    if (labels.length) categories.push({ key: 'plugins', label: 'plugins.json', items: labels.map((l) => ({ key: l, label: l })) });
  }

  return categories;
}
```

Modify `importOne` — replace the whole function:

```js
function importOne(sourceDir, target, selection = null) {
  const skillsSrc = personalSkillsDir(sourceDir);
  const hooksSrc = sourceHooksDir(sourceDir, target);
  const settingsSrc = settingsFile(sourceDir, target);
  const sourcesToCheck = target.skills !== false ? [skillsSrc, hooksSrc, settingsSrc] : [hooksSrc, settingsSrc];
  if (!sourcesToCheck.some(fs.existsSync)) {
    throw new Error(`nothing to import for ${target.label} — none of ${sourcesToCheck.join(', ')} exist`);
  }

  // A full (non-selective) import is the "start over" gesture — clear any selection saved
  // by a previous `import --select` run so a later plain `dotfiles plugins` doesn't keep
  // honoring a now-superseded selection.
  if (selection === null) fs.rmSync(selectionFile(target), { force: true });

  if (target.skills !== false) {
    const liveSkillsDir = path.join(target.homeDir, 'skills');
    console.log(`\n${target.label}: ${skillsSrc} -> ${liveSkillsDir}`);
    if (selection === null) {
      mirrorDir(skillsSrc, liveSkillsDir);
    } else {
      for (const name of listDirNames(skillsSrc)) {
        if (selection.has(`skills:${name}`)) fs.cpSync(path.join(skillsSrc, name), path.join(liveSkillsDir, name), { recursive: true });
      }
    }
  }

  const liveHooksDir = path.join(target.homeDir, 'hooks');
  console.log(`${target.label}: ${hooksSrc} -> ${liveHooksDir}`);
  let copiedHooks = [];
  if (selection === null) {
    if (mirrorDir(hooksSrc, liveHooksDir)) copiedHooks = listFileNames(liveHooksDir);
  } else {
    // Lazy mkdir — only create hooks/ if at least one hook is actually going to be copied,
    // symmetric with the skills branch above (which creates nothing when zero skills match).
    let hooksDirMade = false;
    for (const name of listFileNames(hooksSrc)) {
      if (selection.has(`hooks:${name}`)) {
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
    if (selection === null) {
      fs.copyFileSync(settingsSrc, path.join(target.homeDir, 'settings.json'));
    } else {
      const storeSettings = JSON.parse(fs.readFileSync(settingsSrc, 'utf8'));
      const filtered = Object.fromEntries(Object.entries(storeSettings).filter(([k]) => selection.has(`settings:${k}`)));
      fs.writeFileSync(path.join(target.homeDir, 'settings.json'), JSON.stringify(filtered, null, 2) + '\n');
    }
  }

  repairAbsolutePaths(target);
  console.log(`done. Skills active now. Run \`dotfiles plugins\` to install plugins/tools from plugins.json.`);
}
```

(Only two changes from the current version: the `sourcesToCheck` computation replacing the inline three-item array in the guard, and wrapping the skills block in `if (target.skills !== false) { ... }`. Everything else — hooks, settings, `repairAbsolutePaths`, the final log line — is untouched.)

Modify `listOne` — wrap the first `showDrift` call:

```js
function listOne(sourceDir, target) {
  console.log(`\n--- ${target.label}: .ai/ (source of truth) vs ${target.homeDir} (this machine) ---`);

  if (target.skills !== false) {
    showDrift('skills', listDirNames(personalSkillsDir(sourceDir)), listDirNames(path.join(target.homeDir, 'skills')));
  }
  showDrift(
    'hooks',
    listFileNames(sourceHooksDir(sourceDir, target)),
    listFileNames(path.join(target.homeDir, 'hooks'))
  );

  // ...rest of the function (settings.json drift, plugins drift) is unchanged
```

Modify `treeOne` — wrap the skills-printing block:

```js
function treeOne(sourceDir, target) {
  console.log(`\n${target.label} — .ai/`);

  if (target.skills !== false) {
    const skills = listDirNames(personalSkillsDir(sourceDir));
    if (skills.length) {
      console.log('  skills/personal/');
      for (const s of skills) console.log(`    ${s}`);
    }
  }

  // ...rest of the function (settings, plugins) is unchanged
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `ok — all checks passed`, including the new skills-flag assertions.

- [ ] **Step 5: Commit**

```bash
git add cli/dotfiles.js cli/test.js
git commit -m "Thread the skills capability flag through buildCategories/importOne/listOne/treeOne"
```

---

### Task 3: End-to-end fixture for Copilot CLI + Gemini CLI, README update

**Files:**
- Modify: `cli/test.js`, `README.md`

**Interfaces:**
- Consumes: everything from Tasks 1-2.
- Produces: no new interfaces — this task only adds test fixtures and assertions proving the whole three-target flow works together via `dotfiles import --all`, plus a doc correction.

- [ ] **Step 1: Write the failing test**

Add to `cli/test.js`, right after Task 2's new block — its last two lines are the
`assert.ok(fs.existsSync(path.join(skillsTrueTarget.homeDir, 'skills', 'demo-skill')), ...)`
line followed by a closing `}`; insert immediately after that closing `}` (still before
`const fakeHome = path.join(tmp, 'fake-home');`):

```js
  // End-to-end: --all now spans three targets. Copilot CLI gets skills+hooks+settings
  // (same shape as Claude); Gemini CLI gets settings.json only (skills:false, and this
  // fixture deliberately gives Gemini no gemini-hooks/ source dir either, matching how a
  // real .ai/ would look for a tool with no external-hook-script concept).
  {
    fs.mkdirSync(path.join(sourceDir, 'copilot-hooks'), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'copilot-hooks/copilot-demo-hook'), '#!/bin/bash\necho copilot hi\n');
    fs.writeFileSync(path.join(sourceDir, 'copilot-settings.json'), '{"model":"copilot-test"}\n');
    fs.writeFileSync(path.join(sourceDir, 'gemini-settings.json'), '{"mcpServers":{},"hooks":{}}\n');

    const multiHome = path.join(tmp, 'multi-agent-home');
    await dotfiles.run(['import', '--all', '--home', multiHome], sourceDir);

    // Claude: unaffected by this task, still gets everything (sanity check the three-target
    // loop didn't change single-target behavior).
    assert.ok(fs.existsSync(path.join(multiHome, '.claude/skills/demo-skill')), 'multi-target import: claude still gets skills');

    // Copilot CLI: same shape as Claude — skills (shared source), hooks, settings.json.
    assert.ok(fs.existsSync(path.join(multiHome, '.copilot/skills/demo-skill')), 'multi-target import: copilot gets the shared skills/personal/ source');
    assert.ok(fs.existsSync(path.join(multiHome, '.copilot/hooks/copilot-demo-hook')), 'multi-target import: copilot gets its own copilot-hooks/');
    const copilotSettings = JSON.parse(fs.readFileSync(path.join(multiHome, '.copilot/settings.json'), 'utf8'));
    assert.deepStrictEqual(copilotSettings, { model: 'copilot-test' }, 'multi-target import: copilot gets its own copilot-settings.json');

    // Gemini CLI: settings.json only.
    const geminiSettings = JSON.parse(fs.readFileSync(path.join(multiHome, '.gemini/settings.json'), 'utf8'));
    assert.deepStrictEqual(geminiSettings, { mcpServers: {}, hooks: {} }, 'multi-target import: gemini gets its own gemini-settings.json');
    assert.ok(!fs.existsSync(path.join(multiHome, '.gemini/skills')), 'multi-target import: gemini gets no skills/ dir (skills:false)');
    assert.ok(!fs.existsSync(path.join(multiHome, '.gemini/hooks')), 'multi-target import: gemini gets no hooks/ dir (no gemini-hooks/ source in this fixture)');
  }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: fails on the Copilot/Gemini assertions — before this task's fixture additions, `.ai/copilot-settings.json`/`.ai/copilot-hooks/`/`.ai/gemini-settings.json` don't exist in the test fixture at all, so nothing gets written to `multiHome/.copilot/` or `multiHome/.gemini/`. (Tasks 1-2 already made the code capable of this; this task is fixture-only, so the "implementation" step below should require no `cli/dotfiles.js` changes — if it turns out something IS still missing in `cli/dotfiles.js` to make this pass, treat that as a signal Task 1 or 2 has a gap, not something to patch ad hoc here.)

- [ ] **Step 3: Confirm no implementation change is needed**

Run `npm test` again after double-checking the fixture code from Step 1 was added correctly. It should now pass with zero changes to `cli/dotfiles.js` — Tasks 1 and 2 already built everything this test exercises. If it doesn't pass, stop and report back rather than patching around it; that means Task 1 or 2's implementation has a gap this test exposed, which needs to be fixed in the task that owns it.

- [ ] **Step 4: Update README.md**

Find the line in `README.md`'s "Editing" section that starts with `- Applying this machine's dotfiles (currently Claude Code only): ...` and update "currently Claude Code only" to reflect the new coverage:

```
- Applying this machine's dotfiles (Claude Code, GitHub Copilot CLI, Gemini CLI):
  `node cli/index.js dotfiles list` / `import [--select]` / `plugins` / `tree` — see
  [cli/dotfiles.js](cli/dotfiles.js) for flags and the `--home` sandbox option for testing
  without touching your real profile. Gemini CLI has no personal-skills concept, so
  `import`/`tree`/`--select` skip that category for it — everything else (hooks,
  settings.json) works the same across all three tools. `import` only mirrors files
  (personal skills, settings.json); `--select` on `import` prompts for which personal
  skills / hooks / settings.json keys / plugins.json packages to bring over instead of
  everything, and remembers the choice in `<homeDir>/.ai-config-selection.json` so a later
  plain `dotfiles plugins` (no `--select`/`--all`) honors it automatically; `plugins` runs
  `.ai/plugins.json`, package-manager style, kept as its own step since it hits the network
  and installs software or registers MCP servers; `tree` prints this machine's home-scope
  picture (personal skills, settings, plugins) generated from disk.
```

Also find the file header comment in `cli/dotfiles.js` (the block starting `// dotfiles: applies this machine's slice of .ai/ ...`) and update the line `// Only Claude Code is wired up today — its ~/.claude path and shape are verified.` to:

```
// Claude Code, Copilot CLI, and Gemini CLI are wired up — their home-dir paths and shapes
// are verified (see docs/superpowers/specs/2026-07-29-multi-agent-dotfiles-phase1-design.md
// for the research). Codex, opencode, Cursor, Windsurf belong in DOTFILE_TARGETS only once
// each gets its own confirmed path/shape and (for the ones with a different config format,
// like Codex's TOML) its own adapter — don't guess at where another tool's user config
// lives, a wrong guess here writes into a real profile.
```

- [ ] **Step 5: Run full test suite once more and commit**

Run: `npm test`
Expected: `ok — all checks passed`.

```bash
git add cli/test.js README.md cli/dotfiles.js
git commit -m "Add end-to-end multi-agent fixture, update docs for Copilot CLI + Gemini CLI"
```

## Manual verification (after all tasks)

Not part of the automated test — do this once by hand:

```
node cli/index.js dotfiles tree --all --home /tmp/ai-config-manual-test-multi
```

(PowerShell: `node cli/index.js dotfiles tree --all --home $env:TEMP\ai-config-manual-test-multi`)

Expect it to print a section for Claude Code, GitHub Copilot CLI, and Gemini CLI — Gemini's section should show settings/plugins only, never a `skills/personal/` line. Delete the scratch directory afterward.
