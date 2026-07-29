# Selective dotfiles import — design

## Problem

`dotfiles import` and `dotfiles plugins` are all-or-nothing: every personal skill, every
hook, every key in `claude-settings.json`, and every package in `plugins.json` gets
materialized onto the target machine. When setting up a new PC, not everything from the
old machine is necessarily wanted (a skill tied to a specific old project, a plugin no
longer used, a settings.json key that was a one-off experiment). There's currently no way
to bring over a subset without hand-editing `.ai/` first and reverting after.

## Decision

Add an opt-in, item-level selection step to `dotfiles import`, implemented as a plain
numbered `readline` menu — no new dependency.

Two alternatives were considered and rejected:

- **A Node checkbox-tree library** (e.g. `@inquirer/checkbox`): gives real spacebar-toggle
  checkboxes, but would be this repo's first-ever dependency (`package.json` has none
  today) and would add an `npm install` step the current quickstart doesn't need
  (`node cli/index.js --all` works straight after clone). This selection flow is only used
  when setting up a new machine — an infrequent operation — so a permanent dependency and
  workflow change doesn't pay for itself.
- **A Python TUI** (questionary/InquirerPy/textual): would require a second language
  runtime on every machine this CLI runs on, on top of the already-required Node. Rejected
  outright — worse than the Node-library option on every axis.
- **A tiny local HTML form**: genuinely cross-platform and dependency-free, but more moving
  parts (an ephemeral local server) than a text prompt for a feature used a handful of
  times total. Not pursued for v1; could revisit if the text menu proves too clunky in
  practice.

`lib.js`'s existing rule against arrow-key/raw-mode pickers (see its comment on
`pickFromMenu`) is specifically about Windows raw-mode fragility, not a blanket
"no dependencies" stance — but combined with the dependency-count and install-step cost
above, the numbered-menu approach wins on cost/benefit for this feature.

## Design

### Trigger

New `--select` flag on `dotfiles import`, e.g.:

```
node cli/index.js dotfiles import --select --claude
```

Without `--select`, behavior is unchanged: everything is imported, exactly like today.
Fully backward compatible.

### Selection UI

New function in `cli/lib.js`, alongside `pickFromMenu`, using the same plain-`readline`
approach (no raw mode, correct on every terminal). Renders a flat numbered list: each
category is a row with a tri-state ASCII mark (`[x]` all children selected, `[ ]` none,
`[~]` mixed), and its items are indented rows below with their own `[x]`/`[ ]`.

- Typing a category's number toggles all of its children at once.
- Typing an item's number toggles just that item and recomputes its parent's mark.
- The tree reprints after every input line so the user can see the effect before
  confirming.
- Enter on an empty line confirms the current selection (mirrors `pickFromMenu`'s "Enter
  to cancel" idiom, but here confirms rather than cancels since a category tree defaults
  to "everything checked").
- `a`/`all` still means "select everything," matching `pickFromMenu`'s existing
  convention.

ASCII-only marks (`[x]`/`[ ]`/`[~]`), not Unicode checkboxes — keeps output correct
regardless of the terminal's codepage.

### What's selectable

Four categories, matching what `dotfiles.js` already tracks per machine:

- `skills/personal/*` — each personal skill folder
- `claude-hooks/*` — each hook script file
- `claude-settings.json` — each top-level key (`model`, `effortLevel`, `theme`, `hooks`,
  `enabledPlugins`, `extraKnownMarketplaces`, …)
- `plugins.json` — each package label

### Persisting the choice

After confirming, the selection is written to
`<homeDir>/.claude/.ai-config-selection.json` — machine-local runtime state, not tracked
in `.ai/` (same reasoning `dotfiles.js`'s header comment already gives for why
`plugins/` cache and `ide/` stay untracked: it's reproducible, not source of truth).

`dotfiles plugins`, run afterward without `--select`/`--all`, reads this file if present
and skips any package label not in it — so one Q&A session at `import --select` time
covers both the import step and the later plugin-install step, without prompting twice.
`--all` on either command ignores the file and processes everything (today's behavior,
and the way to start over after a selective import).

A saved selection is scoped per category by key prefix (`skills:`, `hooks:`, `settings:`,
`plugins:`). A category the selection has zero keys for means the user was never asked
about that category — not that they were asked and excluded everything in it. The only way
`buildCategories` omits a category is when the underlying source is empty or absent at
`--select` time (e.g. no `plugins.json` yet, or an empty one), so a selection saved under
those conditions has no `plugins:*` keys at all. Later, once `plugins.json` gains content,
`dotfiles plugins` reading that same selection must treat "zero keys in this category" as
"include everything in this category," not "exclude everything" — otherwise every package
added to `plugins.json` after that `--select` run would be silently, permanently skipped,
and the documented "edit `.ai/plugins.json`, then `dotfiles plugins`" workflow would break.
Concretely: before consulting a saved selection for a category, check whether it contains
any key for that category at all; if not, fall back to "no selection" (include everything)
for that category specifically.

### Materialization changes (`cli/dotfiles.js`)

- `importOne`: instead of `mirrorDir`/`copyFileSync` wholesale, copy only the selected
  skill folders and hook files individually; unselected ones are simply not copied
  (nothing is deleted on the destination — this targets a fresh machine, so there's
  nothing pre-existing to reconcile against).
- For `settings.json`: build a filtered object containing only the selected top-level
  keys (instead of copying the source file byte-for-byte), then write it out.
- `pluginsOne`: skip any package whose `label` isn't in the active selection.
- The existing non-Windows `chmod 755` on hooks still applies, per-file, to whatever was
  actually copied.

### Error handling

If the user confirms with nothing selected, treat it the same way `pickTargets` already
handles an empty pick today: print "Nothing selected. Nothing to do." and abort before
touching the filesystem — no partial imports.

### Testing

Extend `cli/test.js` (already runs `import`/`plugins`/`remove` against a sandboxed
`--home` fake directory) with a case that feeds a scripted partial selection via stdin and
asserts: the selected skill/hook/settings-key/plugin ended up materialized, and an
unselected one from each category did not.

## Explicitly out of scope (YAGNI)

- `dotfiles list` / `dotfiles tree` are not selection-aware — they keep reporting raw
  drift between `.ai/` and the live machine, without distinguishing "deliberately
  excluded" from "not yet imported." Revisit only if that distinction turns out to matter
  in practice.
- No GUI/browser form for v1 (see Decision).
- No cross-machine sync of the selection file — it's per-machine state, not something
  `.ai/` needs to know about.
