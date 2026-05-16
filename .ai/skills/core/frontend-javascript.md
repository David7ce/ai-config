---
name: javascript
description: Rules for modular JavaScript (vanilla + ES modules), data loading, and performance.
---

# frontend-javascript.md

## 1. Goal

Define mandatory JavaScript rules for this project governing code structure, module organization, data loading, and Joomla/JSON integration.

---

## 2. Mandatory principles

* JavaScript must be modular, predictable, and maintainable
* Avoid duplication, global logic, and tight coupling

---

## 3. Global rules

* Use vanilla JavaScript and ES Modules (`import/export`)
* Do not use frameworks (React, Vue, etc.)
* Do not use external libraries (except Leaflet)

### Required structure

```plaintext
/js/
  core/      ← utilities, helpers, data access, shared logic
  map/       ← initialization, layers, markers, clustering
  ui/        ← user interaction, forms, filters, search
```

* Each file has a single responsibility
* No global variables; no duplicated logic across modules

---

## 4. Data loading

| Case                   | Method |
|------------------------|--------|
| Small or critical JSON | Inline |
| Large JSON             | AJAX   |

* Inline: up to 30 KB, only when critical for first render
* AJAX: required for payloads above 30 KB or non-critical data

```html
<!-- Inline -->
<script type="application/json" id="map-data">{...}</script>
```

```js
// AJAX
export async function loadData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Error loading data');
  return response.json();
}
```

---

## 5. Map architecture (Leaflet)

```plaintext
/map/
  map.js      → initialization
  markers.js  → marker management
  filters.js  → filter logic
  layers.js   → base layers
```

* Do not mix map logic with UI logic
* Do not load data directly inside `map.js`

---

## 6. Events

* Use `addEventListener`; separate event wiring from action logic

```js
button.addEventListener('click', handleClick);  // correct
element.onclick = function() {}                 // forbidden
```

---

## 7. Anti-patterns

```js
var data = [];              // global code
window.filters = {};        // global state
fetch(url); fetch(url);     // duplicate fetch calls
```

---

## 8. Final rule

If code mixes responsibilities, breaks modularity, or introduces unapproved dependencies — it is incorrect, even if it works.
