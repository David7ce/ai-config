# AI Agent Stack

The **minimum** environment to call and execute AI coding agents (Claude Code, opencode, Codex, Aider, Cline, Continue) predictably across desktop OSes.

**Principle: optimize for predictability, not power.** Agents perform best where the environment matches their training data — POSIX shell, Unix paths, mainstream CLI tools — and where every OS behaves identically. Project-specific toolchains are *modules*, pulled in per project (see [AI Agent Modules](ai-agent-modules.md)); they are not part of this base.

---

## Base layer (every machine)

Five things. Nothing else is required to run an agent.

| Component       | Choice                              | Why                                           |
|-----------------|-------------------------------------|-----------------------------------------------|
| OS + shell      | Zsh/Bash everywhere                 | POSIX parity; Bash-first docs & training data |
| Package manager | the OS's native one (table below)   | reproducible, scriptable installs             |
| Core CLI        | `rg` `fd` `fzf` `jq` `git`          | the tools agents actually reach for           |
| Agent layer     | `opencode` / Claude Code (terminal) | run from project root, inherit shell + tools  |
| Layout          | `~/projects/<name>` + `AGENTS.md`   | one path scheme, one shared instruction file  |

### OS + shell

Zsh/Bash as the primary shell on every platform. On Windows use **WSL2 (Ubuntu)** — not PowerShell — which gives ~95% of the Linux experience while keeping native Windows apps. Reserve PowerShell/CMD for Windows-only tasks.

Unix paths (`~/projects/x`) cause fewer agent errors than Windows paths (`C:\Users\...\projects\x`).

Zsh plugins: `zsh-autosuggestions`, `zsh-syntax-highlighting`.

### Package manager

**Always install via the OS's native package manager** — never `curl | sh` when a packaged version exists. Reproducible and upgradable, which agents handle far better than manual setup.

| OS      | Native package manager                                                        |
|---------|-------------------------------------------------------------------------------|
| macOS   | `brew`                                                                        |
| Windows | `winget` (native apps) · `apt`/`brew` (inside WSL2)                           |
| Linux   | per distro: `apt` · `dnf` · `pacman`+`yay`/`paru` · `zypper` · `xbps` · `nix` |
| FreeBSD | `pkg` (+ ports)                                                               |

Linux is one platform; only the manager differs by distro. **Agent rule: detect the OS/distro, then use its manager — don't assume `apt`.**

### Core CLI

| Purpose     | Tool           | Replaces |
|-------------|----------------|----------|
| Search code | `ripgrep` (rg) | grep     |
| Find files  | `fd`           | find     |
| Fuzzy find  | `fzf`          | —        |
| JSON        | `jq`           | —        |
| List/view   | `eza`, `bat`   | ls, cat  |
| Jump dirs   | `zoxide` (`z`) | cd       |
| Git TUI     | `lazygit`      | —        |

### Agent layer

Same environment underneath; two interchangeable surfaces:

- **Terminal** — `opencode`, Claude Code, Codex, Aider. Preferred for agentic multi-file work; run inside Zsh/WSL2.
- **Editor** — VS Code with Claude Code, Cline, or Continue.

Share one **`AGENTS.md`** across all of them (opencode, Claude Code, and Codex all read it) so every agent gets identical instructions. Keep per-project model/provider config in the repo (e.g. `opencode.json`) for reproducibility.

```bash
brew install sst/tap/opencode    # or the OS's native manager
opencode                          # interactive, from ~/projects/<project>
```

### Layout

One identical tree on every OS so agents never relearn it:

```text
~/projects/<name>      # work lives here
~/projects/<name>/AGENTS.md   # shared agent instructions
```

---

## AGENTS.md base block

Drop into each project's `AGENTS.md` (or the agent's system prompt):

```text
Environment assumptions:
- Primary shell: Zsh/Bash (macOS/Linux/FreeBSD, or Windows via WSL2).
- Prefer POSIX commands; avoid PowerShell unless required.
- Install via the OS's native package manager (brew/winget/apt/dnf/pacman/zypper/pkg).
  Detect the OS/distro first; do not assume apt.
- Projects live under ~/projects; use relative paths when possible.
- Prefer: rg over grep, fd over find, jq for JSON, git CLI.
```

---

## Optional modules

Project-specific toolchains (web, data, mobile/desktop, containers/ops) live in **[AI Agent Modules](ai-agent-modules.md)** — install per project, not as part of this base.
