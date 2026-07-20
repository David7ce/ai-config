---
title: Security Review
description: "Use when: auditing code for security vulnerabilities (XSS, CSRF, SQL, ACL) in Joomla PHP + vanilla JS."
---

# Security Review Workflow

Run a focused security review of the current change or specified files.

## Scope

Check for the most common vulnerabilities in this stack (Joomla PHP + vanilla JS).

## Steps

1. **Input validation** — all user-supplied values sanitized before use
2. **Output escaping** — all dynamic values escaped before rendering in HTML, JS, or SQL
3. **SQL safety** — no raw string interpolation in queries; Joomla query builder used correctly
4. **XSS** — no unescaped user data in HTML output or JS assignments
5. **CSRF** — form tokens present on all state-changing forms (`JHtml::_('form.token')`)
6. **ACL** — `$user->authorise()` called before any write or privileged read
7. **File access** — no user-controlled paths used in `file_get_contents`, `include`, or `require`
8. **JSON output** — `json_encode` uses `JSON_HEX_TAG | JSON_HEX_AMP` flags when embedding in HTML
9. **JS globals** — no sensitive data exposed on `window` object
10. **Dependencies** — no unapproved external libraries introduced

## Output

- Risk level per finding: Critical / High / Medium / Low
- File and line reference for each issue
- Recommended fix
- Overall verdict: safe to merge / needs fixes
