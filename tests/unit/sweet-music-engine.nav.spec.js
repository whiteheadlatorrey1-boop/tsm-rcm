'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// tests/unit/sweet-music-engine.nav.spec.js -> repo root is 2 levels up
const REPO_ROOT = path.join(__dirname, '..', '..');
const ENGINE_PATH = path.join(REPO_ROOT, 'html/war-rooms/music-war/js/sweet-music-engine.js');

// Regression test for: SMOS.nav.base string-matched a nonexistent
// '/music-command/' path segment (real pages live under
// html/war-rooms/music-war/), so every SMOS.nav.toX() call fell through
// to a hardcoded fallback and 404'd. Fixed in e80517d7.
//
// Loads the real, committed engine file in a sandboxed VM context with a
// stubbed `window.location.pathname`, so this catches a regression on the
// actual shipped code -- not a reimplementation of the logic.

function loadEngineAt(pathname) {
  const src = fs.readFileSync(ENGINE_PATH, 'utf8');
  const sandbox = {
    window: {
      location: { pathname, href: '' },
      addEventListener: () => {},
    },
    localStorage: {
      _data: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
      setItem(k, v) { this._data[k] = String(v); },
    },
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.SMOS;
}

// Every real page in the repo that calls SMOS.nav.toX() (confirmed via
// grep across html/war-rooms/music-war/), plus a mounted-subpath case to
// make sure the substring search doesn't assume music-war is web-root.
const CASES = [
  { label: 'Dashboard (index.html)', pathname: '/html/war-rooms/music-war/index.html' },
  { label: 'Song Builder (creation/song-builder.html)', pathname: '/html/war-rooms/music-war/creation/song-builder.html' },
  { label: 'Producer AI (producer/producer-ai.html)', pathname: '/html/war-rooms/music-war/producer/producer-ai.html' },
  { label: 'Mounted under app subpath', pathname: '/app/html/war-rooms/music-war/producer/producer-ai.html' },
];

const REAL_TARGET_FILES = [
  'html/war-rooms/music-war/creation/song-builder.html',
  'html/war-rooms/music-war/cadence-builder.html',
  'html/war-rooms/music-war/creation/beat-workbench.html',
];

function run() {
  // Guard: if this file ever gets moved without updating the engine path,
  // fail loudly instead of silently testing nothing.
  assert.ok(fs.existsSync(ENGINE_PATH), `engine file not found at ${ENGINE_PATH}`);

  for (const { label, pathname } of CASES) {
    const SMOS = loadEngineAt(pathname);
    const expectedBase = pathname.slice(0, pathname.indexOf('/music-war/') + '/music-war/'.length);

    assert.strictEqual(
      SMOS.nav.base,
      expectedBase,
      `[${label}] nav.base should be ${expectedBase}, got ${SMOS.nav.base}`
    );
    assert.ok(
      !SMOS.nav.base.includes('music-command'),
      `[${label}] nav.base regressed back to the dead 'music-command' path`
    );
    console.log(`[PASS] ${label} -> nav.base = ${SMOS.nav.base}`);
  }

  // Confirm the computed nav targets actually exist on disk, so a rename
  // of these files trips this test instead of silently 404ing again.
  for (const relPath of REAL_TARGET_FILES) {
    assert.ok(
      fs.existsSync(path.join(REPO_ROOT, relPath)),
      `nav.toX() target ${relPath} no longer exists on disk`
    );
  }
  console.log('[PASS] all nav.toX() target files exist on disk');

  console.log('\n=== SUMMARY ===');
  console.log('SMOS.nav.base correctly resolves to .../music-war/ across page depths');
  console.log('and mount subpaths, and never regresses to the dead music-command path.');
}

run();
