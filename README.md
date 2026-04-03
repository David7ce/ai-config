# AI Copilot Config

A small repository with examples and a recommended layout for configuring GitHub Copilot and custom agents in VS Code.

## Purpose

- Provide simple, reusable conventions and examples for Copilot agents and skills.
- Help teams produce consistent AI-assisted development results.

## Contents (recommended)

- `.github/instructions/` — global instructions and policies
- `.github/skills/` — agent skills (core and project-specific)
- `.github/agents/` — custom agent definitions
- `.vscode/mcp.json` — MCP server configuration
- `.github/hooks/` — automation and checks (format, lint, etc.)

## Quick workflow

1. Add global instructions in `.github/instructions/`.
2. Add core skills in `.github/skills/core/`.
3. Add project skills in `.github/skills/projects/`.
4. Create agents in `.github/agents/` for specific roles.
5. Configure MCP servers in `.vscode/mcp.json` and add hooks as needed.

Suggested layout example

```sh
.github/skills/
├── core/
└── projects/
```

## Model guidance

- Choose models by task: code generation (code-focused models), reviews (reasoning-focused models), long-context tasks (large-context models).

## Resources

- VS Code Copilot docs: <https://code.visualstudio.com/docs/copilot/overview>
