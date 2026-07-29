# Multi-agent dotfiles, Phase 1 (Copilot CLI + Gemini CLI) — design

## Problem

`dotfiles import`/`dotfiles plugins`/`dotfiles list`/`dotfiles tree`/`dotfiles remove` only
support Claude Code today — `DOTFILE_TARGETS` in `cli/dotfiles.js` has exactly one entry.
The header comment explains why: "don't guess at where another tool's user config lives, a
wrong guess here writes into a real profile." Other agents were left out until there's
confirmed real content and a confirmed home-dir path for each.

## Research

Six candidate agents were checked against official documentation and, where possible, this
machine's actual filesystem:

| Agent | Home dir | Settings-like file | Hooks | Skills | MCP |
|---|---|---|---|---|---|
| Copilot CLI | `~/.copilot/` (confirmed present locally) | `settings.json` | `hooks/` (external scripts) | `skills/` (`SKILL.md`, same shape as Claude) | `mcp-config.json` |
| Gemini CLI | `~/.gemini/` (confirmed present locally, real content) | `settings.json` | embedded in `settings.json` (`hooks.BeforeTool`/`SessionStart`, inline commands, no external scripts) | not supported | embedded in `settings.json` (`mcpServers`) |
| opencode | `~/.config/opencode/` | `opencode.json` | not documented | `skills/` (plural-named subdirs) | likely embedded, unconfirmed |
| Codex CLI | `~/.codex/` | `config.toml` (TOML, not JSON) | not documented | not supported | embedded in `config.toml` (`[mcp_servers.*]`) |
| Cursor | `~/.cursor/` | none | none | `rules/*.mdc` — community reports say Cursor sometimes doesn't pick this up; not solidly confirmed | `mcp.json` |
| Windsurf | `~/.codeium/windsurf/` | none | none | single `memories/global_rules.md` file, not a directory of skills | `mcp_config.json` |

Decision: **scope this spec to Copilot CLI and Gemini CLI only.** Both mirror Claude Code's
existing shape closely (a settings file, optionally hooks, optionally skills), so they
extend the current code with minimal new structure. Codex (different file format
entirely), Cursor (unconfirmed skills support), and opencode (unconfirmed MCP shape) are
different enough to need their own design pass later. Windsurf is dropped — a single
6,000-character memory file with no directory-based skills or hooks doesn't fit this sync
model at all, and there's no local content to sync.

## Design

### New `DOTFILE_TARGETS` entries

```js
const DOTFILE_TARGETS = [
  { key: 'claude', label: 'Claude Code', dirName: '.claude', skills: true },
  { key: 'copilot', label: 'GitHub Copilot CLI', dirName: '.copilot', skills: true },
  { key: 'gemini', label: 'Gemini CLI', dirName: '.gemini', skills: false },
];
```

`skills: boolean` is the only new capability flag needed. Reasoning for why nothing else
needs one:
- **hooks**: no flag required. `importOne`/`buildCategories` already no-op gracefully when
  `.ai/<key>-hooks/` doesn't exist as a source directory (`listFileNames`/`mirrorDir` both
  handle a missing source path already, and `buildCategories` only pushes the `hooks`
  category when there's at least one file). Gemini simply never gets a
  `.ai/gemini-hooks/` directory populated, so the category and the copy step disappear on
  their own with zero new conditional code.
- **settings**: already universal and tool-agnostic — every target gets
  `.ai/<key>-settings.json` copied (or filtered, under `--select`) to
  `<homeDir>/settings.json`. Both Copilot CLI and Gemini CLI's live config files are
  actually named `settings.json`, same as Claude's, so no naming special-case is needed
  either.
- **MCP servers**: deliberately out of scope for this sync mechanism, matching how Claude's
  own `~/.claude/.mcp.json` is handled today — machine-wide MCP registration is a
  `plugins.json` installer concern (`claude mcp add ...`-style commands), not a raw file
  copy. Copilot's `mcp-config.json` and Gemini's embedded `mcpServers` block are untouched
  by this work.

### Skills sharing

`.ai/skills/personal/*` stays a single, tool-agnostic source (no change to its location or
format) — it already gets copied verbatim into `<homeDir>/skills/` for any target with
`skills: true`. Since Copilot CLI's skills format is `SKILL.md` files in subdirectories,
identical to Claude's, existing personal skills become usable by both agents with no
content changes. `skills: false` on the Gemini entry means `importOne` must skip the
skills-copy step entirely for that target (this is the one real code change — today
`importOne` copies skills unconditionally).

### Everything else already generalizes

`buildCategories`, `selectionFile`/`loadSelection`/`saveSelection`, `pickTargets`,
`pluginsOne`, `treeOne`, `listOne` are all already written generically against
`target.key`/`target.label`/`target.homeDir` — none of them assume Claude specifically.
Adding the two new `DOTFILE_TARGETS` entries and threading the `skills` flag through
`importOne` (and `buildCategories`, so `--select` doesn't offer a skills category for a
target that can't use one) is the only code surface this phase touches.

### New source files

- `.ai/copilot-settings.json`, `.ai/copilot-hooks/` — to be filled in with real content
  later (this design only adds the sync mechanism; populating them with actual Copilot CLI
  settings/hooks is a separate, follow-up content task, same as how `.ai/claude-hooks/`
  doesn't need to exist for the Claude sync mechanism to work).
- `.ai/gemini-settings.json` — same: mechanism first, content later. When populated, it
  should be the full `~/.gemini/settings.json` shape (hooks and mcpServers embedded, per
  the research table above), not just a subset.

### Testing

Extend `cli/test.js`'s fixture-building to include a `copilot-settings.json` /
`copilot-hooks/` pair and a `gemini-settings.json` (no hooks dir), then assert: `dotfiles
import --claude --all`-style runs against each target produce the expected files, and that
the Gemini target's `importOne` never creates a `skills/` directory even when
`.ai/skills/personal/` has content (proving the `skills: false` flag is honored). Also
assert `buildCategories(sourceDir, geminiTarget)` never includes a `skills` category.

## Explicitly out of scope (this phase)

- Codex CLI, Cursor, opencode, Windsurf — separate design pass(es) later, each needs its
  own adapter (TOML for Codex, uncertain skills support for Cursor, unconfirmed MCP shape
  for opencode). Windsurf is dropped entirely, not deferred.
- MCP server sync for any agent (Copilot's `mcp-config.json`, Gemini's embedded
  `mcpServers`) — stays a `plugins.json` installer concern, consistent with Claude today.
- Populating `.ai/copilot-settings.json`, `.ai/copilot-hooks/`, `.ai/gemini-settings.json`
  with real content — this spec only builds the sync mechanism.
