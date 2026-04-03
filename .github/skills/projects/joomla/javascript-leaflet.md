---
name: js-leaflet
description: Guide for modular Leaflet/OpenStreetMap integration with layers, filters, and markers.
---

# javascript-leaflet.md

## 1. Goal

Define rules for using Leaflet and OpenStreetMap.

---

## 2. Principles

* Separate map logic from UI logic
* Modularize layers, markers, and filters
* Use clustering
* Do not mix global logic with DOM handling
* Do not load data directly inside map initialization

---

## 3. Recommended structure

```plaintext id="leaf1"
/js/map/
  map.js
  markers.js
  layers.js
  filters.js
```

---

## 4. Data loading

* Use `loadData()` from `core`
* Handle errors
* Avoid render-blocking behavior

---

## 5. Modular example

```js id="leaf2"
import { loadData } from '../core/data.js';
import { initMap } from './map.js';
import { addMarkers } from './markers.js';

const map = initMap('map-container');
const data = await loadData('/data/comercios.json');
addMarkers(map, data);
```

---

## 6. Anti-patterns

* Mixing UI and map logic
* Unnecessary inline data
* Global variables
