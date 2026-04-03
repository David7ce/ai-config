---
name: joomlagen-workflow
description: "Use when: Joomla implementation, refactor, review, or testing tasks in this repository. Loads architecture first, then technical skills by change type, then review/testing, and closes only with Definition of Done."
argument-hint: "Describe the Joomla task (example: create component view, refactor map JS module, adjust template styles, harden form validation)."
user-invocable: true
---

# JoomlaGen Workflow Skill

Use this skill for Joomla development, refactoring, review, or testing tasks in this workspace.

## Goal

Apply a consistent, secure, and verifiable workflow by composing the existing documents in [core](../core) and [projects/joomla](../projects/joomla).

## Required execution flow

1. Read [architecture.md](../core/architecture.md) first and enforce its constraints as highest priority.
2. Load technical skills based on task scope:
   - JavaScript: [frontend-javascript.md](../core/frontend-javascript.md)
   - CSS: [frontend-css.md](../core/frontend-css.md)
   - Joomla platform rules: [joomla.md](../projects/joomla/joomla.md)
   - PHP backend: [php.md](../projects/joomla/php.md)
   - Leaflet/OpenStreetMap (when map features are touched): [javascript-leaflet.md](../projects/joomla/javascript-leaflet.md)
   - Data JSON rules (when data files or map payloads are touched): [joomla-data-json.md](../projects/joomla/joomla-data-json.md)
3. Implement minimal, modular, low-risk changes; avoid structural changes unless explicitly approved.
4. Run validation with:
   - [review.md](../core/review.md)
   - [testing.md](../core/testing.md)
5. Close only if [definition-of-done.md](../core/definition-of-done.md) is fully satisfied.

## Security and consistency guardrails

- Keep strict alignment with Joomla MVC and repository conventions.
- Do not introduce new dependencies unless explicitly requested.
- For map functionality, use only Leaflet and OpenStreetMap.
- Prioritize small, testable, and reversible changes.

## Expected input

Always include:

- business/functional objective
- exact change scope (file, module, component)
- constraints (performance, security, UI, compatibility)

## Expected output

- concise change summary
- modified files list
- technical and functional validation status
- risks, limitations, and next steps when relevant
