---
name: documentation
description: Documentation standards for inline comments, change notes, and Markdown files.
---

# documentation.md

## 1. Goal

Keep documentation minimal, accurate, and co-located with the code it describes.

---

## 2. Inline comments

* Comment the **why**, not the what — well-named identifiers already explain what
* One short line maximum; avoid multi-line comment blocks
* Remove comments that describe removed or refactored code
* Do not add comments that restate the code literally

---

## 3. Change notes

* Document critical or non-obvious changes in a separate Markdown file alongside the modified files
* Include: what changed, why it changed, and any known risks
* Keep notes short — a few bullet points, not prose essays

---

## 4. Markdown files

* Use ATX headings (`#`, `##`, `###`), not underline style
* Keep line length under 120 characters
* Use fenced code blocks with a language identifier
* Do not duplicate content across multiple files

---

## 5. Anti-patterns

* Outdated comments describing old behavior
* Commented-out code left in the file
* Documentation that exists only to satisfy a checklist

---

## 6. Correct example

```php
// Joomla ACL check required before any write operation
if (!$user->authorise('core.edit', 'com_content')) {
    throw new \Exception(Text::_('JERROR_ALERTNOAUTHOR'), 403);
}
```
