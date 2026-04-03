---
agent: JoomlaGen
description: "Base prompt template for Joomla tasks using the JoomlaGen workflow skill and Definition of Done closure criteria."
---

# JoomlaGen Base Prompt (Workflow)

Use the JoomlaGen agent for the following task:

[TASK]

Functional context:
- [BUSINESS OBJECTIVE]
- [EXACT SCOPE]
- [ADDITIONAL CONSTRAINTS]

Required workflow:
1. Read `.github/skills/core/architecture.md` and enforce highest-priority constraints.
2. Apply technical skills as needed by the task:
   - JS: `.github/skills/core/frontend-javascript.md`
   - Leaflet (if applicable): `.github/skills/projects/joomla/javascript-leaflet.md`
   - PHP: `.github/skills/projects/joomla/php.md`
   - CSS: `.github/skills/core/frontend-css.md`
   - Joomla: `.github/skills/projects/joomla/joomla.md`
   - JSON: `.github/skills/projects/joomla/joomla-data-json.md`
3. Validate with:
   - `.github/skills/core/review.md`
   - `.github/skills/core/testing.md`
4. Close only if `.github/skills/core/definition-of-done.md` is satisfied.

Implementation criteria:
- Minimal, safe, and Joomla MVC-consistent changes.
- No large structural changes without explicit approval.
- Allowed map libraries only (Leaflet and OpenStreetMap).
- No JS/CSS frameworks unless explicitly approved.

Expected deliverable:
- Brief change summary.
- Modified files list.
- Risks and limitations.
- Final DoD validation (pass/fail + reason).
