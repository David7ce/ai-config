---
name: workflow
description: Recommended workflow to analyze, implement, validate, and close tasks.
---

# workflow.md

## 1. Goal

Workflow rules so the agent can implement, refactor, and review code consistently.

---

## 2. Principles

* Follow `architecture.md` first
* Adapt to existing code before changing it
* Validate security and consistency
* Do not introduce large structural changes without approval

---

## 3. Recommended process

1. Analyze existing structure
2. Apply the relevant technical module/skill
3. Load data with the required strategy (inline or AJAX)
4. Review security and SEO constraints
5. Document minimal changes in Markdown
6. Test functional behavior
7. Validate closure with `definition-of-done.md`

---

## 4. Versioning

* Keep all changes in Git
* Use clear and atomic commits
* Do not mix multiple features in one commit

---

## 5. Good practices

* Check naming consistency (BEM, JS modules)
* Reuse common functions
* Avoid duplicated data or logic
* Do not modify Joomla core without explicit approval
