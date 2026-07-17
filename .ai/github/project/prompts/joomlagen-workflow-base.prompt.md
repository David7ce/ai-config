---
command: /joomlagen-workflow
description: "Base prompt template for Joomla tasks using the JoomlaGen workflow and Definition of Done closure criteria."
---

# JoomlaGen Base Prompt (Workflow)

> Invoke via `/joomlagen-workflow` in Claude Code, or use the JoomlaGen agent.
> Replace bracketed placeholders before submitting.

Use the JoomlaGen agent for the following task:

[TASK]

Functional context:
- [BUSINESS OBJECTIVE]
- [EXACT SCOPE]
- [ADDITIONAL CONSTRAINTS]

Required workflow:
1. Read `.ai/skills/core/architecture.md` and enforce highest-priority constraints.
2. Apply technical skills as needed:
   - JS: `.ai/skills/core/frontend-javascript.md`
   - Leaflet (if applicable): `.ai/skills/projects/joomla/javascript-leaflet.md`
   - PHP: `.ai/skills/projects/joomla/php.md`
   - CSS: `.ai/skills/core/frontend-css.md`
   - Joomla: `.ai/skills/projects/joomla/joomla.md`
   - JSON: `.ai/skills/projects/joomla/joomla-data-json.md`
3. Validate with `.ai/skills/core/review.md` and `.ai/skills/core/testing.md`.
4. Close only if `.ai/skills/core/definition-of-done.md` is satisfied.

Expected deliverable:
- Brief change summary
- Modified files list
- Risks and limitations
- Final DoD validation (pass/fail + reason)
