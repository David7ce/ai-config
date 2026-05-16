---
name: joomlagen-workflow
description: "Use when: Joomla implementation, refactor, review, or testing tasks. Full workflow in .ai/workflows/joomlagen-workflow.md."
argument-hint: "Describe the Joomla task (example: create component view, refactor map JS module, adjust template styles, harden form validation)."
user-invocable: true
---

# JoomlaGen Workflow (GitHub Copilot skill)

Full workflow definition: `.ai/workflows/joomlagen-workflow.md`.

## Required execution flow

1. Read `.ai/skills/core/architecture.md` first — highest priority.
2. Load technical skills based on task scope from `.ai/skills/core/` and `.ai/skills/projects/joomla/`.
3. Implement minimal, modular, low-risk changes.
4. Validate with `.ai/skills/core/review.md` and `.ai/skills/core/testing.md`.
5. Close only if `.ai/skills/core/definition-of-done.md` is fully satisfied.
