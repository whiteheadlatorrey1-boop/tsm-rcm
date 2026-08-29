'use strict';

/**
 * Process-local baseline idempotency registry.
 *
 * Production persistence adapters should replace the Map.
 */

const completed = new Map();

function keyFor(input = {}) {
  return input.idempotencyKey ||
    input.requestId ||
    input.actionId ||
    null;
}

function seen(key) {
  return Boolean(key && completed.has(key));
}

function record(key, result) {
  if (!key) return;

  completed.set(key, {
    recordedAt: new Date().toISOString(),
    result
  });
}

function get(key) {
  return key ? completed.get(key) : undefined;
}

function clear() {
  completed.clear();
}

module.exports = {
  keyFor,
  seen,
  record,
  get,
  clear
};
