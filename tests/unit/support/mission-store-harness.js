'use strict';
// Loads the REAL shipped mission-model.js / mission-store.js (unmodified)
// into a minimal window/localStorage shim so we can unit test them in Node.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// tests/unit/support/mission-store-harness.js -> repo root is 3 levels up
const DEFAULT_REPO_ROOT = path.join(__dirname, '..', '..', '..');

function makeSandbox() {
  const store = {};
  const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { for (const k of Object.keys(store)) delete store[k]; }
  };
  const sandbox = {
    console,
    Date,
    JSON,
    Object,
    Array,
    Math,
    String,
    Number,
    localStorage
  };
  sandbox.window = sandbox; // so `global.TSM = global.TSM || {}` etc. attaches to sandbox
  vm.createContext(sandbox);
  return sandbox;
}

function loadModel(sandbox, repoRoot) {
  const p = path.join(repoRoot || DEFAULT_REPO_ROOT, 'html/shared/runtime/mission/mission-model.js');
  const code = fs.readFileSync(p, 'utf8');
  vm.runInContext(code, sandbox, { filename: p });
  return sandbox.window.TSMMissionModel;
}

function loadStore(sandbox, repoRoot) {
  const p = path.join(repoRoot || DEFAULT_REPO_ROOT, 'html/shared/runtime/mission/mission-store.js');
  const code = fs.readFileSync(p, 'utf8');
  vm.runInContext(code, sandbox, { filename: p });
  return sandbox.window.TSMMissionStore;
}

module.exports = { makeSandbox, loadModel, loadStore };
