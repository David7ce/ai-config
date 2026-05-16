---
name: git
description: Git workflow conventions for atomic commits, branching, and change hygiene.
---

# git.md

## 1. Goal

Define git conventions to keep history readable, changes reversible, and reviews easy.

---

## 2. Commit rules

* Write commits in imperative mood: `Add`, `Fix`, `Remove`, `Refactor`
* One logical change per commit — do not mix features and fixes
* Keep the subject line under 72 characters
* Reference the affected module or file when helpful: `Fix: escape output in article override`

---

## 3. Branching

* Work on feature branches, never directly on `main`
* Name branches by type and scope: `fix/article-override-xss`, `feat/map-clustering`
* Delete branches after merging

---

## 4. What to stage

* Stage only files relevant to the current change
* Do not commit `.env`, credentials, build artifacts, or large binaries
* Review the diff before committing

---

## 5. Anti-patterns

* Mixing unrelated changes in one commit
* Vague messages: `fix`, `update`, `changes`
* Committing generated or compiled files
* Force-pushing to shared branches

---

## 6. Correct examples

```sh
git commit -m "Fix: escape HTML output in default.php article override"
git commit -m "Add: lazy-load AJAX strategy for municipios.json"
git commit -m "Refactor: split map.js into markers.js and layers.js"
```
