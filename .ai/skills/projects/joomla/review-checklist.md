---
name: review-checklist
description: Technical review checklist to validate architecture, security, and quality before approval.
---

# review-checklist.md

## 1. Goal

Rules for reviewing code and detecting errors or inconsistencies.

---

## 2. Principles

* Follow `architecture.md` and the corresponding technical skills
* Review modularity, security, data integrity, and naming consistency
* Do not approve code that violates critical rules

---

## 3. Required checklist

* [ ] Variables and functions modularized
* [ ] Native JS (vanilla) and ES Modules
* [ ] JSON used in read-only mode
* [ ] Correct use of Joomla APIs
* [ ] Safe override structure
* [ ] CSS BEM
* [ ] Basic SEO applied
* [ ] ACL respected
* [ ] No unapproved external libraries

---

## 4. Review closure

* Confirm `definition-of-done.md` before approval

---

## 5. Anti-patterns

* Mixing responsibilities in one module
* Global variables
* Unnecessary inline data
* Unnecessary direct SQL

---

## 6. Review example

> JS file mixing UI and map logic in one place → fail  
> Modular JS file with import/export and proper fetch flow → pass
