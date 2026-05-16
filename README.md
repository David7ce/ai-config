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
│   ├── core/                    ← architecture, workflow, review, testing, DoD, JS, CSS, git, docs
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
.cursorrules                     ← Cursor

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

## Resources

See [references.md](references.md) for curated links on agent skills, Claude Code, MCP, and prompt engineering.
