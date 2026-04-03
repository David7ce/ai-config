---
name: javascript
description: Rules for modular JavaScript (vanilla + ES modules), data loading, and performance.
---

# frontend-javascript.md

## 1. Goal

Define mandatory JavaScript rules for this project.

This document governs:

* code structure
* module organization
* data loading strategy
* interaction with Joomla and JSON

---

## 2. Mandatory principles

* JavaScript must be:

  * modular
  * predictable
  * maintainable

* Code must:

  * avoid duplication
  * avoid global logic
  * remain decoupled

---

## 3. Global rules

### 3.1 Technology baseline

* Use vanilla JavaScript
* Use ES Modules (`import/export`)
* Do not use frameworks (React, Vue, etc.)
* Do not use external libraries (except Leaflet)

---

### 3.2 Required structure

All JS should follow this structure:

```plaintext
/js/
  core/
  map/
  ui/
```

#### core/

Responsibility:

* utilities
* helpers
* data access
* shared logic

#### map/

Responsibility:

* map initialization
* layers
* markers
* clustering

#### ui/

Responsibility:

* user interaction
* forms
* filters
* search

---

### 3.3 Modularity

* Each file should have a single responsibility
* Use `export` and `import`
* Do not use global variables
* Do not duplicate logic across modules

---

## 4. Data loading (critical)

### Required strategy

| Case                   | Method |
| ---------------------- | ------ |
| Small or critical JSON | Inline |
| Large JSON             | AJAX   |

Operational thresholds:

* Inline: up to 30 KB per payload, only when it affects first render.
* AJAX: required for payloads above 30 KB or when not critical for first render.

---

### 4.1 Inline (PHP to JS)

Allowed only when:

* payload is small
* data is needed at startup

Correct example:

```html
<script type="application/json" id="map-data">
{...}
</script>
```

---

### 4.2 AJAX (recommended for large JSON)

* Use `fetch`
* Handle errors
* Avoid repeated unnecessary loads

Example:

```js
export async function loadData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Error loading data');
  return response.json();
}
```

---

### 4.3 Critical rules

* Do not load the same JSON multiple times
* Do not block first render with large JSON payloads
* Do not mix inline + AJAX without reason

---

## 5. PHP / Joomla integration

### 5.1 Data from PHP

* Use safely embedded JSON
* Do not concatenate JSON strings manually

---

### 5.2 Dynamic interaction

* Preference:

  * AJAX over inline manipulation

---

## 6. Map architecture (Leaflet)

### Required:

* separate responsibilities

#### Example:

```plaintext
/map/
  map.js        -> initialization
  markers.js    -> marker management
  filters.js    -> filter logic
  layers.js     -> base layers
```

---

### Rules:

* Do not mix map logic with UI logic
* Do not load data directly inside `map.js`
* Use reusable functions

---

## 7. Filters and search

* Must be:

  * independent from map implementation
  * reusable

* Do not tightly couple filters to Leaflet APIs

---

## 8. State management

* Use module-local variables
* Avoid global state

### Allowed:

```js
let currentFilters = {};
```

### Forbidden:

```js
window.filters = {};
```

---

## 9. Performance (critical)

### Large JSON:

* load on demand
* process once
* reuse results

### Map:

* use clustering
* avoid full re-render

---

## 10. Events

* use `addEventListener`
* separate event wiring from action logic

Forbidden:

```js
element.onclick = function() {}
```

---

## 11. Anti-patterns

### Global code

```js
var data = [];
```

---

### Mixed responsibilities

```js
// map + UI + fetch all in one place
```

---

### Duplicate fetch calls

```js
fetch('/data/file.json');
fetch('/data/file.json');
```

---

### Tightly coupled DOM logic

```js
document.querySelector('.btn').onclick = ...
```

(without structure or control)

---

## 12. Correct examples

### Clean module

```js
export function initMap(containerId) {
  return L.map(containerId);
}
```

---

### Data separation

```js
import { loadData } from '../core/api.js';
```

---

### Decoupled UI

```js
button.addEventListener('click', handleClick);
```

---

## 13. Project adaptation

The agent must:

* analyze the existing structure
* respect it
* improve it without breaking behavior

---

## 14. Final rule

If code:

* mixes responsibilities
* breaks modularity
* introduces unapproved dependencies

it is incorrect, even if it works.
