---
name: joomla-data-json
description: Rules for read-only geographic JSON usage, efficient loading, and validation.
---

# joomla-data-json.md

## 1. Goal

Rules for handling static geographic JSON data in this project ensuring efficiency, read-only behavior, map compatibility, and security.

---

## 2. General rules

* JSON files are located in `/data/`
* Data can be split across multiple files
* Read-only policy is mandatory
* Do not treat JSON as a dynamic database or modify it at runtime

---

## 3. JSON loading

| Size / criticality   | Method         |
|----------------------|----------------|
| Small / critical     | Inline         |
| Large                | AJAX (`fetch`) |

* Inline: up to 30 KB per payload, only when critical for first render
* AJAX: required for payloads above 30 KB or non-critical data

---

## 4. Validation

* JSON must be parseable (`JSON.parse`)
* Sanitize content before using in JS
* Validate consistency against expected schema/shape
* Do not assume data integrity

---

## 5. Anti-patterns

* Merging unrelated datasets in a single file
* Modifying JSON from frontend code
* Inlining very large JSON payloads

---

## 6. Correct example

```js
import { loadData } from '../core/data.js';

const municipios = await loadData('/data/municipios.json');
```
