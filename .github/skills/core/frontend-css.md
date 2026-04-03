---
name: css
description: Project CSS standards with BEM, mobile-first, and component-based organization.
---

# frontend-css.md

## 1. Goal

Define CSS development rules for templates and overrides, ensuring:

* consistency
* maintainability
* compatibility with BEM and mobile-first design

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

* Keep files separated by component or feature
* Preferred structure:

```plaintext id="css1"
/css/
  core/
  layout/
  components/
  pages/
```

* Do not mix global styles with component-specific styles
* Do not duplicate styles unnecessarily

---

## 4. Style and naming

* Use clear and descriptive class names
* Avoid confusing abbreviations
* Use variables for colors, sizes, and spacing
* Keep media queries clear and consistent

---

## 5. Anti-patterns

* Indiscriminate use of `!important`
* Duplicated classes
* Mixing BEM with generic classes
* Inline HTML styles except for critical cases

---

## 6. Correct examples

### 6.1 Simple BEM

```css id="css2"
.card__title--highlight {
  color: var(--color-primary);
  font-size: var(--font-lg);
}
```

### 6.2 Media query

```css id="css3"
@media (max-width: 768px) {
  .card__title {
    font-size: var(--font-md);
  }
}
```

---

## 7. Project adaptation

* Review existing CSS before adding new rules
* Follow folder hierarchy
* Keep consistency with JS and HTML
