---
name: astro
description: Development rules for Astro projects — static generation, content collections, routing, and component design.
---

# astro.md

## 1. Goal

Define guidelines for working on Astro projects while reusing the shared `core` skills base.

---

## 2. General principles

- Prioritize static generation (`output: 'static'`) when interactivity is not needed.
- Keep components small and content-oriented; one responsibility per component.
- Avoid unnecessary complexity in client hydration.
- Follow the core git and documentation conventions.

---

## 3. Content collections

- Define collections with explicit schemas using `z` (Zod).
- Keep frontmatter fields consistent across all entries in a collection.
- Avoid metadata duplication across pages — centralize shared fields in the schema default.
- Use `getCollection()` for all collection queries; do not read files directly.

---

## 4. Routing

- Keep slugs predictable and SEO-friendly: lowercase, hyphen-separated, no trailing slashes.
- Centralize dynamic route helpers (e.g. `getStaticPaths`) in a single location per route.
- Validate dynamic routes with explicit `fallback` or `404` behavior.
- Do not hardcode paths that should be generated from collection data.

---

## 5. Performance and hydration

- Default to no JS on the client — only hydrate when interaction is required.
- Use hydration directives intentionally:
  - `client:load` — only when needed immediately on page load
  - `client:idle` — for non-critical interactive components
  - `client:visible` — for below-the-fold components
- Avoid loading heavy JS on pages that don't need it.
- Prefer `.astro` components over framework components (React, Vue, etc.) when possible.

---

## 6. Anti-patterns

- Inlining large data payloads in frontmatter
- Duplicating content across collection entries
- Using `client:load` on every component by default
- Mixing routing logic into content files
