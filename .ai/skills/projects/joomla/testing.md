---
name: testing
description: Functional and security testing strategy/checklist for critical features.
---

# testing.md

## 1. Goal

Define required tests and validation for critical functionality.

---

## 2. Principles

* Test forms (validation and submission)
* Test map behavior (filters, search, clustering)
* Test PDF generation flows
* Validate JSON and data integrity
* Do not ignore rendering errors

---

## 3. Strategy

* Manual testing with predefined cases
* JS automation where critical and feasible
* Document failures in Markdown
* Do not assume functionality without tests

---

## 4. Checklist

* [ ] Forms work (JS and server-side validation)
* [ ] Maps render correctly
* [ ] Filters apply correctly
* [ ] PDF generation works correctly
* [ ] Security validated (XSS, CSRF)
* [ ] Joomla integration remains intact

---

## 5. Testing closure

* Confirm `definition-of-done.md` before marking the task as complete

---

## 6. Anti-patterns

* Skipping validations
* Modifying data without verification
* Ignoring console errors
