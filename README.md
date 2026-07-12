# AI Config

A repository with a unified AI agent configuration that works across Claude Code, GitHub Copilot, OpenAI Codex, Gemini, Cursor, and any tool that reads markdown from the workspace.

## Design principle

One source of truth in `.ai/`. Tool-specific entry points are thin wrappers that reference it — no content duplication.

## Structure

```
.ai/                              ← single source of truth
├── instructions.md               ← shared global rules
├── agents/
│   └── JoomlaGen.md             ← tool-agnostic agent behavior
├── skills/
│   ├── core/                    ← architecture, workflow, review, testing, DoD, JS, CSS, git, docs, agent stack, agent modules
│   └── projects/
│       ├── joomla/              ← joomla, php, leaflet, json
│       └── astro/               ← astro, content, routing
└── workflows/
    ├── joomlagen-workflow.md
    ├── review.md
    └── security-review.md

# Auto-loaded entry points (thin, reference .ai/)
CLAUDE.md                        ← Claude Code (@imports)
AGENTS.md                        ← OpenAI Codex, Gemini, generic fallback
GEMINI.md                        ← Gemini CLI
.cursor/rules/project.mdc        ← Cursor (alwaysApply)
.windsurfrules                   ← Windsurf
.vscode/mcp.json                 ← MCP servers (filesystem, github)

.github/copilot-instructions.md  ← GitHub Copilot
.github/agents/JoomlaGen.agent.md
.github/skills/joomlagen-workflow/SKILL.md  ← Copilot invocable skill

.claude/agents/JoomlaGen.md      ← Claude subagent (metadata + model)
.claude/commands/                ← Claude slash commands (/joomlagen-workflow, /review, /security-review)
```

## Quick workflow

1. Edit rules in `.ai/` — changes apply to all tools automatically.
2. Add a new skill: create a file in `.ai/skills/core/` or `.ai/skills/projects/<name>/`.
3. Add a new workflow: create a file in `.ai/workflows/` and add a thin wrapper in `.claude/commands/` for Claude slash command support.
4. Add a new agent: create tool-agnostic behavior in `.ai/agents/`, then add wrappers in `.claude/agents/` and `.github/agents/`.

## Model guidance

- Joomla tasks: `JoomlaGen` agent
- Reviews: `/review` command
- Security audits: `/security-review` command
- Complex Joomla workflows: `/joomlagen-workflow` command

## Installing community skills with skills.sh

[skills.sh](https://skills.sh) (by Vercel) is an open registry of reusable agent skill files. It auto-detects your tech stack and installs matching skill documents directly into your project.

```sh
npx skills
```

The CLI scans your repo (package.json, config files, file extensions) and offers a curated list of relevant skills to install. Drop the output into `.ai/skills/projects/<name>/` to keep it within this repo's unified structure so all tools pick it up automatically.

You can also install a specific skill by name:

```sh
npx skills add nextjs
npx skills add tailwind
npx skills add typescript
```

> Skills from the registry are plain markdown files — no lock-in. Review them before committing, and place them under `.ai/skills/` to stay consistent with the single-source-of-truth layout.

## Resources

See [references.md](references.md) for curated links on agent skills, Claude Code, MCP,
context/memory tooling, plugin marketplaces, and prompt engineering.

## Related: personal AI notes and tools

This repo is the *project-embedded* AI config (skills/agents shipped with a Joomla repo).
Machine-level AI notes/tools, copied in from the `AI+PC` inbox repo, live under
[personal-notes/](personal-notes/):

- **[ai-agent-basics.md](personal-notes/ai-agent-basics.md)** — the six-block mental model
  (Context, Memory, Connectors/MCP, Skills, Plugins, Harness) used to pick the tools listed
  in `references.md`.
- **[ai-releases/](personal-notes/ai-releases/ai-releases.md)** — running Claude/ChatGPT/Gemini
  release tracker.
- **[claude-skills-sync/](personal-notes/claude-skills-sync/README.md)** — syncs
  `~/.claude/skills/` and `~/.claude/plugins/` (user-level, machine-specific) across machines
  via git. Complements this repo's `.ai/skills/` (project-level, versioned with the code).
