# Plain-text import manifest (replaces the interactive checkbox picker) — design

## Problem

`dotfiles import --select` (see `docs/superpowers/specs/2026-07-29-selective-dotfiles-import-design.md`)
added an interactive tri-state checkbox menu (`cli/lib.js`'s `pickTriState`/`renderMenu`/
`toggle`) for choosing which personal skills, hooks, settings.json keys, and plugins.json
packages to bring onto a machine. In practice this is extra machinery for something that's
really a declarative fact: "these are the things I want on this machine." An interactive
menu has to be re-run (or its machine-local `.ai-config-selection.json` re-inspected) to
know what was chosen; it can't be diffed, reviewed in a PR, or copied to a second machine
without re-answering the same prompts.

## Decision

Replace the interactive picker with a plain-text manifest file per target agent, versioned
in `.ai/` alongside everything else that's already source of truth. Selecting a subset
becomes "edit a text file," the same mental model as every other `.ai/` file in this repo.

## Design

### The manifest file

One file per target, named `.ai/<key>-import.txt` (e.g. `.ai/claude-import.txt`) — same
`<key>-` prefix convention `claude-settings.json` and `claude-hooks/` already use.

Format: one `category:item` per line. Blank lines and lines starting with `#` are ignored.

```
# claude-import.txt — what `dotfiles import`/`dotfiles plugins` bring onto this machine
# for Claude Code. Run `dotfiles tree --claude` to see available names, prefixed with
# skills: / hooks: / settings: / plugins: to build a line here.
#
# A category with zero lines here is imported in full — only list a category's lines when
# you want to narrow it to specific items.
skills:demo-skill
hooks:demo-hook
settings:model
plugins:demo installer
```

The four categories are the same ones `dotfiles.js` already tracks: `skills/personal/*`,
`<key>-hooks/*`, `<key>-settings.json` top-level keys, `plugins.json` package labels.

### Filtering rule: per-category opt-in

For each category independently: if the manifest contains at least one line for that
category, only the named items are imported/installed for it. If the manifest has zero
lines for a category (including when the manifest file doesn't exist at all), that category
is imported/installed in full — unfiltered, same as today's default behavior.

This means a manifest that only lists `skills:` lines still brings over every hook, every
settings.json key, and every plugin — it doesn't silently zero out categories the file
doesn't mention. (Rejected alternative: "the manifest is the exhaustive list of everything
copied" — simpler to state, but a manifest written to curate skills would silently stop
installing plugins the moment it's created, since plugins were never mentioned. Per-category
opt-in avoids that footgun.)

### Trigger

No flag. `dotfiles import` and `dotfiles plugins` read `.ai/<key>-import.txt` for the target
automatically, every run, if it exists. `--select` is removed — there's no interactive step
to opt into anymore.

`--all` keeps its current meaning on both commands: ignore the manifest entirely, process
every item in every category. This is the "start over" / one-off override path, no file
edit required.

### Removed

- `cli/lib.js`: `pickTriState`, `renderMenu`, `toggle`, `triState`, `TRI_STATE_MARK` — the
  entire checkbox UI (`pickFromMenu`, the plain numbered agent picker, is unrelated and
  stays).
- `cli/dotfiles.js`: `buildCategories` (existed only to feed the picker — `dotfiles tree`
  already lists the same names from `.ai/`, see the manifest's own comment above),
  `selectionFile`/`loadSelection`/`saveSelection` and the `.ai-config-selection.json`
  machine-local runtime file. The manifest is read fresh from `.ai/` every run, so there's
  nothing left to persist per machine.
- `--select` flag, and the `unknownFlags` special-case in `pickTargets` that existed only to
  keep `--select` from tripping the "unrecognized flag" fail-safe.
- Any existing `~/.claude/.ai-config-selection.json` left on a machine from before this
  change becomes inert (nothing reads it anymore) — no migration needed, it's disposable
  runtime state per the header comment's existing reasoning for that whole class of file.

### Materialization changes (`cli/dotfiles.js`)

- New `readImportManifest(sourceDir, target)`: reads `.ai/<key>-import.txt`, returns `null`
  if the file doesn't exist, else a `Set<string>` of its `category:item` lines (comments/
  blanks stripped).
- New helper to derive an effective per-category selection: given the manifest Set (or
  `null`) and a category prefix (`'skills'`, `'hooks'`, `'settings'`, `'plugins'`), return
  `null` (unfiltered) if the manifest is `null` or has zero keys with that prefix, else the
  filtered `Set` of that category's keys.
- `importOne`/`pluginsOne` keep their existing "selection is `null` → full copy, `Set` →
  filtered copy" branches per category (already there from the tri-state feature) — only
  the thing computing the selection changes, from "picker output" to "manifest lookup."
- `run()`'s `import`/`plugins` branches shrink to: `const manifest = flags.has('all') ? null
  : readImportManifest(sourceDir, target);` then call `importOne`/`pluginsOne` with it. No
  more prompt branch, no more save-after-success step, no more "clear stale selection on a
  plain import" logic (nothing is stale — the manifest is read fresh every time).

### Testing

Replace `cli/test.js`'s tri-state-picker tests (helpers, `pickTriState`, EOF safety,
`buildCategories`, `selectionFile`/`loadSelection`/`saveSelection`, the `--select`
end-to-end block) with manifest-based coverage: a written `.ai/claude-import.txt` fixture
with a couple of lines and a comment, asserting — selected items materialize, unselected
items in a *mentioned* category don't, an *unmentioned* category still imports in full,
`--all` bypasses the manifest, and comment/blank lines are ignored.

### Docs

Update `README.md`'s dotfiles section: drop `--select` and `.ai-config-selection.json`,
describe `.ai/<key>-import.txt` and the per-category opt-in rule, point at `dotfiles tree`
for building manifest lines.

## Explicitly out of scope (YAGNI)

- No command to auto-generate/scaffold the manifest file — `dotfiles tree` already lists
  the names; prefixing them by hand is a few keystrokes for an infrequent edit.
- No validation that a manifest line's item actually exists in `.ai/` (e.g. a typo'd skill
  name) — it just won't match anything and silently imports nothing extra for that line,
  same as today's drift-focused `dotfiles list` would surface via "system missing."
- No migration tooling for old `.ai-config-selection.json` files — they're inert, not
  harmful; delete manually if desired.
