# Selective Dotfiles Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `dotfiles import --select` pick which personal skills, hooks, `claude-settings.json` keys, and `plugins.json` packages get materialized on this machine, instead of always bringing everything.

**Architecture:** A tri-state (all/some/none) numbered menu, built the same way `cli/lib.js`'s existing `pickFromMenu` is (plain `readline`, no raw-mode) — pure toggle/render logic split out so it's unit-testable without stdin, plus a thin `readline` loop on top. `cli/dotfiles.js` gains a `buildCategories()` reader, a per-machine `.ai-config-selection.json` (not tracked in `.ai/`), and `importOne`/`pluginsOne` learn an optional `selection` parameter that — when non-null — filters what gets copied/installed instead of processing everything.

**Tech Stack:** Node.js (`fs`, `path`, `readline`, `stream`), no new dependencies. Existing `assert`-based smoke test (`cli/test.js`), no test framework.

## Global Constraints

- No new npm dependencies (`package.json` has none today; keep it that way — see the design spec's rejected alternatives).
- No arrow-key/raw-mode terminal input — plain `readline`, same reasoning as the existing `pickFromMenu` (`cli/lib.js:7-9`).
- Selection marks are ASCII (`[x]`/`[ ]`/`[~]`), not Unicode — correct regardless of terminal codepage.
- Without `--select`, `dotfiles import`/`dotfiles plugins` behavior must be byte-for-byte unchanged from today (existing `cli/test.js` assertions must keep passing untouched).
- The selection file lives at `<target.homeDir>/.ai-config-selection.json` (machine-local runtime state, never written into `.ai/`).
- Spec: `docs/superpowers/specs/2026-07-29-selective-dotfiles-import-design.md`

---

### Task 1: Pure tri-state helpers in `cli/lib.js`

**Files:**
- Modify: `cli/lib.js`
- Test: `cli/test.js`

**Interfaces:**
- Produces: `triState(itemKeys: string[], selected: Set<string>) -> 'all'|'none'|'some'`, `renderMenu(categories, selected: Set<string>) -> { lines: string[], index: Map<number, { itemKeys: string[] }> }`, `toggle(selected: Set<string>, index: Map<number, {itemKeys: string[]}>, num: number) -> Set<string>` (new `Set`, does not mutate input). `categories` shape: `[{ key: string, label: string, items: [{ key: string, label: string }] }]`. Flat item keys used everywhere else are `` `${categoryKey}:${itemKey}` ``.

- [ ] **Step 1: Write the failing test**

Add near the top of `cli/test.js`, after the existing `require`s (add `const lib = require('./lib');`), before `buildFixture`:

```js
function testTriStateHelpers() {
  const categories = [
    { key: 'cats', label: 'Cats', items: [{ key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }] },
    { key: 'dogs', label: 'Dogs', items: [{ key: 'c', label: 'Gamma' }] },
  ];
  const allSelected = new Set(['cats:a', 'cats:b', 'dogs:c']);

  assert.strictEqual(lib.triState(['cats:a', 'cats:b'], allSelected), 'all', 'triState: all selected');
  assert.strictEqual(lib.triState(['cats:a', 'cats:b'], new Set()), 'none', 'triState: none selected');
  assert.strictEqual(lib.triState(['cats:a', 'cats:b'], new Set(['cats:a'])), 'some', 'triState: partially selected');

  const { lines, index } = lib.renderMenu(categories, allSelected);
  assert.strictEqual(lines.length, 5, 'renderMenu: one row per category + one per item (2 categories, 3 items)');
  assert.match(lines[0], /\[x\] Cats/, 'renderMenu: fully-selected category shows [x]');
  assert.match(lines[1], /\[x\] Alpha/, 'renderMenu: selected item shows [x]');
  assert.strictEqual(index.size, 5, 'renderMenu: index has one entry per numbered row');

  // toggling the "Cats" category row (its number has 2 itemKeys) clears both children
  const catsRowNum = [...index.entries()].find(([, e]) => e.itemKeys.length === 2)[0];
  const afterCategoryToggle = lib.toggle(allSelected, index, catsRowNum);
  assert.ok(!afterCategoryToggle.has('cats:a') && !afterCategoryToggle.has('cats:b'), 'toggle: category toggle clears all its items when fully selected');
  assert.ok(afterCategoryToggle.has('dogs:c'), "toggle: category toggle doesn't touch other categories");
  assert.ok(allSelected.has('cats:a'), 'toggle: does not mutate the input Set');

  // toggling a single item row only flips that one item
  const alphaRowNum = [...index.entries()].find(([, e]) => e.itemKeys[0] === 'cats:a' && e.itemKeys.length === 1)[0];
  const afterItemToggle = lib.toggle(allSelected, index, alphaRowNum);
  assert.ok(!afterItemToggle.has('cats:a'), 'toggle: item toggle deselects that item');
  assert.ok(afterItemToggle.has('cats:b'), "toggle: item toggle doesn't touch its sibling");

  // toggling a category that's only partly selected selects the rest (opposite of 'all')
  const partial = new Set(['cats:a']);
  const { index: partialIndex } = lib.renderMenu(categories, partial);
  const catsRowNum2 = [...partialIndex.entries()].find(([, e]) => e.itemKeys.length === 2)[0];
  const afterPartialToggle = lib.toggle(partial, partialIndex, catsRowNum2);
  assert.ok(afterPartialToggle.has('cats:a') && afterPartialToggle.has('cats:b'), 'toggle: toggling a "some" category selects all its items');

  console.log('ok — tri-state helpers');
}
```

Call it at the top of `main()` in `cli/test.js`, right after `const tmp = ...` line: add `testTriStateHelpers();` right before `const sourceDir = ...`. Actually — call it before creating any tmp dir, since it needs none. Put it as the very first line of `main()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: `TypeError: lib.triState is not a function` (or similar — the functions don't exist yet).

- [ ] **Step 3: Write minimal implementation**

In `cli/lib.js`, add after `pickFromMenu` (after its closing `}` on line 31):

```js
// Tri-state: every item in a category selected -> 'all'; none -> 'none'; otherwise 'some'.
function triState(itemKeys, selected) {
  const selectedCount = itemKeys.filter((k) => selected.has(k)).length;
  if (selectedCount === 0) return 'none';
  if (selectedCount === itemKeys.length) return 'all';
  return 'some';
}

const TRI_STATE_MARK = { all: '[x]', none: '[ ]', some: '[~]' };

// Flattens categories into numbered rows (one per category, one per item, indented) and an
// index from displayed number back to the item key(s) it toggles — the pure half of
// pickTriState, kept separate so the toggle math is unit-testable without touching stdin.
// ASCII marks only (not Unicode) so output is correct regardless of terminal codepage.
function renderMenu(categories, selected) {
  const lines = [];
  const index = new Map(); // number -> { itemKeys: string[] }
  let n = 0;
  for (const cat of categories) {
    const itemKeys = cat.items.map((it) => `${cat.key}:${it.key}`);
    n++;
    index.set(n, { itemKeys });
    lines.push(`  ${String(n).padStart(2)}) ${TRI_STATE_MARK[triState(itemKeys, selected)]} ${cat.label}`);
    for (const it of cat.items) {
      const key = `${cat.key}:${it.key}`;
      n++;
      index.set(n, { itemKeys: [key] });
      lines.push(`  ${String(n).padStart(2)})   ${selected.has(key) ? TRI_STATE_MARK.all : TRI_STATE_MARK.none} ${it.label}`);
    }
  }
  return { lines, index };
}

// Toggling a category row flips ALL its items together: if every item is currently
// selected, deselect them all; otherwise ('none' or 'some') select them all. Toggling an
// item row flips just that one key. Always returns a new Set — never mutates `selected`.
function toggle(selected, index, num) {
  const entry = index.get(num);
  if (!entry) return selected;
  const next = new Set(selected);
  if (entry.itemKeys.length > 1) {
    const allSelected = entry.itemKeys.every((k) => next.has(k));
    for (const k of entry.itemKeys) (allSelected ? next.delete(k) : next.add(k));
  } else {
    const [key] = entry.itemKeys;
    next.has(key) ? next.delete(key) : next.add(key);
  }
  return next;
}
```

Update the `module.exports` line at the bottom to:

```js
module.exports = { write, mirrorDir, pickFromMenu, triState, renderMenu, toggle };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: prints `ok — tri-state helpers` and continues into the rest of the (currently unmodified) test file without new failures.

- [ ] **Step 5: Commit**

```bash
git add cli/lib.js cli/test.js
git commit -m "Add pure tri-state toggle/render helpers for selective dotfiles import"
```

---

### Task 2: `pickTriState` (readline glue) in `cli/lib.js`

**Files:**
- Modify: `cli/lib.js`
- Test: `cli/test.js`

**Interfaces:**
- Consumes: `renderMenu`, `toggle` from Task 1.
- Produces: `pickTriState(categories, header: string, io?: { input?: Readable, output?: Writable }) -> Promise<Set<string>>`. Starts with every item selected (so confirming immediately reproduces "select everything," today's default behavior). `"a"`/`"all"` re-selects everything, `"n"`/`"none"` clears everything, a blank line confirms and resolves with the current selection.

- [ ] **Step 1: Write the failing test**

Add to `cli/test.js`, right after `testTriStateHelpers()` (still before any tmp dir is needed — but this one needs `stream`, so add `const { PassThrough } = require('stream');` near the top requires):

```js
async function testPickTriState() {
  const categories = [
    { key: 'fruit', label: 'Fruit', items: [{ key: 'apple', label: 'Apple' }, { key: 'pear', label: 'Pear' }] },
  ];
  const input = new PassThrough();
  const output = new PassThrough();
  output.resume(); // drain so the stream doesn't back up — we don't assert on prompt text here

  const resultPromise = lib.pickTriState(categories, 'Pick fruit', { input, output });
  // deselect "Apple" (item row 2: row 1 is the "Fruit" category, row 2 is "Apple"), then confirm
  input.write('2\n');
  input.write('\n');
  const result = await resultPromise;

  assert.ok(!result.has('fruit:apple'), 'pickTriState: deselected item is not in the result');
  assert.ok(result.has('fruit:pear'), 'pickTriState: untouched item stays selected');
  console.log('ok — pickTriState readline wiring');
}
```

Call `await testPickTriState();` in `main()`, right after `testTriStateHelpers();`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: `TypeError: lib.pickTriState is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `cli/lib.js`, add after `toggle` (before `function write(...)`):

```js
// Tri-state category/item picker: same readline-only approach as pickFromMenu (no
// arrow-key raw-mode — see its comment). Category numbers toggle every item under them at
// once; item numbers toggle just that one. Starts fully selected so pressing Enter alone
// reproduces "bring everything." {input, output} default to the real terminal; tests
// inject a scripted stream instead.
function pickTriState(categories, header, { input = process.stdin, output = process.stdout } = {}) {
  let selected = new Set(categories.flatMap((c) => c.items.map((it) => `${c.key}:${it.key}`)));
  const rl = readline.createInterface({ input, output });
  return new Promise((resolve) => {
    const prompt = () => {
      const { lines, index } = renderMenu(categories, selected);
      output.write(`\n${header}\n\n${lines.join('\n')}\n`);
      rl.question(
        '\nNumbers to toggle (categories or items, space/comma separated), "a" all, "n" none, Enter to confirm: ',
        (answer) => {
          const trimmed = answer.trim().toLowerCase();
          if (!trimmed) {
            rl.close();
            return resolve(selected);
          }
          if (trimmed === 'a' || trimmed === 'all') {
            selected = new Set(categories.flatMap((c) => c.items.map((it) => `${c.key}:${it.key}`)));
          } else if (trimmed === 'n' || trimmed === 'none') {
            selected = new Set();
          } else {
            for (const tok of trimmed.split(/[\s,]+/)) selected = toggle(selected, index, parseInt(tok, 10));
          }
          prompt();
        }
      );
    };
    prompt();
  });
}
```

Update `module.exports` to:

```js
module.exports = { write, mirrorDir, pickFromMenu, triState, renderMenu, toggle, pickTriState };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: prints `ok — pickTriState readline wiring` and continues.

- [ ] **Step 5: Commit**

```bash
git add cli/lib.js cli/test.js
git commit -m "Add pickTriState interactive category/item picker"
```

---

### Task 3: `buildCategories` + selection-file persistence in `cli/dotfiles.js`

**Files:**
- Modify: `cli/dotfiles.js`
- Test: `cli/test.js`

**Interfaces:**
- Consumes: `personalSkillsDir`, `sourceHooksDir`, `settingsFile`, `personalPluginsFile`, `listDirNames`, `listFileNames` (all already in `cli/dotfiles.js`).
- Produces: `buildCategories(sourceDir, target) -> categories` (same shape Task 1/2 expect: `[{key, label, items: [{key, label}]}]`, only non-empty categories included). `selectionFile(target) -> string` (absolute path). `loadSelection(target) -> Set<string>|null` (`null` if no file). `saveSelection(target, selection: Set<string>) -> void`.

- [ ] **Step 1: Write the failing test**

Add to `cli/test.js`, inside `main()`, right after the existing fixture setup for `skills/personal/demo-skill` / `claude-hooks/demo-hook` / `claude-settings.json` (i.e., right after this existing block, still before `const fakeHome = ...`):

```js
  fs.mkdirSync(path.join(sourceDir, 'skills/personal/demo-skill'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'claude-hooks'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'skills/personal/demo-skill/SKILL.md'), '# demo\n');
  fs.writeFileSync(path.join(sourceDir, 'claude-hooks/demo-hook'), '#!/bin/bash\necho hi\n');
  fs.writeFileSync(path.join(sourceDir, 'claude-settings.json'), '{"model":"test"}\n');
```

add, right after it:

```js
  const claudeTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(tmp, 'fake-home', '.claude') };
  const categories = dotfiles.buildCategories(sourceDir, claudeTarget);
  assert.deepStrictEqual(
    categories.map((c) => c.key),
    ['skills', 'settings'],
    'buildCategories: only non-empty categories are included (no claude-hooks content written to disk yet at this point — wait, it was written above)'
  );
```

Wait — re-check: `claude-hooks/demo-hook` file WAS just written above, and `claude-settings.json` too, and `plugins.json` does not exist yet at this point in the file (it's written later, near the `dotfiles plugins` test) — so the real expectation is 3 categories: `skills`, `hooks`, `settings` (not `plugins`, since `plugins.json` doesn't exist yet here). Use this instead:

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: `TypeError: dotfiles.buildCategories is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `cli/dotfiles.js`, add after `claudeInstallId` (after its closing `}`, before `listDirNames`):

```js
// Reads what's actually in .ai/ for this target and turns it into the categories/items
// shape pickTriState expects. Only non-empty categories are included — nothing to show for
// a category with nothing in it. Item keys are the bare names (skill folder name, hook
// filename, settings.json key, plugins.json label); importOne/pluginsOne namespace them
// with the category key (e.g. "skills:demo-skill") to build the flat selection Set.
function buildCategories(sourceDir, target) {
  const categories = [];

  const skills = listDirNames(personalSkillsDir(sourceDir));
  if (skills.length) categories.push({ key: 'skills', label: 'skills/personal/', items: skills.map((s) => ({ key: s, label: s })) });

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

// Machine-local runtime state (which items were kept/skipped by the last `import
// --select`) — deliberately NOT under .ai/, same reasoning the header comment already
// gives for why plugins/ cache and ide/ stay untracked: reproducible, not source of truth.
function selectionFile(target) {
  return path.join(target.homeDir, '.ai-config-selection.json');
}

function loadSelection(target) {
  const file = selectionFile(target);
  if (!fs.existsSync(file)) return null;
  return new Set(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function saveSelection(target, selection) {
  fs.mkdirSync(target.homeDir, { recursive: true });
  fs.writeFileSync(selectionFile(target), JSON.stringify([...selection], null, 2) + '\n');
}
```

Update the bottom `module.exports` line to:

```js
module.exports = { run, buildCategories, selectionFile, loadSelection, saveSelection };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: no new failures; test output continues past the new assertions.

- [ ] **Step 5: Commit**

```bash
git add cli/dotfiles.js cli/test.js
git commit -m "Add buildCategories and per-machine selection-file persistence"
```

---

### Task 4: `importOne`/`pluginsOne` become selection-aware

**Files:**
- Modify: `cli/dotfiles.js`
- Test: `cli/test.js`

**Interfaces:**
- Consumes: nothing new from other tasks (works standalone; selection is just a `Set<string>|null` parameter, same shape `loadSelection`/`pickTriState` produce).
- Produces: `importOne(sourceDir, target, selection?: Set<string>|null)` — when `selection` is `null`/omitted, behavior is byte-for-byte identical to today. `pluginsOne(sourceDir, target, selection?: Set<string>|null)` — same rule.

- [ ] **Step 1: Write the failing test**

Add to `cli/test.js`, right after the existing block that asserts on `--home import` (right after this existing assertion, which stays unchanged):

```js
  assert.ok(
    fs.existsSync(path.join(fakeHome, '.claude/settings.json')),
    '--home import writes settings.json into the scratch home'
  );
```

insert:

```js
  // importOne with an explicit selection — bypasses the interactive prompt entirely (same
  // reasoning the rest of this file avoids stdin: call the underlying function directly).
  // Add a second skill/settings-key first so there's something to leave OUT.
  fs.mkdirSync(path.join(sourceDir, 'skills/personal/second-skill'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'skills/personal/second-skill/SKILL.md'), '# second\n');
  fs.writeFileSync(path.join(sourceDir, 'claude-settings.json'), '{"model":"test","theme":"auto"}\n');
  const selectHome = path.join(tmp, 'select-home');
  const selectTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(selectHome, '.claude') };
  dotfiles.importOne(sourceDir, selectTarget, new Set(['skills:demo-skill', 'hooks:demo-hook', 'settings:model']));
  assert.ok(fs.existsSync(path.join(selectHome, '.claude/skills/demo-skill')), 'selective import: selected skill is materialized');
  assert.ok(!fs.existsSync(path.join(selectHome, '.claude/skills/second-skill')), 'selective import: unselected skill is NOT materialized');
  const selectiveSettings = JSON.parse(fs.readFileSync(path.join(selectHome, '.claude/settings.json'), 'utf8'));
  assert.deepStrictEqual(selectiveSettings, { model: 'test' }, 'selective import: only the selected settings.json key is kept');
```

Then, after the existing `plugins.json` write and BEFORE the existing `await dotfiles.run(['plugins', '--claude', '--home', fakeHome], sourceDir);` line, add:

```js
  // pluginsOne with an explicit selection: only the selected package's install steps run.
  // Capture stdout the same way the later `list`/`tree` tests already do.
  const pluginLogs = [];
  const origLogForPlugins = console.log;
  console.log = (...a) => pluginLogs.push(a.join(' '));
  dotfiles.pluginsOne(sourceDir, { key: 'claude', label: 'Claude Code', homeDir: fakeHome + '/.claude' }, new Set(['plugins:demo installer']));
  console.log = origLogForPlugins;
  const pluginOutput = pluginLogs.join('\n');
  assert.match(pluginOutput, /demo installer/, 'selective plugins: selected package still runs');
  assert.doesNotMatch(pluginOutput, /shell-demo/, 'selective plugins: unselected package is skipped entirely');
```

Note this requires `importOne` and `pluginsOne` to be exported — add them to `module.exports` in the implementation step below.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: `TypeError: dotfiles.importOne is not a function` (not exported yet), then after fixing the export in your head — the real failure once exported would be selective import copying everything (assertion `!fs.existsSync(second-skill)` fails) because the selection parameter isn't wired up yet. Confirm the test fails for one of these reasons before moving on.

- [ ] **Step 3: Write minimal implementation**

Replace the whole `importOne` function in `cli/dotfiles.js` with:

```js
function importOne(sourceDir, target, selection = null) {
  const skillsSrc = personalSkillsDir(sourceDir);
  const hooksSrc = sourceHooksDir(sourceDir, target);
  const settingsSrc = settingsFile(sourceDir, target);
  if (![skillsSrc, hooksSrc, settingsSrc].some(fs.existsSync)) {
    throw new Error(`nothing to import for ${target.label} — none of ${skillsSrc}, ${hooksSrc}, ${settingsSrc} exist`);
  }

  const liveSkillsDir = path.join(target.homeDir, 'skills');
  console.log(`\n${target.label}: ${skillsSrc} -> ${liveSkillsDir}`);
  if (selection === null) {
    mirrorDir(skillsSrc, liveSkillsDir);
  } else {
    for (const name of listDirNames(skillsSrc)) {
      if (selection.has(`skills:${name}`)) fs.cpSync(path.join(skillsSrc, name), path.join(liveSkillsDir, name), { recursive: true });
    }
  }

  const liveHooksDir = path.join(target.homeDir, 'hooks');
  console.log(`${target.label}: ${hooksSrc} -> ${liveHooksDir}`);
  let copiedHooks = [];
  if (selection === null) {
    if (mirrorDir(hooksSrc, liveHooksDir)) copiedHooks = listFileNames(liveHooksDir);
  } else {
    fs.mkdirSync(liveHooksDir, { recursive: true });
    for (const name of listFileNames(hooksSrc)) {
      if (selection.has(`hooks:${name}`)) {
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

(This changes the two `console.log` lines for skills/hooks to compute `liveSkillsDir`/`liveHooksDir` once — purely cosmetic reordering to avoid repeating `path.join(target.homeDir, 'skills'|'hooks')`; behavior for `selection === null` is otherwise identical to before.)

Replace the whole `pluginsOne` function with:

```js
function pluginsOne(sourceDir, target, selection = null) {
  const file = personalPluginsFile(sourceDir);
  if (!fs.existsSync(file)) {
    console.log(`${target.label}: no plugins.json — nothing to install`);
    return;
  }
  let packages = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (selection !== null) packages = packages.filter((p) => selection.has(`plugins:${p.label}`));
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

Update `module.exports` to:

```js
module.exports = { run, buildCategories, selectionFile, loadSelection, saveSelection, importOne, pluginsOne };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: no new failures, output continues.

- [ ] **Step 5: Commit**

```bash
git add cli/dotfiles.js cli/test.js
git commit -m "Make importOne/pluginsOne selection-aware, no behavior change when unselected"
```

---

### Task 5: Wire `--select` into `run()`, fix the unknown-flag trap, update docs

**Files:**
- Modify: `cli/dotfiles.js`, `README.md`
- Test: `cli/test.js`

**Interfaces:**
- Consumes: `pickTriState` (Task 2), `buildCategories`/`saveSelection`/`loadSelection` (Task 3), `importOne`/`pluginsOne` (Task 4).
- Produces: `run(argv, defaultSourceDir, io?: { input?, output? })` — new optional third parameter threaded down to `pickTriState`, defaults to real stdin/stdout exactly like `pickTriState` itself does.

- [ ] **Step 1: Write the failing test**

Add to `cli/test.js`, right after `const { PassThrough } = require('stream');` import area is already in place from Task 2. Insert this new block right after the Task 4 selective-import/plugins assertions and before the existing `// dotfiles remove` comment block:

```js
  // --select flag end-to-end: pickTargets must not treat a bare "--select" (no --claude/
  // --all) as an unrecognized flag and select zero agents — that trap exists because
  // pickTargets fails safe on any flag it doesn't recognize as a target key.
  {
    const io = { input: new PassThrough(), output: new PassThrough() };
    io.output.resume();
    const selectHome2 = path.join(tmp, 'select-home-2');
    const selectTarget2 = { key: 'claude', label: 'Claude Code', homeDir: path.join(selectHome2, '.claude') };
    const { lines, index } = lib.renderMenu(dotfiles.buildCategories(sourceDir, selectTarget2), new Set(['skills:demo-skill', 'skills:second-skill', 'hooks:demo-hook', 'settings:model', 'settings:theme']));
    const deselectNum = [...index.entries()].find(([, e]) => e.itemKeys[0] === 'settings:theme' && e.itemKeys.length === 1)[0];
    const runPromise = dotfiles.run(['import', '--select', '--claude', '--home', selectHome2], sourceDir, io);
    io.input.write(`${deselectNum}\n`);
    io.input.write('\n');
    await runPromise;

    const settingsAfterSelect = JSON.parse(fs.readFileSync(path.join(selectHome2, '.claude/settings.json'), 'utf8'));
    assert.deepStrictEqual(settingsAfterSelect, { model: 'test' }, '--select end-to-end: deselected settings key excluded, others kept');
    assert.ok(fs.existsSync(path.join(selectHome2, '.claude/skills/second-skill')), '--select end-to-end: items never touched during the prompt stay selected (default all)');

    const savedSelection = dotfiles.loadSelection(selectTarget2);
    assert.ok(savedSelection && !savedSelection.has('settings:theme'), '--select end-to-end: the resolved selection is persisted to .ai-config-selection.json');
  }

  // Confirming with nothing selected must abort before touching the filesystem, same as
  // pickTargets's existing "Nothing selected" fail-safe for agent selection.
  {
    const io = { input: new PassThrough(), output: new PassThrough() };
    io.output.resume();
    const emptyHome = path.join(tmp, 'select-home-empty');
    const emptyLogs = [];
    const origLog = console.log;
    console.log = (...a) => emptyLogs.push(a.join(' '));
    const runPromise = dotfiles.run(['import', '--select', '--claude', '--home', emptyHome], sourceDir, io);
    io.input.write('n\n'); // deselect everything
    io.input.write('\n'); // confirm
    await runPromise;
    console.log = origLog;
    assert.match(emptyLogs.join('\n'), /nothing to do/i, '--select with nothing selected: prints an abort message');
    assert.ok(!fs.existsSync(emptyHome), '--select with nothing selected: never creates the target home dir');
  }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: fails because `--select` isn't a recognized behavior yet — either `dotfiles.run` hangs waiting on the real stdin (since `io` isn't threaded through) or `pickTargets`'s unknown-flag fail-safe silently selects zero targets and the import never happens, so the settings.json assertion throws `ENOENT`. Either way, confirm it fails before implementing.

- [ ] **Step 3: Write minimal implementation**

In `cli/dotfiles.js`, update the `require('./lib')` line to also pull in `pickTriState`:

```js
const { mirrorDir, pickFromMenu, pickTriState } = require('./lib');
```

Fix `pickTargets`'s fail-safe so `--select` doesn't get mistaken for an unrecognized flag (replace the whole function):

```js
async function pickTargets(flags, targets) {
  if (flags.has('all')) return targets;
  const byFlag = targets.filter((t) => flags.has(t.key));
  if (byFlag.length) return byFlag;
  // 'select' is a recognized action flag, not a target key — don't let it trip the
  // "unrecognized flag" fail-safe below.
  const unknownFlags = [...flags].filter((f) => f !== 'select');
  if (unknownFlags.length > 0) return []; // an unrecognized flag was passed — fail safe, don't guess
  const picked = await pickFromMenu(
    targets.map((t) => ({ key: t.key, label: t.label, extra: t.homeDir })),
    'AI Config dotfiles — which agent do you want to import into this machine?'
  );
  return targets.filter((t) => picked.has(t.key));
}
```

Update `run()`'s signature and its `import`/`plugins` dispatch (replace the whole function):

```js
async function run(argv, defaultSourceDir, io = {}) {
  const { flags, opts, rest } = parseArgs(argv);
  const sourceDir = path.resolve(opts.source || defaultSourceDir);
  const homeBase = path.resolve(opts.home || os.homedir());
  const targets = resolveTargets(homeBase);
  const [action, name] = rest;

  if (!['import', 'list', 'remove', 'plugins', 'tree', undefined].includes(action)) {
    console.log(
      'usage: ai-config dotfiles <import|list|remove|plugins|tree> [--claude|--all] [--select] [name] [--source <dir>] [--home <dir>]'
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
    if (action === 'import') {
      let selection = null;
      if (flags.has('select')) {
        selection = await pickTriState(buildCategories(sourceDir, target), `${target.label} — choose what to bring into this machine`, io);
        if (selection.size === 0) {
          console.log(`${target.label}: nothing selected. Nothing to do.`);
          continue;
        }
        saveSelection(target, selection);
      }
      importOne(sourceDir, target, selection);
    } else if (action === 'plugins') {
      const selection = flags.has('all') ? null : loadSelection(target);
      pluginsOne(sourceDir, target, selection);
    } else if (action === 'tree') treeOne(sourceDir, target);
    else if (action === 'remove') {
      const hit = removeOne(sourceDir, target, name);
      if (!hit) console.log(`${target.label}: skill not found: ${name}`);
    } else listOne(sourceDir, target);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: `ok — all checks passed` at the end, no failures anywhere in the file.

- [ ] **Step 5: Update README and commit**

In `README.md`, in the "Editing" section, find the line about `node cli/index.js dotfiles list / import / plugins / tree`. Change it to mention the new flag:

```
- Applying this machine's dotfiles (currently Claude Code only): `node cli/index.js dotfiles
  list` / `import [--select]` / `plugins` / `tree` — see [cli/dotfiles.js](cli/dotfiles.js) for flags
  and the `--home` sandbox option for testing without touching your real profile. `import`
  only mirrors files (personal skills, settings.json); `--select` on `import` prompts for
  which personal skills / hooks / settings.json keys / plugins.json packages to bring over
  instead of everything, and remembers the choice in `<homeDir>/.ai-config-selection.json`
  so a later plain `dotfiles plugins` (no `--select`/`--all`) honors it automatically;
  `plugins` runs `.ai/plugins.json`, package-manager style, kept as its own step since it
  hits the network and installs software or registers MCP servers; `tree` prints this
  machine's home-scope picture (personal skills, settings, plugins) generated from disk.
```

```bash
git add cli/dotfiles.js cli/test.js README.md
git commit -m "Wire --select into dotfiles import/plugins, document it"
```

---

## Manual verification (after all tasks)

Not part of the automated test — do this once by hand to see the actual UI:

```
node cli/index.js dotfiles import --select --claude --home /tmp/ai-config-manual-test
```

(On Windows PowerShell: `node cli/index.js dotfiles import --select --claude --home $env:TEMP\ai-config-manual-test`)

Expect the numbered tri-state menu for your real `.ai/` content, type a category number and an item number to toggle them, confirm with Enter, and check the resulting `/tmp/ai-config-manual-test/.claude/` (or the `%TEMP%` path on Windows) only contains what you left checked. Delete the scratch directory afterward — it's disposable, never the real `~/.claude`.
