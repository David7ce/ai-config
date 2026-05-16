---
name: css
description: Project CSS standards with BEM, mobile-first, and component-based organization.
---

# frontend-css.md

## 1. Goal

Define CSS development rules for templates and overrides, ensuring consistency, maintainability, and compatibility with BEM and mobile-first design.

---

## 2. Mandatory principles

* BEM is required (`block__element--modifier`)
* Mobile-first approach
* Use CSS variables (`--color-primary`, `--spacing-lg`)
* Keep nesting simple and logical
* Do not use CSS frameworks without explicit project approval
* Do not use generic or ambiguous class names

---

## 3. CSS organization

```plaintext
/css/
  core/
  layout/
  components/
  pages/
```

* Do not mix global styles with component-specific styles
* Do not duplicate styles unnecessarily

---

## 4. Anti-patterns

* Indiscriminate use of `!important`
* Duplicated classes
* Mixing BEM with generic classes
* Inline HTML styles except for critical cases

---

## 5. Correct examples

```css
.card__title--highlight {
  color: var(--color-primary);
  font-size: var(--font-lg);
}

@media (max-width: 768px) {
  .card__title { font-size: var(--font-md); }
}
```
