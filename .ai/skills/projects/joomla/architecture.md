---
name: architecture
description: Global architectural rules, priorities, and mandatory project constraints.
---

# architecture.md

## 1. Goal

Define the project's **global rules, constraints, and architecture decisions**.
This document has **highest priority** over any other skill file.

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

* Any structural change requires redefining relevant skill rules.

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
* Insertions for articles, menus, menu items

#### Rules:

* Always prioritize Joomla APIs
* Use SQL only if the API path is not viable

#### Deletion:

* Do not use SQL DELETE statements
* Use Joomla backend trash flow

#### Known risks:

* Direct SQL can bypass integrity rules, create orphaned data, and skip internal platform logic

---

### 4.3 JSON (geographic data)

* Read-only usage
* Location: `/data/`
* Generated from CSV
* Do not modify at runtime
* Do not treat as dynamic persistence layer or relational database

---

### 4.4 JavaScript

* Vanilla JS is required; ES Modules are allowed; modular structure is required

```plaintext
/js/
  core/
  map/
  ui/
```

* Do not use frameworks, external libraries (except map stack), or unstructured global scripts

---

### 4.5 Data loading

| Case                | Method |
|---------------------|--------|
| Small critical data | Inline |
| Large data payloads | AJAX   |

* Inline: up to 30 KB per payload, only if critical for first render.
* AJAX: required for payloads above 30 KB or non-critical first-render data.

---

### 4.6 CSS

* BEM is required; mobile-first; use CSS variables
* Do not use CSS frameworks without explicit project approval
* Do not use ambiguous or generic class names

---

### 4.7 External libraries

Allowed: Leaflet, OpenStreetMap  
Forbidden: Google Maps, JS frameworks, additional libraries without explicit approval

---

### 4.8 Build tools

* Do not use bundlers, build pipelines, or external compilation tools

---

### 4.9 Path conventions (critical)

* All file paths must be **relative to the project root** — never absolute.
* Forbidden: `C:\Users\...`, `/home/user/...`, `D:\Workspaces\...`, or any path anchored to a host machine.
* Exception requires explicit user approval before acting — do not assume.

---

### 4.10 Runtime environment (critical)

* All code execution and commands must run inside a **containerized or sandboxed environment**.
* Forbidden: running scripts, installs, or builds directly on the host system without authorization.
* Use the project's devcontainer or Docker setup. If none exists, ask the user before executing.

---

## 5. Security (critical)

### Required:

* Data sanitization, output escaping, input validation, XSS and CSRF protection

### Forbidden:

* Unsanitized SQL, unescaped HTML output, trusting user input

---

## 6. Anti-patterns (forbidden)

```js
import axios from 'axios'            // forbidden external library
```

```php
$db->setQuery("SELECT * FROM #__content");  // unnecessary direct SQL
```

```js
data.push(newItem); saveToFile(data)  // JSON used as a database
```

---

## 7. Correct examples

```php
$data = json_decode(file_get_contents($path), true);
```

```php
<script type="application/json" id="map-data">
<?= json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP) ?>
</script>
```

```js
import { loadMap } from './map/map.js';
```

```css
.card__title--highlight { color: var(--color-primary); }
```

---

## 8. Final rule

If an action breaks Joomla flow, breaks security, or breaks consistency — it is forbidden, even if it works technically.
