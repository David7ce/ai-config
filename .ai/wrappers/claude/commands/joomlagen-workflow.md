---
description: "Use when: Joomla implementation, refactor, review, or testing tasks. Full workflow in .ai/workflows/joomlagen-workflow.md."
---

# JoomlaGen Workflow

Use this workflow for Joomla development, refactoring, review, or testing tasks.

## Goal

Apply a consistent, secure, and verifiable workflow by composing skill documents in `.ai/skills/core` and `.ai/skills/projects/joomla`.

## Required execution flow

1. Read `.ai/skills/core/architecture.md` first and enforce its constraints as highest priority.
2. Load technical skills based on task scope:
   - JavaScript: `.ai/skills/core/frontend-javascript.md`
   - CSS: `.ai/skills/core/frontend-css.md`
   - Joomla platform rules: `.ai/skills/projects/joomla/joomla.md`
   - PHP backend: `.ai/skills/projects/joomla/php.md`
   - Leaflet/OpenStreetMap (when map features are touched): `.ai/skills/projects/joomla/javascript-leaflet.md`
   - Data JSON rules (when data files or map payloads are touched): `.ai/skills/projects/joomla/joomla-data-json.md`
3. Implement minimal, modular, low-risk changes; avoid structural changes unless explicitly approved.
4. Run validation with `.ai/skills/core/review-checklist.md` and `.ai/skills/core/testing.md`.
5. Close only if `.ai/skills/core/definition-of-done.md` is fully satisfied.

## Security and consistency guardrails

- Keep strict alignment with Joomla MVC and repository conventions.
- Do not introduce new dependencies unless explicitly requested.
- For map functionality, use only Leaflet and OpenStreetMap.
- Prioritize small, testable, and reversible changes.

## Expected input

- Business/functional objective
- Exact change scope (file, module, component)
- Constraints (performance, security, UI, compatibility)

## Expected output

- Concise change summary
- Modified files list
- Technical and functional validation status
- Risks, limitations, and next steps when relevant
