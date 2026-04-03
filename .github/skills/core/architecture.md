---
name: architecture
description: Global architectural rules, priorities, and mandatory project constraints.
---

# architecture.md

## 1. Goal

Define the project's **global rules, constraints, and architecture decisions**.
This document has **highest priority** over any other `skills.md` file.

---

## 2. Mandatory principles

* The system uses Joomla as the architectural core.

* The agent must **adapt to the existing system before modifying it**.

* Priority order:

  1. Security
  2. Consistency
  3. Maintainability
  4. Performance

* The agent **must not take large structural decisions**.

* Any structural change requires redefining relevant `skills.md` rules.

---

## 3. Decision hierarchy

If rules conflict, follow this order:

1. `architecture.md`
2. Project-specific rules
3. Joomla APIs
4. General best practices

---

## 4. Mandatory global rules

### 4.1 Joomla

* Use Joomla internal APIs whenever available

* Respect MVC

* Use overrides correctly

* Do not access the database directly if a Joomla API exists

* Do not break Joomla render flow

* Do not add logic outside the platform flow (hacks)

---

### 4.2 Database

#### Allowed use:

* Data reads
* Insertions for:

  * articles
  * menus
  * menu items

#### Rules:

* Always prioritize Joomla APIs
* Use SQL only if the API path is not viable

#### Deletion:

* Do not use SQL DELETE statements
* Use Joomla backend trash flow

#### Known risks:

* Direct SQL:

  * can bypass integrity rules
  * can create orphaned data
  * does not execute internal platform logic

---

### 4.3 JSON (geographic data)

* Read-only usage

* Location: `/data/`

* Generated from CSV

* Do not modify at runtime

* Do not treat as dynamic persistence layer

* Do not treat as relational database

---

### 4.4 JavaScript

* Vanilla JS is required
* ES Modules are allowed
* Modular structure is required

```plaintext
/js/
  core/
  map/
  ui/
```

* Do not use frameworks
* Do not use external libraries (except map stack)
* Do not use unstructured global scripts

---

### 4.5 Data loading

Required strategy:

| Case                     | Method |
| ------------------------ | ------ |
| Small critical data      | Inline |
| Large data payloads      | AJAX   |

Operational thresholds:

* Inline: up to 30 KB per payload, only if critical for first render.
* AJAX: required for payloads above 30 KB or non-critical first-render data.

* Do not inline large JSON payloads without explicit justification
* Do not duplicate data unnecessarily

---

### 4.6 CSS

* BEM is required

* Mobile-first

* Use CSS variables

* Do not use CSS frameworks without explicit project approval

* Do not use ambiguous or generic class names

* The system should evolve toward a **formal design system**

---

### 4.7 External libraries

Allowed:

* Leaflet
* OpenStreetMap

Forbidden:

* Google Maps
* JS frameworks
* Additional libraries without explicit approval

---

### 4.8 Build tools

* Do not use bundlers
* Do not add build pipelines
* Do not add external compilation tools

---

## 5. Security (critical)

The agent must treat all code as production-grade.

### Required:

* Data sanitization
* Output escaping
* Input validation
* XSS and CSRF protection

### Forbidden:

* Unsanitized SQL
* Unescaped HTML output
* Trusting user input

---

## 6. Adaptation to existing code

The agent must:

* analyze current structure
* respect existing patterns
* improve without breaking behavior

Forbidden:

* full rewrites
* imposing architecture without context

---

## 7. Anti-patterns (forbidden)

### Forbidden external libraries

```js
import axios from 'axios'
```

---

### Unnecessary direct SQL

```php
$db->setQuery("SELECT * FROM #__content");
```

(If a Joomla API exists, use it.)

---

### JSON used as a database

```js
data.push(newItem)
saveToFile(data)
```

---

### Unstructured JS

```html
<script>
var data = ...
</script>
```

---

### Unstructured CSS

```css
.red-box {
  color: red;
}
```

---

## 8. Correct examples

### Safe PHP

```php
$data = json_decode(file_get_contents($path), true);
```

---

### Safely embedded JSON

```php
<script type="application/json" id="map-data">
<?= json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP) ?>
</script>
```

---

### Modular JS

```js
import { loadMap } from './map/map.js';
```

---

### BEM CSS

```css
.card__title--highlight {
  color: var(--color-primary);
}
```

---

## 9. Expected agent behavior

The agent must:

* follow strict rules
* justify exceptions
* prioritize security
* avoid implicit architecture decisions

The agent must not:

* improvise architecture
* introduce new dependencies without approval
* break existing system behavior

---

## 10. Final rule

If an action:

* breaks Joomla flow
* breaks security
* breaks consistency

it is forbidden, even if it works technically.
