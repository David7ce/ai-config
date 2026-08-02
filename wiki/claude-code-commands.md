# Claude Code — Commands & Keyboard Shortcuts (Full Reference)

Compiled 2026-07-31. Sources: official docs (code.claude.com/docs), plus the actual
skills/plugins installed in this environment (from live session context — your `/`
menu will match this, not a generic install).

---

## 1. Built-in slash commands

### Navigation & Session Management
| Command           | Description                                                             |
|-------------------|-------------------------------------------------------------------------|
| `/cd <path>`      | Move to a new working directory while preserving conversation context   |
| `/add-dir <path>` | Add a working directory for file access without moving the session      |
| `/clear [name]`   | Start a new conversation with empty context (aliases: `/reset`, `/new`) |
| `/resume`         | Return to an earlier conversation; opens interactive session picker     |
| `/resume <name>`  | Resume a named session directly                                         |
| `/branch [name]`  | Create a conversation branch to try a different direction               |
| `/fork [prompt]`  | Copy current conversation into a new background session                 |
| `/exit`           | Exit the CLI (alias: `/quit`)                                           |

### Model & Configuration
| Command                   | Description                                                         |
|---------------------------|---------------------------------------------------------------------|
| `/model [model]`          | Switch the AI model and save as default                             |
| `/effort [level\|auto]`   | Set model effort level (low, medium, high, xhigh, max, ultracode)   |
| `/config [key=value ...]` | Adjust theme, model, output style, preferences (alias: `/settings`) |
| `/advisor [model\|off]`   | Enable/disable advisor tool for guidance                            |
| `/fast [on\|off]`         | Toggle fast mode                                                    |

### Context & Memory
| Command                   | Description                                                      |
|---------------------------|------------------------------------------------------------------|
| `/memory`                 | Edit CLAUDE.md memory files and manage auto-memory               |
| `/context [all]`          | Visualize current context usage as a colored grid                |
| `/compact [instructions]` | Free up context by summarizing conversation                      |
| `/btw [question]`         | Ask a quick side question without adding to conversation history |

### Code Review & Quality
| Command                                             | Description                                                          |
|-----------------------------------------------------|----------------------------------------------------------------------|
| `/code-review [level] [--fix] [--comment] [target]` | Review diff for bugs and cleanup                                     |
| `/security-review`                                  | Check diff for security vulnerabilities                              |
| `/verify`                                           | Verify code correctness                                              |
| `/simplify`                                         | Review changed code for reuse/simplification/efficiency, apply fixes |
| `/review`                                           | Review a GitHub pull request                                         |

### Workflow & Collaboration
| Command                    | Description                                                 |
|----------------------------|-------------------------------------------------------------|
| `/batch <instruction>`     | Orchestrate large-scale changes across codebase in parallel |
| `/plan`                    | Switch into plan mode before large changes                  |
| `/goal [condition\|clear]` | Set a goal; Claude keeps working until met                  |
| `/tasks`                   | List current session's background work including subagents  |
| `/background [prompt]`     | Detach session to run as background agent (alias: `/bg`)    |
| `/subtask`                 | Hand side task to subagent that reports back                |
| `/agents`                  | Create, edit, and manage custom subagents                   |

### Debugging & Troubleshooting
| Command                | Description                                                    |
|------------------------|----------------------------------------------------------------|
| `/debug [description]` | Enable debug logging and troubleshoot issues                   |
| `/doctor`              | Run setup checkup, diagnose and fix issues (alias: `/checkup`) |
| `/rewind`              | Roll code and conversation back to a checkpoint                |
| `/heapdump`            | Write heap snapshot for diagnosing high memory usage           |

### View & Output
| Command                   | Description                                                   |
|---------------------------|---------------------------------------------------------------|
| `/diff`                   | Open interactive diff viewer showing uncommitted changes      |
| `/copy [N]`               | Copy last (or Nth-latest) assistant response to clipboard     |
| `/export [filename]`      | Export conversation as plain text                             |
| `/focus`                  | Toggle focus view (shows only last prompt and final response) |
| `/color [color\|default]` | Set prompt bar color for session                              |

### Tools & Integration
| Command                             | Description                                                     |
|-------------------------------------|-----------------------------------------------------------------|
| `/mcp [reconnect\|enable\|disable]` | Manage MCP server connections                                   |
| `/ide`                              | Manage IDE integrations and show status                         |
| `/hooks`                            | View hook configurations for tool events                        |
| `/permissions`                      | Set approval rules for commands                                 |
| `/init`                             | Initialize project with a CLAUDE.md guide                       |
| `/plugin`                           | Manage plugins and marketplaces (install/update/enable/disable) |
| `/terminal-setup`                   | Install Shift+Enter multiline binding for your terminal         |
| `/keybindings-help`                 | Guidance for customizing `~/.claude/keybindings.json`           |
| `/voice [tap]`                      | Configure/toggle voice dictation input                          |
| `/recap`                            | Generate a session recap on demand                              |

### API & Development
| Command                                         | Description                                             |
|-------------------------------------------------|---------------------------------------------------------|
| `/claude-api [migrate\|managed-agents-onboard]` | Load Claude API / Anthropic SDK reference material      |
| `/design-sync [hint]`                           | Convert React design system and upload to Claude Design |
| `/design-login`                                 | Authorize design-system access for `/design-sync`       |

### Advanced Features
| Command                     | Description                                                                                                                    |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| `/deep-research <question>` | Fan out web searches and synthesize a cited report                                                                             |
| `/dataviz [request]`        | Design guidance for charts, graphs, dashboards                                                                                 |
| `/loop [interval] [prompt]` | Run a prompt repeatedly on a schedule (alias: `/proactive`)                                                                    |
| `/schedule`                 | Create/manage cron-scheduled cloud agents ("routines")                                                                         |
| `/autofix-pr [prompt]`      | Spawn a session that watches a PR and pushes fixes on CI failure                                                               |
| `/fewer-permission-prompts` | Scan transcripts and create allowlist to reduce prompts                                                                        |
| `/_remote-workflow`         | Internal/remote-trigger workflow entry point (undocumented publicly; surfaces when remote-trigger integrations are configured) |

### Account & Support
| Command              | Description                                          |
|----------------------|------------------------------------------------------|
| `/login`             | Sign in to Anthropic account                         |
| `/logout`            | Sign out from Anthropic account                      |
| `/usage`             | Show token usage and costs (alias: `/cost`)          |
| `/usage-credits`     | Manage usage credits for subscription                |
| `/status`            | Show session status                                  |
| `/feedback [report]` | Send product feedback                                |
| `/bug [report]`      | Report a bug or share conversation (alias: `/share`) |
| `/help`              | Show help and available commands                     |

### Platforms
| Command           | Description                                                              |
|-------------------|--------------------------------------------------------------------------|
| `/desktop`        | Continue session in Claude Code Desktop app (alias: `/app`)              |
| `/mobile`         | Show QR code to download Claude mobile app (aliases: `/ios`, `/android`) |
| `/chrome`         | Configure Claude in Chrome settings                                      |
| `/remote-control` | Continue local session from another device                               |
| `/teleport`       | Pull a web session into the terminal                                     |

---

## 2. Skill/plugin commands (from your actual installed plugins)

These run via the same `/name` syntax and only exist because you have the plugin
installed — they won't appear on a bare Claude Code install.

| Command                                       | Plugin               | Description                                                               |
|-----------------------------------------------|----------------------|---------------------------------------------------------------------------|
| `/artifact-design`                            | built-in             | Design guidance/fundamentals for Artifacts                                |
| `/artifact-capabilities`                      | built-in             | Runtime capabilities available to a published Artifact page               |
| `/claude-md-management:claude-md-improver`    | claude-md-management | Audit and improve CLAUDE.md files against templates                       |
| `/claude-md-management:revise-claude-md`      | claude-md-management | Update CLAUDE.md with learnings from the current session                  |
| `/hookify:hookify`                            | hookify              | Create hooks to prevent unwanted behaviors from conversation analysis     |
| `/hookify:configure`                          | hookify              | Enable/disable hookify rules interactively                                |
| `/hookify:list`                               | hookify              | List all configured hookify rules                                         |
| `/hookify:help`                               | hookify              | Get help with the hookify plugin                                          |
| `/hookify:writing-rules`                      | hookify              | Guidance on hookify rule syntax and patterns                              |
| `/frontend-design:frontend-design`            | frontend-design      | Aesthetic direction, typography, distinctive UI design                    |
| `/ponytail:ponytail`                          | ponytail             | Forces the simplest/laziest working solution (this session's active mode) |
| `/ponytail:ponytail-review`                   | ponytail             | Code review focused exclusively on over-engineering                       |
| `/ponytail:ponytail-audit`                    | ponytail             | Whole-repo audit for over-engineering / bloat                             |
| `/ponytail:ponytail-debt`                     | ponytail             | Harvest `ponytail:` comments into a debt ledger                           |
| `/ponytail:ponytail-gain`                     | ponytail             | Show ponytail's measured impact as a scoreboard                           |
| `/ponytail:ponytail-help`                     | ponytail             | Quick-reference card for all ponytail modes/commands                      |
| `/superpowers:brainstorming`                  | superpowers          | Explore intent/requirements/design before implementation                  |
| `/superpowers:writing-plans`                  | superpowers          | Turn a spec into a multi-step written plan                                |
| `/superpowers:executing-plans`                | superpowers          | Execute a written plan with review checkpoints                            |
| `/superpowers:subagent-driven-development`    | superpowers          | Execute plans via independent subagent tasks in-session                   |
| `/superpowers:dispatching-parallel-agents`    | superpowers          | Fan out 2+ independent tasks to parallel agents                           |
| `/superpowers:systematic-debugging`           | superpowers          | Structured approach before proposing bug fixes                            |
| `/superpowers:test-driven-development`        | superpowers          | Write tests before implementation                                         |
| `/superpowers:requesting-code-review`         | superpowers          | Request review after completing a task/feature                            |
| `/superpowers:receiving-code-review`          | superpowers          | Verify and apply review feedback rigorously                               |
| `/superpowers:finishing-a-development-branch` | superpowers          | Decide how to integrate finished work                                     |
| `/superpowers:using-git-worktrees`            | superpowers          | Set up isolated workspace via git worktree                                |
| `/superpowers:verification-before-completion` | superpowers          | Run verification commands before claiming success                         |
| `/superpowers:writing-skills`                 | superpowers          | Create/edit/verify new skills                                             |
| `/superpowers:using-superpowers`              | superpowers          | Bootstraps skill discovery (auto-invoked each session)                    |
| `/dataviz`                                    | built-in             | Guidance for charts/graphs/dashboards/data viz                            |
| `/update-config`                              | built-in             | Configure the harness via settings.json (permissions, env vars, hooks)    |
| `/keybindings-help`                           | built-in             | Customize `~/.claude/keybindings.json`                                    |
| `/simplify`                                   | built-in             | Reuse/simplify/efficiency pass on changed code                            |
| `/fewer-permission-prompts`                   | built-in             | Build a Bash/MCP allowlist from transcript history                        |
| `/loop`                                       | built-in             | Run a prompt/command on a recurring interval                              |
| `/schedule`                                   | built-in             | Create/manage scheduled cron cloud agents                                 |
| `/claude-api`                                 | built-in             | Claude API / Anthropic SDK reference                                      |
| `/claude-in-chrome`                           | built-in             | Automate Chrome (click, fill forms, screenshot, read console)             |
| `/run`                                        | built-in             | Launch and drive this project's app to verify a change                    |
| `/init`                                       | built-in             | Initialize a new CLAUDE.md with codebase docs                             |
| `/review`                                     | built-in             | Review a GitHub pull request                                              |
| `/security-review`                            | built-in             | Security review of pending changes on current branch                      |
| `/codebase-memory`                            | codebase-memory-mcp  | Knowledge-graph based code search/tracing tools                           |

Note: your pasted list cut off after `/claude-md-management:claude-md-improver` — the
table above is the complete set visible in this session's context, so it already
covers what you started pasting plus everything after it alphabetically. Paste the
rest if you had additional custom/private commands not shown here.

---

## 3. Keyboard shortcuts

### General controls
| Shortcut                       | What it does                                                           | Context                  |
|--------------------------------|------------------------------------------------------------------------|--------------------------|
| `Ctrl+C`                       | Interrupt running op; 2nd press (empty input) exits                    | Always                   |
| `Ctrl+D`                       | Exit session (2nd press within 800ms); deletes char if input non-empty | Always                   |
| `Esc`                          | Interrupt Claude / close dialog                                        | Always                   |
| `Esc Esc`                      | Clear input draft, or open rewind menu if input empty                  | Always                   |
| `Ctrl+L`                       | Redraw screen; double-tap within 2s runs `/clear`                      | Always                   |
| `Ctrl+O`                       | Toggle transcript viewer                                               | Always                   |
| `Ctrl+R`                       | Reverse search command history                                         | Always                   |
| `Ctrl+G` / `Ctrl+X Ctrl+E`     | Open prompt in `$EDITOR`                                               | Always                   |
| `Ctrl+V` / `Alt+V` (Win/WSL)   | Paste image from clipboard                                             | Always                   |
| `Ctrl+B`                       | Background a running Bash command/agent                                | During shell execution   |
| `Ctrl+T`                       | Toggle task checklist                                                  | Always                   |
| `Ctrl+S`                       | Stash/restore prompt text                                              | Always                   |
| `Ctrl+Z`                       | Suspend to shell (`fg` to resume)                                      | Unix only                |
| `Ctrl+X Ctrl+K`                | Stop all background subagents (press twice in 3s)                      | Subagents running        |
| `Shift+Tab` / `Alt+M`          | Cycle permission modes (default → acceptEdits → plan → …)              | Always                   |
| `Option+P` / `Alt+P`           | Switch model without clearing prompt                                   | Always                   |
| `Option+T` / `Alt+T`           | Toggle extended thinking                                               | v2.1.132+                |
| `Option+O` / `Alt+O`           | Toggle fast mode                                                       | Always                   |
| `Up`/`Down`, `Ctrl+P`/`Ctrl+N` | Move within multiline prompt, then navigate history                    | Always                   |
| `Left`/`Right`                 | Cycle dialog tabs                                                      | Permission dialogs/menus |

### Text editing
| Shortcut                  | What it does                        |
|---------------------------|-------------------------------------|
| `Ctrl+A` / `Ctrl+E`       | Move to start / end of current line |
| `Ctrl+K`                  | Delete to end of line               |
| `Ctrl+U`                  | Delete from cursor to line start    |
| `Ctrl+W`                  | Delete previous word                |
| `Ctrl+Y`                  | Paste last deletion                 |
| `Alt+Y` (after `Ctrl+Y`)  | Cycle paste history                 |
| `Alt+B` / `Alt+F`         | Move back / forward one word        |
| `Ctrl+_` / `Ctrl+Shift+-` | Undo last input edit                |

macOS note: `Alt+B/F/Y/P/T/O`/etc. require enabling "Option as Meta" in your terminal
(iTerm2: Profiles → Keys; Terminal.app: Preferences → Keyboard; VS Code:
`terminal.integrated.macOptionIsMeta`).

### Multiline input entry
| Method                                                                     | Shortcut                                         |
|----------------------------------------------------------------------------|--------------------------------------------------|
| Universal escape                                                           | `\` then `Enter`                                 |
| Any terminal                                                               | `Ctrl+J`                                         |
| Native (iTerm2, WezTerm, Ghostty, Kitty, Warp, Terminal, Windows Terminal) | `Shift+Enter`                                    |
| macOS with Option-as-Meta                                                  | `Option+Enter`                                   |
| VS Code/Cursor/Alacritty/Zed                                               | run `/terminal-setup` once to bind `Shift+Enter` |

### Quick-command input syntax
| Prefix            | What it does                                               |
|-------------------|------------------------------------------------------------|
| `/`               | Slash command or skill                                     |
| `!`               | Shell mode — run command directly, output added to session |
| `@`               | File path mention / autocomplete                           |
| `#`               | Add a note to memory (CLAUDE.md)                           |
| `:name:`          | Insert emoji shortcode (e.g. `:heart:` → ❤️)                |
| `?` (empty input) | Toggle shortcut help panel                                 |

### Vim editor mode (enable via `/config` → Editor mode)
| Category                        | Keys                                                                                                 |
|---------------------------------|------------------------------------------------------------------------------------------------------|
| Mode switch                     | `Esc` (→NORMAL), `i`/`I`/`a`/`A`/`o`/`O` (→INSERT), `v`/`V` (→VISUAL)                                |
| Navigation                      | `h j k l`, `w`/`e`/`b`, `0`/`$`/`^`, `gg`/`G`, `f{c}`/`F{c}`/`t{c}`/`T{c}`, `;`/`,`                  |
| Editing                         | `x`, `dd`, `D`, `dw`/`de`/`db`, `cc`/`C`/`cw`, `s`/`S`, `yy`/`yw`, `p`/`P`, `>>`/`<<`, `J`, `u`, `.` |
| Text objects (with `d`/`c`/`y`) | `iw`/`aw`, `iW`/`aW`, `i"`/`a"`, `i'`/`a'`, `i(`/`a(`, `i[`/`a[`, `i{`/`a{`                          |
| Visual mode                     | `d`/`x`, `y`, `c`/`s`, `p`, `r{c}`, `~`/`u`/`U`, `>`/`<`, `J`, `o`                                   |

Block-wise visual mode (`Ctrl+V`) is not supported. Rebind INSERT-mode escape (e.g.
`jj`) via `vimInsertModeRemaps` in `~/.claude/settings.json`.

### Transcript viewer (`Ctrl+O`)
| Key                    | Action                                            |
|------------------------|---------------------------------------------------|
| `?`                    | Toggle shortcut help panel                        |
| `{` / `}`              | Jump to previous/next user prompt                 |
| `[`                    | Dump conversation to scrollback for native search |
| `v`                    | Open conversation in `$VISUAL`/`$EDITOR`          |
| `q` / `Ctrl+C` / `Esc` | Exit transcript view                              |

### `/btw` overlay
| Key                   | Action                         |
|-----------------------|--------------------------------|
| `Space`/`Enter`/`Esc` | Dismiss                        |
| `Up`/`Down`           | Scroll answer                  |
| `Left`/`Right`        | Step between answers           |
| `c`                   | Copy answer as Markdown        |
| `f`                   | Fork into new session          |
| `x`                   | Clear earlier `/btw` exchanges |

All shortcuts are rebindable via `~/.claude/keybindings.json` (run `/keybindings-help`
for guidance); some are reserved and cannot be overridden.

---

## 4. Codex CLI — slash commands (for comparison)

OpenAI's equivalent tool. Most are CLI/TUI (terminal); a few are platform- or
context-specific as noted. Source: official OpenAI docs (learn.chatgpt.com/docs/developer-commands).

| Command                  | Description                                                    | Scope            |
|--------------------------|----------------------------------------------------------------|------------------|
| `/permissions`           | Set what Codex can do without asking first                     | CLI              |
| `/ide`                   | Include open files, current selection, and other IDE context   | IDE              |
| `/keymap`                | Remap TUI keyboard shortcuts                                   | CLI              |
| `/vim`                   | Toggle Vim mode for the composer                               | CLI              |
| `/setup-default-sandbox` | Set up the elevated agent sandbox                              | Windows CLI only |
| `/sandbox-add-read-dir`  | Grant sandbox read access to additional directories            | Windows CLI only |
| `/agent`, `/subagents`   | Switch the active agent thread                                 | CLI              |
| `/apps`                  | Browse apps (connectors) and insert them into your prompt      | CLI              |
| `/plugins`               | Browse installed and discoverable plugins                      | CLI              |
| `/hooks`                 | View and manage lifecycle hooks                                | CLI              |
| `/clear`                 | Clear the terminal and start a fresh chat                      | CLI              |
| `/rename`                | Rename the current chat                                        | CLI              |
| `/archive`               | Archive the current session and exit Codex                     | CLI              |
| `/delete`                | Permanently delete the current session and exit Codex          | CLI              |
| `/compact`               | Summarize the visible chat to free tokens                      | CLI              |
| `/copy`                  | Copy the latest completed Codex output                         | CLI              |
| `/diff`                  | Show the Git diff, including untracked files                   | CLI              |
| `/exit`                  | Exit the CLI session                                           | CLI              |
| `/experimental`          | Toggle experimental features                                   | CLI              |
| `/approve`               | Approve one retry of a recent auto review denial               | CLI              |
| `/memories`              | Configure memory use and generation                            | CLI              |
| `/skills`                | Browse and use skills                                          | CLI              |
| `/import`                | Import Claude Code setup, project files, and recent chats      | CLI              |
| `/feedback`              | Send logs to the Codex maintainers                             | CLI              |
| `/init`                  | Generate an AGENTS.md scaffold in the current directory        | CLI              |
| `/logout`                | Sign out of Codex                                              | CLI              |
| `/mcp`                   | List configured MCP tools                                      | CLI              |
| `/mention`               | Attach a file to the chat                                      | CLI              |
| `/model`                 | Choose the active model (and reasoning effort, when available) | CLI              |
| `/fast`                  | Toggle a Fast service tier when the model catalog exposes one  | CLI              |
| `/plan`                  | Switch to plan mode and optionally send a prompt               | CLI              |
| `/goal`                  | Set, edit, pause, resume, view, or clear a task goal           | CLI              |
| `/personality`           | Choose a communication style for responses                     | CLI              |
| `/ps`                    | Show background terminals and their recent output              | CLI              |

Desktop app additionally exposes: `/feedback`, `/mcp`, `/plan-mode`, `/review`, `/status`.
IDE extension additionally exposes: `/auto-context`, `/cloud`, `/cloud-environment`, `/feedback`, `/local`, `/review`, `/status`.

---

**Sources:** https://code.claude.com/docs/en/commands.md, https://code.claude.com/docs/en/interactive-mode.md, https://code.claude.com/docs/en/keybindings.md, plus this session's live skill/plugin listing; https://learn.chatgpt.com/docs/developer-commands (Codex).
