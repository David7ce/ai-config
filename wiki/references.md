# References

Curated resources for AI agent configuration, skills, and prompt engineering.

## Claude Code (official)

- [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook) — Recipes and patterns for building with the Claude API
- [Anthropic Prompt Library](https://docs.anthropic.com/en/prompt-library/library) — Official curated prompts for common tasks
- [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) — Automating actions on tool events
- [Claude Code Memory & CLAUDE.md](https://docs.anthropic.com/en/docs/claude-code/memory) — Workspace instructions and persistent memory
- [Claude Code Overview](https://docs.anthropic.com/en/docs/claude-code/overview) — Getting started with Claude Code CLI and IDE extensions
- [Claude Code Sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents) — Defining and invoking subagents in `.claude/agents/`

## Agent Skills & Ecosystems

- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) — Production-grade engineering skills for AI coding agents
- [agentskills.io](https://agentskills.io/home) — Standardized way to give AI agents new capabilities
- [anthropics/skills](https://github.com/anthropics/skills) — Anthropic's public Agent Skills repository
- [autoskills.sh](https://www.autoskills.sh) — Auto-detect tech stack and install matching agent skills
- [ClawHub](https://clawhub.ai) — Fast skill registry for agents with vector search
- [mattpocock/skills](https://github.com/mattpocock/skills) — Real-world skills straight from a `.claude` directory
- [openai/skills](https://github.com/openai/skills) — Skills catalog for Codex agents
- [google/skills](https://github.com/google/skills) — Skills catalog for Gemini agents
- [officialskills.sh](https://officialskills.sh) — Official skills catalog aggregator
- [skills.sh / Vercel Skills](https://skills.sh) — Open agent skills ecosystem; install via `npx skills`
- [Wondel.ai Skills](https://skills.wondel.ai) — Business and engineering frameworks packaged as agent skills (StoryBrand, JTBD, Clean Code, and more)

## MCP (Model Context Protocol)

- [modelcontextprotocol.io](https://modelcontextprotocol.io) — Open standard for connecting AI agents to external tools and data sources
- [mcpservers.org](https://mcpservers.org/) — MCP server directory
- [MCP Market](https://mcpmarket.com/) — MCP server directory
- [MCP Repository](https://mcprepository.com/) — MCP server directory
- [LobeHub MCP](https://lobehub.com/mcp) — MCP server directory
- [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) — Drive a real Chrome instance from an agent
- [playwright-mcp](https://github.com/microsoft/playwright-mcp) — Browser automation over MCP
- [Agent-Reach](https://github.com/Panniantong/Agent-Reach) — Read Twitter/Reddit/YouTube/GitHub without API fees

## Plugins & Marketplaces

- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) — Official Claude Code plugin marketplace
- [ClaudePluginHub](https://www.claudepluginhub.com/) — Plugin directory
- [claudemarketplaces.com](https://claudemarketplaces.com/) — Plugin directory
- [HOL Registry](https://hol.org/registry/plugins) — Multi-model plugin registry (Claude/Codex/Grok/Gemini)
- [garrytan/gstack](https://github.com/garrytan/gstack) — 23-tool opinionated Claude Code plugin setup

## Context & Memory

- [caveman](https://github.com/juliusbrussee/caveman) — Compresses agent output/instructions to cut tokens
- [pxpipe](https://github.com/teamchong/pxpipe) — Renders text context as images to cut tokens
- [codebase-memory-mcp](https://deusdata.github.io/codebase-memory-mcp/) — Persistent knowledge graph of a codebase; structural queries at ~120x fewer tokens than file-by-file reads

## Design & Frontend

- [getdesign.md](https://getdesign.md) — DESIGN.md collection; drop one into a project and let agents match the UI style
- [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) — Agent skills for Obsidian (Markdown, Bases, JSON Canvas, CLI)
- [taste-skill](https://github.com/Leonxlnx/taste-skill) — Gives agents better frontend taste; reduces generic output

## Prompt Engineering

- [Learn Prompting](https://learnprompting.org) — 60+ modules on prompt engineering, translated into 9 languages
- [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) — Research skill that synthesizes Reddit, X, YouTube, HN, and the web into a grounded summary
- [Prompt Engineering Guide](https://www.promptingguide.ai) — Comprehensive overview of prompting techniques
- [prompts.chat](https://prompts.chat) — Community prompt collection
- [system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks) — Leaked system prompts from major AI products

## Release tracking

- [ai-releases/](ai-releases/ai-releases.md) — consolidated Claude/ChatGPT/Gemini release
  timeline, updated per quarter

## Dotfiles (this machine)

- [ai-agent-basics.md](ai-agent-basics.md) — six-block framing (Context,
  Memory, Connectors, Skills, Plugins, Harness) this list's tool picks are partly curated from
- [cli/dotfiles.js](../cli/dotfiles.js) — this repo's own Claude Code dotfiles sync
  (`node cli/index.js dotfiles list|import|plugins|tree`), replacing an earlier PowerShell
  `claude-skills-sync/` tool; `.ai/skills/personal/` and `.ai/plugins.json` are the source
  of truth, git is the DB (different concern than this repo's project-embedded
  `.ai/skills/{core,projects}/`)
