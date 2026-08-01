'use strict';

const { AdapterRegistry } = require('./adapter-registry');

function createAdapterRegistry(adapters) {
  return new AdapterRegistry(adapters);
}

module.exports = { createAdapterRegistry };