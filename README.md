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

## Editing

- Rules, skills, workflows, agent behavior: edit `.ai/instructions.md`, `.ai/skills/`,
  `.ai/workflows/`, `.ai/agents/`, then re-run the CLI.
- Tool-specific metadata (subagent model, tool list, hooks): edit under `.ai/<tool>/project/`
  or `.ai/<tool>/home/`, then re-run the CLI. Never hand-edit the generated copy.
- MCP servers: edit `.ai/mcp-servers.json`, then `node cli/index.js --mcp`.
- Applying this machine's dotfiles (currently Claude Code only): `node cli/index.js dotfiles
  list` / `import` / `plugins` / `tree` — see [cli/dotfiles.js](cli/dotfiles.js) for flags
  and the `--home` sandbox option for testing without touching your real profile. `import`
  only mirrors files (skills, settings.json); `plugins` runs `plugins.json`,
  package-manager style — `claude plugin install ...` and third-party tool installers —
  kept as its own step since it hits the network and installs software; `tree` prints the
  whole `.ai/<tool>/` picture (agents, prompts, skills, plugins) generated from disk.

## Resources

- [wiki/references.md](wiki/references.md) — curated links: agent skills, Claude Code, MCP,
  plugin marketplaces, context/memory tooling, prompt engineering
- [wiki/ai-releases/](wiki/ai-releases/ai-releases.md) — running Claude/ChatGPT/Gemini
  release tracker
- [wiki/ai-agent-basics.md](wiki/ai-agent-basics.md) — six-block mental model behind the
  picks in `references.md`
