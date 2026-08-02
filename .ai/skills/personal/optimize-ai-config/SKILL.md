---
name: optimize-ai-config
description: >-
  Audit and trim Claude Code plugins, MCP servers, and marketplaces across
  Desktop app, CLI, and VS Code plugin surfaces — AND reconcile against this
  user's ai-config dotfiles repo (.ai/plugins.json, .ai/mcp-servers.json,
  .ai/claude-settings.json), which is the actual source of truth, not the raw
  runtime files. Use when the user asks to "optimize my AI agent setup",
  "best F1 car" style requests, "audit my plugins/MCP", "clean up my Claude
  config", or when runtime state and the ai-config repo disagree.
---

# Optimizing this user's Claude Code setup

`ai-config` — a dotfiles CLI that generates every AI tool's config from one `.ai/` source.
Editing `~/.claude/settings.json` or running raw `claude plugin` commands changes only
the runtime — it does not update the source, and the next `dotfiles
import`/`plugins` run silently reverts it.** Any "optimize" task must touch
both, or explicitly tell the user the change is runtime-only and will not
survive a re-sync.

## Two layers, don't confuse them

| Layer                              | Files                                                                                                                                                                                    | Changed via                                                                                                                      |
|------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| **Declared source** (this repo)    | `.ai/plugins.json` (machine-wide installers), `.ai/mcp-servers.json` (project-scoped MCP), `.ai/claude-settings.json` (settings.json shape: `enabledPlugins`, `hooks`, `effortLevel`...) | edit the file, then `node cli/index.js dotfiles plugins` / `dotfiles import` / `--mcp` from the ai-config repo root              |
| **Runtime** (actual machine state) | `~/.claude/settings.json`, `~/.claude.json` (`mcpServers`, per-project state), `~/.claude/plugins/installed_plugins.json`, `~/.claude/plugins/known_marketplaces.json`                   | `claude plugin install/uninstall/enable/disable`, `claude mcp add`, or hand-edit `~/.claude.json` for raw non-plugin MCP entries |

Other surfaces, for completeness:
- Desktop app (if installed — check `%APPDATA%\Claude` exists first):
  `%APPDATA%\Claude\claude_desktop_config.json` (`mcpServers` only)
- VS Code extension (`anthropic.claude-code`): **no independent config** — it
  shells out to the same CLI, reads the same `~/.claude` + `~/.claude.json`.
  Only `claudeCode.*` keys in VS Code's own `settings.json` (panel layout
  etc.) are extension-specific.

## Audit procedure

1. Read `.ai/plugins.json`, `.ai/mcp-servers.json`, `.ai/claude-settings.json`
   in the ai-config repo — this is intent.
2. Read `~/.claude/settings.json` (`enabledPlugins`), `~/.claude/plugins/
   installed_plugins.json`, and `~/.claude.json` (`mcpServers` + per-project
   `mcpServers`) — this is actual state.
3. Diff them both directions:
   - **Declared but not running** — installer in `plugins.json` /
     plugin listed `true` in `claude-settings.json` that isn't actually
     installed/enabled at runtime. Could mean the install failed silently,
     was manually disabled, or the source is stale.
   - **Running but not declared** — plugin/MCP server active at runtime with
     no corresponding entry in `.ai/`. Either a one-off the user installed by
     hand and forgot to declare, or something to prune.
   - **Contradiction**: a plugin `false`/absent from `enabledPlugins` while a
     raw `mcpServers` entry for the same tool is still live in `~/.claude.json`
     — the raw entry bypasses the plugin toggle silently.
4. Flag capability overlap (e.g. two browser-automation tools) — costs
   context on every turn for redundant coverage.
5. Flag orphaned scope — an MCP server registered only under an unrelated
   project path in `~/.claude.json`'s `projects[*]`.
6. A marketplace in `known_marketplaces.json`/`plugins.json` with zero
   installed plugins is dead weight — but check `plugins.json` isn't just
   holding it as an available-but-currently-uninstalled catalog entry before
   recommending removal; that's a legitimate use of this repo's catalog.

## Applying changes correctly

- Prefer editing `.ai/` source + re-running this repo's CLI over raw `claude`
  commands — otherwise the fix doesn't survive the next sync.
- Runtime-only fixes (e.g. disabling something for one machine without
  touching the shared catalog) are valid too — say explicitly that it's
  runtime-only and will revert on next `dotfiles plugins`/`import`.
- Never hand-edit anything outside `.ai/`, `cli/`, `wiki/`, `package.json` in
  this repo — everything else is generated/gitignored per its README.
- `claude plugin uninstall <name>@<marketplace> -y`,
  `claude plugin marketplace remove <name>` (no `-y`),
  `claude plugin enable|disable <name>` for runtime-only changes.
- Changes need a new Claude Code session/restart to take effect.

## Boundaries

- Always present findings and get confirmation before removing or editing —
  this touches the user's actual working tool and a git-tracked shared config
  repo. "Keep both" / "leave the drift" are legitimate outcomes.
- Never touch `.credentials.json`, session history, feature-flag cache.
- Don't add speculative plugins/MCP servers to `.ai/plugins.json` — only
  recommend additions that close a gap the user's actual project work
  demonstrably has.
