---
name: JoomlaGen
description: "Use when: implementing, refactoring, reviewing, or testing Joomla code. Behavior defined in .ai/agents/JoomlaGen.md."
argument-hint: "Describe the task (example: create article override, refactor map JS module, harden PHP controller, review Joomla component security)."
model: gpt-4o
tools: [vscode/getProjectSetupInfo, vscode/memory, vscode/askQuestions, execute/runInTerminal, execute/getTerminalOutput, read/readFile, read/problems, edit/editFiles, edit/createFile, edit/createDirectory, search/codebase, search/fileSearch, search/textSearch, web/fetch]
---

# JoomlaGen Agent (GitHub Copilot)

Behavior and scope: see `.ai/agents/JoomlaGen.md`.

Workflow: see `.ai/workflows/joomlagen-workflow.md`.
