# JoomlaGen Workflow

Use this workflow for Joomla development, refactoring, review, or testing tasks.

## Goal

Apply a consistent, secure, and verifiable workflow by composing skill documents in `.ai/skills/core` and `.ai/skills/projects/joomla`.

## Required execution flow

1. Read [architecture.md](.ai/skills/core/architecture.md) first and enforce its constraints as highest priority.
2. Load technical skills based on task scope:
   - JavaScript: [frontend-javascript.md](.ai/skills/core/frontend-javascript.md)
   - CSS: [frontend-css.md](.ai/skills/core/frontend-css.md)
   - Joomla platform rules: [joomla.md](.ai/skills/projects/joomla/joomla.md)
   - PHP backend: [php.md](.ai/skills/projects/joomla/php.md)
   - Leaflet/OpenStreetMap (when map features are touched): [javascript-leaflet.md](.ai/skills/projects/joomla/javascript-leaflet.md)
   - Data JSON rules (when data files or map payloads are touched): [joomla-data-json.md](.ai/skills/projects/joomla/joomla-data-json.md)
3. Implement minimal, modular, low-risk changes; avoid structural changes unless explicitly approved.
4. Run validation with:
   - [review-checklist.md](.ai/skills/core/review-checklist.md)
   - [testing.md](.ai/skills/core/testing.md)
5. Close only if [definition-of-done.md](.ai/skills/core/definition-of-done.md) is fully satisfied.

## Security and consistency guardrails

- Keep strict alignment with Joomla MVC and repository conventions.
- Do not introduce new dependencies unless explicitly requested.
- For map functionality, use only Leaflet and OpenStreetMap.
- Prioritize small, testable, and reversible changes.

## Expected input

Always include:

- Business/functional objective
- Exact change scope (file, module, component)
- Constraints (performance, security, UI, compatibility)

## Expected output

- Concise change summary
- Modified files list
- Technical and functional validation status
- Risks, limitations, and next steps when relevant
