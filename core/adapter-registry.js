'use strict';

class AdapterRegistry {
  constructor(adapters = []) {
    this.adapters = new Map();
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter) {
    if (!adapter || typeof adapter.key !== 'string' || !adapter.key) {
      throw new TypeError('Adapter must define a non-empty key');
    }
    if (typeof adapter.generate !== 'function') {
      throw new TypeError(`Adapter "${adapter.key}" must define generate()`);
    }
    if (this.adapters.has(adapter.key)) {
      throw new Error(`Adapter already registered: ${adapter.key}`);
    }
    this.adapters.set(adapter.key, Object.freeze({ ...adapter }));
    return this;
  }

  get(key) {
    return this.adapters.get(key);
  }

  has(key) {
    return this.adapters.has(key);
  }

  list() {
    return [...this.adapters.values()];
  }

  keys() {
    return [...this.adapters.keys()];
  }
}

module.exports = { AdapterRegistry };