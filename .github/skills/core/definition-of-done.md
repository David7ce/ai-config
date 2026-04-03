---
name: definition-of-done
description: Mandatory criteria required to consider a task complete and approvable.
---

# definition-of-done.md

## 1. Goal

Define a single closure standard for AI-implemented tasks in this Joomla project.

---

## 2. Definition of Done (mandatory)

A task is complete only if all of the following are satisfied:

1. Architecture respected
   - Follows `architecture.md`
   - Introduces no unauthorized structural changes

2. Security validated
   - Inputs validated and outputs escaped
   - No unsafe SQL
   - XSS and CSRF risks covered

3. Joomla integration correct
   - Internal Joomla APIs prioritized
   - MVC and overrides respected
   - ACL and multilingual behavior not degraded

4. Frontend consistency
   - Modular JS (no globals)
   - CSS with BEM and mobile-first approach
   - No unapproved external libraries

5. Data and performance
   - JSON treated as read-only
   - Inline/AJAX strategy applied with defined thresholds
   - No duplicated payloads or avoidable render blocking

6. Verifiable quality
   - `review.md` checklist completed
   - `testing.md` checklist executed
   - Critical changes documented in Markdown

---

## 3. Final rule

If any DoD point fails, the task is not considered closed.
