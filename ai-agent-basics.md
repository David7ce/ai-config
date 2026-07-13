# AI Agent Building Blocks — basics + best tools

The six pieces every AI coding agent (Claude Code, Codex, Cursor…) is built from,
and the best tool/resource for each. Framing from
[interneto.github.io/blog/gen-ai-tools](https://interneto.github.io/blog/gen-ai-tools/);
tool picks are curated from `AI_Plugins.csv`, `AI_Prompt_Skills.csv`, `AI_MCP.csv`.

## The stack, top to bottom

| Block                | One-liner                                                                      | Lifespan                   |
|----------------------|--------------------------------------------------------------------------------|----------------------------|
| **Context**          | Token window the model sees *this turn* (prompt, files, tool output, history). | RAM — wiped each turn      |
| **Memory**           | State that persists *across* turns/sessions beyond the window.                 | Disk — survives            |
| **Connectors (MCP)** | Standard wire format exposing tools/data/actions to any model.                 | Per-session, reconnectable |
| **Skills**           | Folders of instructions/scripts the agent loads on demand.                     | Version-controlled files   |
| **Plugins**          | Packaged bundles of tools/skills/prompts installed into a host app.            | Installed                  |
| **Harness**          | Runtime *around* the model: assembles context, runs the tool loop until done.  | The event loop itself      |

---

## Context — the token window
What the model sees right now. Finite (200K–1M tokens). The game is putting the
right stuff in and keeping junk out.
- **Best practice:** narrow, relevant files; summarize instead of dumping.
- **Token-saving tools:** [caveman](https://github.com/juliusbrussee/caveman) (compression primitive — this repo runs it), [pxpipe](https://github.com/teamchong/pxpipe) (renders text context as images to cut tokens), [codebase-memory-mcp](https://deusdata.github.io/codebase-memory-mcp/) (structural queries at ~120× fewer tokens than file-by-file).

## Memory — persistence
State that outlives the window: scratch files, session summaries, vector DB (RAG).
- **Claude Code native:** `CLAUDE.md` (loaded every session) + the auto-memory dir. **This is the primary memory here.**
- **Structural memory:** [codebase-memory-mcp](https://deusdata.github.io/codebase-memory-mcp/) — persistent knowledge graph of a codebase.
- **Note:** memory ≠ context. Memory is *stored*; it only helps once pulled *into* context.

## Connectors (MCP) — the universal port
[Model Context Protocol](https://modelcontextprotocol.io/): one wire format, works
across Claude/ChatGPT/IDEs without per-app glue. Installed here: **Pencil**, **chrome-devtools**.
- **Directories:** [mcpservers.org](https://mcpservers.org/), [MCP Market](https://mcpmarket.com/), [MCP Repository](https://mcprepository.com/).
- **High-value servers:** [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) (drive a browser), [playwright-mcp](https://github.com/microsoft/playwright-mcp) (browser automation), [Agent-Reach](https://github.com/Panniantong/Agent-Reach) (read Twitter/Reddit/YouTube/GitHub, no API fees).

## Skills — on-demand expertise
Folders of instructions + scripts the agent loads only when relevant. Portable,
version-controlled, host-agnostic. Installed here: `ponytail`, `caveman`, `frontend-design`, `dataviz`, etc.
- **Directories:** [skills.sh](https://skills.sh/) (`npx skills`), [officialskills.sh](https://officialskills.sh/), [clawhub.ai](https://clawhub.ai/), [agentskills.io](https://agentskills.io/home).
- **Official catalogs:** [anthropics/skills](https://github.com/anthropics/skills), [openai/skills](https://github.com/openai/skills), [google/skills](https://github.com/google/skills).
- **Curated packs:** [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), [mattpocock/skills](https://github.com/mattpocock/skills), [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (better design taste), [obsidian-skills](https://github.com/kepano/obsidian-skills).
- **Auto-install for your stack:** [autoskills.sh](https://www.autoskills.sh/).

## Plugins — installed bundles
Skills + tools + prompts packaged for a host app. Built on MCP or proprietary APIs.
This repo has `caveman`, `ponytail`, etc. as Claude Code plugins.
- **Official:** [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official).
- **Directories:** [ClaudePluginHub](https://www.claudepluginhub.com/), [claudemarketplaces.com](https://claudemarketplaces.com/), [HOL Registry](https://hol.org/registry/plugins) (multi-model: Claude/Codex/Grok/Gemini).
- **Opinionated full setups:** [garrytan/gstack](https://github.com/garrytan/gstack) (23-tool Claude Code setup).

## Harness — the agent loop
The runtime around the model: assembles context → sends prompt → parses tool calls
→ executes → repeats until done. **Claude Code itself is the harness here** (plus its
config: `CLAUDE.md`, hooks, settings, permission modes).
- **Alternatives:** Codex, Cursor, Cline, OpenClaw — same loop, different host.
- **Prompt-craft reference** (shapes what you feed the loop): [promptingguide.ai](https://www.promptingguide.ai/), [prompts.chat](https://prompts.chat/), [system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks).

---

## Mental model

**Harness** runs the loop → fills **Context** each turn → pulling from **Memory**,
**Skills**, and **Connectors** as needed → **Plugins** are how you install the last three.
Optimize in that order: a good harness + tight context beats a big pile of plugins.
