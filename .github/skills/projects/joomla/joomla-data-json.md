---
name: joomla-data-json
description: Rules for read-only geographic JSON usage, efficient loading, and validation.
---

# joomla-data-json.md

## 1. Goal

Rules for handling static geographic JSON data in this project. Ensures:

* efficiency
* read-only behavior
* map compatibility
* security

---

## 2. General rules

* JSON files are located in `/data/`
* Data can be split across multiple files
* Read-only policy is mandatory
* Do not treat JSON as a dynamic database
* Do not modify JSON at runtime

---

## 3. JSON loading

* Hybrid strategy:

| Size / criticality   | Method         |
|----------------------|----------------|
| Small / critical     | Inline         |
| Large                | AJAX (`fetch`) |

Operational thresholds:

* Inline: up to 30 KB per payload, only when critical for first render.
* AJAX: required for payloads above 30 KB or non-critical data.

* Avoid repeated loads
* Handle errors
* Do not duplicate data

---

## 4. Validation

* JSON must be parseable (`JSON.parse`)
* Sanitize content before using it in JS
* Validate consistency against expected schema/shape
* Do not assume data integrity

---

## 5. Anti-patterns

* Merging unrelated datasets in a single file
* Modifying JSON from frontend code
* Inlining very large JSON payloads

---

## 6. Correct example

```js id="json1"
import { loadData } from '../core/data.js';

const municipios = await loadData('/data/municipios.json');
```
