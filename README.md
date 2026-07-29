# AI Config

Dotfiles for AI agents: one `.ai/` source of truth, generated into each tool's own config
shape (Claude Code, Codex, opencode, Gemini, Cursor, Windsurf, Copilot, MCP). Clone
anywhere, run the CLI, get every agent reading the same rules in its native format.

Everything at repo root except `.ai/`, `cli/`, `wiki/`, `package.json` is **generated and
gitignored** — never hand-edit it. See the comments in [cli/wrap.js](cli/wrap.js) and
[cli/dotfiles.js](cli/dotfiles.js) for exactly what gets written where and why; they're kept
in sync with behavior, this file isn't.

## Quickstart

```sh
node cli/index.js --all        # first thing after cloning — generates CLAUDE.md etc.
node cli/index.js              # interactive menu, pick agents by number
npm test                       # smoke test after touching cli/
```

To use this on another project: `cd` there and point `--source` at this repo's `.ai/`:

```sh
npx github:David7ce/ai-config --source /path/to/ai-config/.ai
```

## Building blocks

`.ai/` speaks the vocabulary every agentic tool shares today. Each concept has exactly one
generic source of truth; the CLI materializes it into each tool's native shape.

| Concept          | Source of truth                                                                                                                                            | Materialized as                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Instructions** | `.ai/skills/core/*.md`                                                                                                                                     | `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules/`, `.windsurfrules`, `.github/copilot-instructions.md` — always loaded, every session                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Skills**       | `.ai/skills/projects/<name>/*.md` (project, in-repo) and `.ai/skills/personal/<name>/SKILL.md` (personal, machine-wide)                                    | Project skills → `.claude/skills/<name>/SKILL.md` on Claude Code, discovered and loaded only when the task matches (a plain file reference on tools without on-demand loading); personal skills → `~/.claude/skills/` via `dotfiles import`                                                                                                                                                                                                                                                                                                           |
| **Agents**       | `.ai/agents/<name>.md` (behavior, tool-agnostic) + optional `.ai/agents/<name>.json` (the per-tool bits that can't be derived: model IDs, tool-name vocab) | `.claude/agents/`, `.opencode/agents/`, `.github/agents/` — generated, not hand-copied per tool                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Prompts**      | `.ai/prompts/*.md` (flat frontmatter: `title`, `description`, optional `agent`/`checklist`)                                                                | `.claude/commands/`, `.opencode/commands/`, `.github/prompts/` — generated; one exception, `.ai/prompts/*.prompt.md` (the double extension is the marker), a Copilot-only fill-in-the-blank template copied verbatim since it has no generic source to derive from                                                                                                                                                                                                                                                                                    |
| **MCP Servers**  | `.ai/mcp-servers.json` (project-scoped: stdio servers this project needs)                                                                                  | `.mcp.json`, `.vscode/mcp.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Hooks**        | `.ai/claude-hooks/`                                                                                                                                        | `~/.claude/hooks/` via `dotfiles import` — event-triggered scripts, Claude Code only (no equivalent wired up for other tools yet)                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Plugins**      | `.ai/plugins.json` (machine-scoped, tool-agnostic — a package-manager-style list of `{label, installs: [{agent, command, args}]}`)                         | run via `dotfiles plugins` — `claude plugin install ...`, but just as well `claude mcp add ...` / `codex mcp add ...` for machine-wide MCP servers, or any other one-time setup command. A plugin available for more than one agent (e.g. a marketplace plugin with both a Claude and a Codex install path) is one package with multiple `installs` steps, not a copy per agent — and one agent needing two chained CLI calls (e.g. `marketplace add` before `install` can reference it) is still one step, `{agent, shell: "cmd1 && cmd2"}`, not two |

MCP Servers and Plugins can both end up registering an MCP server, but at different scope:
`mcp-servers.json` is *this project's* servers, shared via git, materialized into
`.mcp.json` for whoever clones the repo. `plugins.json` is *your machine's* servers —
`codex mcp add` (and similar) has no project scope to target, so a personal, always-available
MCP server belongs there instead, run once per machine like any other installer entry.

Instructions and Skills are both markdown rule files but behave differently: `skills/core/`
is unconditional context on every session; `skills/projects/<name>/` and
`skills/personal/<name>/` are conditional — they should only cost context when the task
actually matches. All three sit under one `.ai/skills/` tree; what differs is *scope*
(always / this project / this machine) and *mechanism* (`wrap.js` for the first two,
`dotfiles.js` for the third) — not the file format.

`.ai/` itself stays flat, not nested per tool: content that's actually portable (skills,
agents, prompts, MCP servers, plugins/installers) sits at the root regardless of which
tool ends up reading it. The one thing that's genuinely tool-specific and not portable —
Claude Code's own `settings.json` shape (`effortLevel`, `hooks`, `enabledPlugins`, ...) —
gets a `<tool>-` prefixed filename instead of a subfolder (`.ai/claude-settings.json`,
`.ai/claude-hooks/`), honest about scope without needing a directory for it.

## Editing

- Rules, always-on skills, agent behavior: edit `.ai/skills/core/`, `.ai/agents/`, then
  re-run the CLI.
- Task-scoped project skills, prompts: edit `.ai/skills/projects/<name>/`, `.ai/prompts/`,
  then re-run the CLI.
- Personal skills (yours, machine-wide, not tied to any project): edit
  `.ai/skills/personal/<name>/SKILL.md`, then `dotfiles import`.
- Agent behavior: edit `.ai/agents/<name>.md`. Per-tool model/tool-list: edit the matching
  `.ai/agents/<name>.json` (only add the tool blocks you need). Then re-run the CLI — never
  hand-edit `.claude/agents/`, `.opencode/agents/`, or `.github/agents/` directly, they're
  regenerated every run.
- Home-scope tool config: edit `.ai/<tool>-settings.json` / `.ai/<tool>-hooks/`, then
  `dotfiles import`.
- Machine-wide installers (Claude plugins, `mcp add` registrations, any other one-time
  setup command): edit `.ai/plugins.json`, then `dotfiles plugins`.
- Project-scoped MCP servers (this project's, shared via git): edit `.ai/mcp-servers.json`,
  then `node cli/index.js --mcp`.
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

## Resources

- [wiki/references.md](wiki/references.md) — curated links: agent skills, Claude Code, MCP,
  plugin marketplaces, context/memory tooling, prompt engineering
- [wiki/ai-releases/](wiki/ai-releases/ai-releases.md) — running Claude/ChatGPT/Gemini
  release tracker
- [wiki/ai-agent-basics.md](wiki/ai-agent-basics.md) — six-block mental model behind the
  picks in `references.md`
- [wiki/genai-models/](wiki/genai-models/genAI-model-list.md) — generative AI model index,
  FOSS ComfyUI checkpoints/workflows, local LLM (llama.cpp) launch notes
