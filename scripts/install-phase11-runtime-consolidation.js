#!/usr/bin/env node
/**
 * scripts/install-phase11-runtime-consolidation.js
 *
 * Phase 11 — Enterprise Runtime Consolidation
 *
 * Idempotent installer. Safe to run repeatedly.
 * - Never overwrites a file that already exists unless --force is passed.
 * - Creates the shared runtime layer (registry, state, events, health, migration, bootstrap).
 * - Creates the four engineering audit tools.
 * - Does NOT touch any existing HTML/JS pages. Patching entry points is a
 *   separate, explicit step (see --patch below) and only ever *adds* a
 *   <script> tag right before </body>; it never rewrites existing logic.
 *
 * Usage:
 *   node scripts/install-phase11-runtime-consolidation.js
 *   node scripts/install-phase11-runtime-consolidation.js --force
 *   node scripts/install-phase11-runtime-consolidation.js --patch=html/bpo-internal1.html,html/construction-war-room.html
 *   node scripts/install-phase11-runtime-consolidation.js --root=/path/to/repo
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const PATCH = (args.find(a => a.startsWith('--patch=')) || '--patch=').split('=')[1]
  .split(',').map(s => s.trim()).filter(Boolean);

const RUNTIME_DIR = path.join(ROOT, 'html', 'shared', 'runtime');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileIdempotent(filePath, contents) {
  const exists = fs.existsSync(filePath);
  if (exists && !FORCE) {
    console.log(`  SKIP   (exists) ${path.relative(ROOT, filePath)}`);
    return false;
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, 'utf8');
  console.log(`  ${exists ? 'REWRITE' : 'CREATE '} ${path.relative(ROOT, filePath)}`);
  return true;
}

// ---------------------------------------------------------------------------
// Runtime layer templates
// ---------------------------------------------------------------------------

const RUNTIME_REGISTRY_JS = `/**
 * runtime-registry.js
 * Central registry so every page declares what it is and what it uses.
 * Pure client-side, no dependencies. Attaches to window.RuntimeRegistry.
 */
(function (global) {
  const PAGES = new Map();

  function register(entry) {
    if (!entry || !entry.page) {
      console.warn('[RuntimeRegistry] register() requires at least { page }');
      return;
    }
    const record = Object.assign({
      vertical: null,
      runtime: 'legacy',      // 'mission' | 'legacy'
      version: '0.0.0',
      capabilities: [],
      registeredAt: new Date().toISOString()
    }, entry);
    PAGES.set(entry.page, record);
    if (global.RuntimeEvents) {
      global.RuntimeEvents.publish('PAGE_REGISTERED', record);
    }
  }

  function get(page) {
    return PAGES.get(page) || null;
  }

  function all() {
    return Array.from(PAGES.values());
  }

  function adoptionSummary() {
    const total = PAGES.size;
    const onMission = all().filter(p => p.runtime === 'mission').length;
    return {
      total,
      onMission,
      pct: total ? Math.round((onMission / total) * 100) : 0
    };
  }

  global.RuntimeRegistry = { register, get, all, adoptionSummary };
})(typeof window !== 'undefined' ? window : globalThis);
`;

const RUNTIME_STATE_JS = `/**
 * runtime-state.js
 * The ONLY supported API for shared cross-page state going forward.
 *
 * Internally still backed by localStorage today (that's fine — the point
 * of this layer is the seam, not a rewrite of the storage engine). Pages
 * should stop calling localStorage.setItem/getItem directly and go through
 * RuntimeState.set/get instead, so we have one place to change later.
 *
 * Namespacing: keys are dot-paths, e.g. "mission.current", "finops.queue".
 * Internally stored under a single prefixed localStorage key per namespace
 * root, to avoid re-creating hundreds of raw TSM_* keys.
 */
(function (global) {
  const STORAGE_PREFIX = 'RTSTATE::';

  function rootOf(key) {
    return key.split('.')[0];
  }

  function readRoot(root) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + root);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[RuntimeState] failed to read root', root, e);
      return {};
    }
  }

  function writeRoot(root, obj) {
    try {
      localStorage.setItem(STORAGE_PREFIX + root, JSON.stringify(obj));
    } catch (e) {
      console.warn('[RuntimeState] failed to write root', root, e);
    }
  }

  function set(key, value) {
    const root = rootOf(key);
    const data = readRoot(root);
    const rest = key.split('.').slice(1);
    if (rest.length === 0) {
      writeRoot(root, value);
    } else {
      let cursor = data;
      for (let i = 0; i < rest.length - 1; i++) {
        cursor[rest[i]] = cursor[rest[i]] || {};
        cursor = cursor[rest[i]];
      }
      cursor[rest[rest.length - 1]] = value;
      writeRoot(root, data);
    }
    if (global.RuntimeEvents) {
      global.RuntimeEvents.publish('STATE_CHANGED', { key, value });
    }
  }

  function get(key, fallback) {
    const root = rootOf(key);
    const data = readRoot(root);
    const rest = key.split('.').slice(1);
    let cursor = data;
    for (const segment of rest) {
      if (cursor == null) return fallback;
      cursor = cursor[segment];
    }
    return cursor === undefined ? fallback : cursor;
  }

  function remove(key) {
    const root = rootOf(key);
    const rest = key.split('.').slice(1);
    if (rest.length === 0) {
      localStorage.removeItem(STORAGE_PREFIX + root);
      return;
    }
    const data = readRoot(root);
    let cursor = data;
    for (let i = 0; i < rest.length - 1; i++) {
      if (cursor[rest[i]] === undefined) return;
      cursor = cursor[rest[i]];
    }
    delete cursor[rest[rest.length - 1]];
    writeRoot(root, data);
  }

  global.RuntimeState = { set, get, remove };
})(typeof window !== 'undefined' ? window : globalThis);
`;

const RUNTIME_EVENTS_JS = `/**
 * runtime-events.js
 * Standardized event bus. No page should invent new event name strings —
 * add them to KNOWN_EVENTS below and reference the constant instead.
 */
(function (global) {
  const KNOWN_EVENTS = [
    'MISSION_CREATED',
    'MISSION_UPDATED',
    'MISSION_ASSIGNED',
    'MISSION_STAGE_CHANGED',
    'MISSION_COMPLETED',
    'PAGE_REGISTERED',
    'STATE_CHANGED'
  ];

  const listeners = new Map();

  function publish(eventName, payload) {
    if (!KNOWN_EVENTS.includes(eventName)) {
      console.warn(\`[RuntimeEvents] "\${eventName}" is not a known event. Add it to KNOWN_EVENTS in runtime-events.js before using it.\`);
    }
    const set = listeners.get(eventName);
    if (set) {
      set.forEach(fn => {
        try { fn(payload); } catch (e) { console.error('[RuntimeEvents] listener error', eventName, e); }
      });
    }
    // Also broadcast cross-tab via a single storage key, replacing
    // page-specific relay keys.
    try {
      localStorage.setItem('RTEVENT::' + eventName, JSON.stringify({ payload, ts: Date.now() }));
    } catch (e) { /* ignore quota errors */ }
  }

  function subscribe(eventName, fn) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(fn);
    return () => listeners.get(eventName).delete(fn);
  }

  // Cross-tab: listen for our namespaced relay keys instead of each page
  // inventing its own storage event listener.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (!e.key || !e.key.startsWith('RTEVENT::')) return;
      const eventName = e.key.slice('RTEVENT::'.length);
      const set = listeners.get(eventName);
      if (!set) return;
      try {
        const { payload } = JSON.parse(e.newValue);
        set.forEach(fn => fn(payload));
      } catch (err) { /* ignore malformed */ }
    });
  }

  global.RuntimeEvents = { publish, subscribe, KNOWN_EVENTS };
})(typeof window !== 'undefined' ? window : globalThis);
`;

const RUNTIME_HEALTH_JS = `/**
 * runtime-health.js
 * Client-side helper that pages can call to self-report their own
 * migration status into RuntimeRegistry, so runtime-health-report.js
 * (the Node script) has richer data if it's ever wired to a live export.
 * This file intentionally does very little — the real analysis happens
 * statically in scripts/runtime-health-report.js by scanning source files.
 */
(function (global) {
  function reportSelf(page, details) {
    if (global.RuntimeRegistry) {
      global.RuntimeRegistry.register(Object.assign({ page }, details));
    }
  }
  global.RuntimeHealth = { reportSelf };
})(typeof window !== 'undefined' ? window : globalThis);
`;

const RUNTIME_MIGRATION_JS = `/**
 * runtime-migration.js
 * Thin compatibility shim: lets a page read an old relay key AND write
 * through RuntimeState at the same time, so migration can happen without
 * a flag day. Remove a page's use of this once its readers are migrated.
 */
(function (global) {
  function bridgeLegacyKey(legacyKey, stateKey) {
    // One-time: if RuntimeState has nothing yet but the legacy key does,
    // seed it so new readers see the same value immediately.
    try {
      const existing = global.RuntimeState.get(stateKey, undefined);
      if (existing === undefined) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw !== null) {
          let parsed;
          try { parsed = JSON.parse(legacyRaw); } catch (e) { parsed = legacyRaw; }
          global.RuntimeState.set(stateKey, parsed);
        }
      }
    } catch (e) {
      console.warn('[RuntimeMigration] bridge failed for', legacyKey, e);
    }
  }

  function dualWrite(legacyKey, stateKey, value) {
    try { localStorage.setItem(legacyKey, typeof value === 'string' ? value : JSON.stringify(value)); } catch (e) {}
    global.RuntimeState.set(stateKey, value);
  }

  global.RuntimeMigration = { bridgeLegacyKey, dualWrite };
})(typeof window !== 'undefined' ? window : globalThis);
`;

const BOOTSTRAP_JS = `/**
 * tsm-enterprise-runtime.js
 * Single bootstrap script. Include this ONE tag on a page to get the
 * whole Phase 11 runtime layer, in the correct load order.
 *
 * <script src="/html/shared/runtime/tsm-enterprise-runtime.js"></script>
 *
 * This file is just a documented load-order guide for a bundler/build step,
 * OR — if you have no bundler — replace this file's contents with the
 * concatenation of the five modules below in this exact order:
 *   1. runtime-events.js     (no deps)
 *   2. runtime-state.js      (uses RuntimeEvents if present)
 *   3. runtime-registry.js   (uses RuntimeEvents if present)
 *   4. runtime-health.js     (uses RuntimeRegistry)
 *   5. runtime-migration.js  (uses RuntimeState)
 *
 * Simplest zero-build option: keep the five <script> tags below.
 */
document.write(
  '<script src="/html/shared/runtime/runtime-events.js"></script>' +
  '<script src="/html/shared/runtime/runtime-state.js"></script>' +
  '<script src="/html/shared/runtime/runtime-registry.js"></script>' +
  '<script src="/html/shared/runtime/runtime-health.js"></script>' +
  '<script src="/html/shared/runtime/runtime-migration.js"></script>'
);
`;

// ---------------------------------------------------------------------------
// Engineering tool templates
// ---------------------------------------------------------------------------

const HEALTH_REPORT_JS = `#!/usr/bin/env node
/**
 * scripts/runtime-health-report.js
 * Static scan of the repo. Reports:
 *   - localStorage.setItem/getItem counts
 *   - relay-key-like string literals (TSM_* naming)
 *   - setInterval usage (polling)
 *   - 'storage' event listener usage
 *   - RuntimeState / RuntimeEvents adoption (new API usage)
 *   - orphan writers (keys set but never read) and orphan readers (read but never set)
 *
 * Usage: node scripts/runtime-health-report.js [--root=.] [--json]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const JSON_OUT = args.includes('--json');

const SCAN_EXT = new Set(['.html', '.js', '.htm']);
const INCLUDE_BACKUPS = args.includes('--include-backups');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
if (!INCLUDE_BACKUPS) IGNORE_DIRS.add('backups');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (SCAN_EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const VAR_BINDING_RE = /(?:const|let|var)\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*['"\`]([^'"\`]+)['"\`]/g;

function buildLocalBindings(text) {
  // Per-file map of "const KEY = 'LITERAL'" so setItem(KEY, ...) can be
  // resolved back to the actual string key instead of the variable name.
  const map = new Map();
  let m;
  VAR_BINDING_RE.lastIndex = 0;
  while ((m = VAR_BINDING_RE.exec(text))) {
    map.set(m[1], m[2]);
  }
  return map;
}

function extractKey(argText, bindings) {
  const literal = argText.match(/^['"\`]([^'"\`]+)['"\`]/);
  if (literal) return { key: literal[1], resolved: true };
  const identifier = argText.trim().match(/^[A-Za-z_$][A-Za-z0-9_$]*$/);
  if (identifier && bindings.has(argText.trim())) {
    return { key: bindings.get(argText.trim()), resolved: true };
  }
  // Computed/dynamic expression (e.g. VERTICALS[v].storageKey, room.relay) —
  // we cannot safely resolve this to a concrete key.
  return { key: argText.split(',')[0].trim(), resolved: false };
}

function scan(files) {
  const setCalls = [];
  const getCalls = [];
  let pollingCount = 0;
  let storageListenerCount = 0;
  let runtimeStateUsage = 0;
  let runtimeEventsUsage = 0;
  let unresolvedCount = 0;

  const setRe = /localStorage\\.setItem\\(\\s*([^,]+),/g;
  const getRe = /localStorage\\.getItem\\(\\s*([^)]+)\\)/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const bindings = buildLocalBindings(text);
    let m;
    while ((m = setRe.exec(text))) {
      const { key, resolved } = extractKey(m[1], bindings);
      if (!resolved) unresolvedCount++;
      setCalls.push({ file, key, resolved });
    }
    while ((m = getRe.exec(text))) {
      const { key, resolved } = extractKey(m[1], bindings);
      if (!resolved) unresolvedCount++;
      getCalls.push({ file, key, resolved });
    }
    pollingCount += (text.match(/setInterval\\s*\\(/g) || []).length;
    storageListenerCount += (text.match(/addEventListener\\(\\s*['"\`]storage['"\`]/g) || []).length;
    runtimeStateUsage += (text.match(/RuntimeState\\.(set|get|remove)\\(/g) || []).length;
    runtimeEventsUsage += (text.match(/RuntimeEvents\\.(publish|subscribe)\\(/g) || []).length;
  }

  // Only resolved (literal or variable-resolved-to-literal) keys are eligible
  // for orphan analysis. Unresolved/computed keys are reported separately so
  // they don't masquerade as false orphans in either direction.
  const resolvedSetCalls = setCalls.filter(c => c.resolved);
  const resolvedGetCalls = getCalls.filter(c => c.resolved);
  const writtenKeys = new Set(resolvedSetCalls.map(c => c.key));
  const readKeys = new Set(resolvedGetCalls.map(c => c.key));

  const orphanWriters = [...writtenKeys].filter(k => !readKeys.has(k));
  const orphanReaders = [...readKeys].filter(k => !writtenKeys.has(k));
  const unresolvedKeys = [...new Set(
    [...setCalls, ...getCalls].filter(c => !c.resolved).map(c => c.key)
  )];

  return {
    filesScanned: files.length,
    setItemCount: setCalls.length,
    getItemCount: getCalls.length,
    uniqueWrittenKeys: writtenKeys.size,
    uniqueReadKeys: readKeys.size,
    orphanWriters,
    orphanReaders,
    unresolvedKeys,
    unresolvedCount,
    pollingCount,
    storageListenerCount,
    runtimeStateUsage,
    runtimeEventsUsage
  };
}

function score(result) {
  // Rough heuristic: 100 - penalties. Purely directional, not scientific.
  let s = 100;
  s -= Math.min(30, Math.round(result.orphanWriters.length / 5));
  s -= Math.min(20, Math.round(result.orphanReaders.length / 5));
  s -= Math.min(20, Math.round(result.pollingCount / 50));
  const legacyRatio = result.setItemCount + result.getItemCount
    ? 1 - (result.runtimeStateUsage / (result.setItemCount + result.getItemCount + result.runtimeStateUsage))
    : 0;
  s -= Math.round(legacyRatio * 30);
  return Math.max(0, Math.min(100, s));
}

function main() {
  const files = walk(path.resolve(ROOT));
  const result = scan(files);
  const healthScore = score(result);

  if (JSON_OUT) {
    console.log(JSON.stringify({ ...result, healthScore }, null, 2));
    return;
  }

  console.log('========== TSM Runtime Health ==========');
  console.log(\`Files scanned: \${result.filesScanned}\`);
  console.log('');
  console.log('localStorage');
  console.log(\`  setItem calls: \${result.setItemCount} (\${result.uniqueWrittenKeys} unique keys)\`);
  console.log(\`  getItem calls: \${result.getItemCount} (\${result.uniqueReadKeys} unique keys)\`);
  console.log(\`  Orphan writers (never read): \${result.orphanWriters.length}\`);
  console.log(\`  Orphan readers (never written): \${result.orphanReaders.length}\`);
  console.log('');
  console.log('Polling');
  console.log(\`  setInterval calls: \${result.pollingCount}\`);
  console.log(\`  'storage' event listeners: \${result.storageListenerCount}\`);
  console.log('');
  console.log('New runtime adoption');
  console.log(\`  RuntimeState calls: \${result.runtimeStateUsage}\`);
  console.log(\`  RuntimeEvents calls: \${result.runtimeEventsUsage}\`);
  console.log('');
  console.log(\`Overall Runtime Health: \${healthScore}/100\`);
  console.log('=========================================');

  if (result.orphanWriters.length) {
    console.log('\\nTop orphan writer keys (sample) — resolved literal keys only:');
    result.orphanWriters.slice(0, 15).forEach(k => console.log('  ' + k));
  }
  if (result.orphanReaders.length) {
    console.log('\\nTop orphan reader keys (sample) — resolved literal keys only:');
    result.orphanReaders.slice(0, 15).forEach(k => console.log('  ' + k));
  }
  if (result.unresolvedKeys.length) {
    console.log(\`\\nUnresolved / computed keys (\${result.unresolvedCount} call(s), not counted as orphans either way — check by hand):\`);
    result.unresolvedKeys.slice(0, 15).forEach(k => console.log('  ' + k));
  }
}

main();
`;

const MIGRATION_REPORT_JS = `#!/usr/bin/env node
/**
 * scripts/runtime-migration-report.js
 * Per-file migration scorecard: how much of each page still uses raw
 * localStorage vs. RuntimeState/RuntimeEvents, and whether it polls.
 *
 * Usage: node scripts/runtime-migration-report.js [--root=.] [--md]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const MARKDOWN = args.includes('--md');

const INCLUDE_BACKUPS = args.includes('--include-backups');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
if (!INCLUDE_BACKUPS) IGNORE_DIRS.add('backups');
const SCAN_EXT = new Set(['.html', '.htm', '.js']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (SCAN_EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function analyzeFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const directLocalStorage = (text.match(/localStorage\\.(setItem|getItem)\\(/g) || []).length;
  const usesRuntimeState = /RuntimeState\\.(set|get|remove)\\(/.test(text);
  const usesRuntimeEvents = /RuntimeEvents\\.(publish|subscribe)\\(/.test(text);
  const polling = (text.match(/setInterval\\s*\\(/g) || []).length;

  let s = 100;
  s -= Math.min(50, directLocalStorage * 2);
  s -= Math.min(20, polling * 5);
  if (!usesRuntimeState) s -= 15;
  if (!usesRuntimeEvents) s -= 15;
  s = Math.max(0, s);

  return {
    file: path.relative(ROOT, file),
    directLocalStorage,
    usesRuntimeState,
    usesRuntimeEvents,
    polling,
    score: s
  };
}

function main() {
  const files = walk(path.resolve(ROOT)).filter(f => path.extname(f) !== '.js' || f.includes('/html/'));
  const rows = files.map(analyzeFile)
    .filter(r => r.directLocalStorage > 0 || r.usesRuntimeState || r.polling > 0)
    .sort((a, b) => a.score - b.score);

  if (MARKDOWN) {
    console.log('| Page | Direct localStorage | RuntimeState | RuntimeEvents | Polling | Score |');
    console.log('|---|---:|:---:|:---:|---:|---:|');
    rows.forEach(r => {
      console.log(\`| \${r.file} | \${r.directLocalStorage} | \${r.usesRuntimeState ? '✅' : '❌'} | \${r.usesRuntimeEvents ? '✅' : '❌'} | \${r.polling} | \${r.score} |\`);
    });
  } else {
    rows.forEach(r => {
      console.log(\`\${String(r.score).padStart(3)}  \${r.file}  (localStorage:\${r.directLocalStorage} polling:\${r.polling} state:\${r.usesRuntimeState ? 'y' : 'n'} events:\${r.usesRuntimeEvents ? 'y' : 'n'})\`);
    });
  }

  console.log(\`\\n\${rows.length} files with migration-relevant activity out of \${files.length} scanned.\`);
}

main();
`;

const RELAY_AUDIT_JS = `#!/usr/bin/env node
/**
 * scripts/runtime-relay-audit.js
 * Finds "relay key" style string literals (naming pattern *_RELAY, *_WAR_RELAY,
 * TSM_*_RELAY, etc.) across the repo, groups near-duplicates by vertical,
 * and flags naming mismatches (e.g. TSM_LEGAL_WAR_RELAY read but
 * TSM_LEGAL_STRATEGIST_RELAY written).
 *
 * Usage: node scripts/runtime-relay-audit.js [--root=.]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const INCLUDE_BACKUPS = args.includes('--include-backups');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
if (!INCLUDE_BACKUPS) IGNORE_DIRS.add('backups');
const SCAN_EXT = new Set(['.html', '.htm', '.js']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (SCAN_EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const RELAY_LITERAL_RE = /['"\`]([A-Z0-9_]*RELAY[A-Z0-9_]*)['"\`]/g;

function main() {
  const files = walk(path.resolve(ROOT));
  const found = new Map(); // key -> { files:Set, count }

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = RELAY_LITERAL_RE.exec(text))) {
      const key = m[1];
      if (!found.has(key)) found.set(key, { files: new Set(), count: 0 });
      const entry = found.get(key);
      entry.files.add(path.relative(ROOT, file));
      entry.count += 1;
    }
  }

  const verticals = ['CONSTRUCTION', 'HEALTHCARE', 'MORTGAGE', 'LEGAL', 'INSURANCE', 'BPO', 'FINOPS', 'CATALOG', 'CRM', 'CPQ'];
  const byVertical = new Map(verticals.map(v => [v, []]));
  const uncategorized = [];

  for (const [key, entry] of found) {
    const vertical = verticals.find(v => key.includes(v));
    if (vertical) byVertical.get(vertical).push({ key, ...entry });
    else uncategorized.push({ key, ...entry });
  }

  console.log('========== Relay Key Audit ==========');
  console.log(\`Total distinct relay-style keys found: \${found.size}\\n\`);

  for (const [vertical, entries] of byVertical) {
    if (!entries.length) continue;
    console.log(\`\${vertical} (\${entries.length} relay keys)\`);
    entries.sort((a, b) => b.count - a.count).forEach(e => {
      console.log(\`  \${e.key}  — used in \${e.files.size} file(s), \${e.count} occurrence(s)\`);
    });
    console.log('');
  }

  if (uncategorized.length) {
    console.log(\`Uncategorized (\${uncategorized.length}):\`);
    uncategorized.forEach(e => console.log(\`  \${e.key}\`));
  }

  console.log('\\nSuggested collapse target: one RuntimeEvents event per logical action');
  console.log('(e.g. MISSION_STAGE_CHANGED) instead of one relay key per vertical per action.');
}

main();
`;

const DEAD_KEY_REPORT_JS = `#!/usr/bin/env node
/**
 * scripts/runtime-dead-key-report.js
 * Flags localStorage keys that are only ever written (never read) or
 * only ever read (never written) — candidates for deletion or for a
 * missing-consumer bug, respectively.
 *
 * This intentionally reuses simpler logic than runtime-health-report.js
 * and prints a flat, copy-pasteable removal list.
 *
 * Usage: node scripts/runtime-dead-key-report.js [--root=.]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = (args.find(a => a.startsWith('--root=')) || '--root=.').split('=')[1];
const INCLUDE_BACKUPS = args.includes('--include-backups');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
if (!INCLUDE_BACKUPS) IGNORE_DIRS.add('backups');
const SCAN_EXT = new Set(['.html', '.htm', '.js']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (SCAN_EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const VAR_BINDING_RE = /(?:const|let|var)\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*['"\`]([^'"\`]+)['"\`]/g;

function buildLocalBindings(text) {
  const map = new Map();
  let m;
  VAR_BINDING_RE.lastIndex = 0;
  while ((m = VAR_BINDING_RE.exec(text))) map.set(m[1], m[2]);
  return map;
}

function literalKey(argText, bindings) {
  const m = argText.match(/^['"\`]([^'"\`]+)['"\`]/);
  if (m) return m[1];
  const identifier = argText.trim();
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(identifier) && bindings.has(identifier)) {
    return bindings.get(identifier);
  }
  return null; // skip dynamic/computed keys — can't safely judge those
}

function main() {
  const files = walk(path.resolve(ROOT));
  const writers = new Map(); // key -> Set(files)
  const readers = new Map();

  const setRe = /localStorage\\.setItem\\(\\s*([^,]+),/g;
  const getRe = /localStorage\\.getItem\\(\\s*([^)]+)\\)/g;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const bindings = buildLocalBindings(text);
    const rel = path.relative(ROOT, file);
    let m;
    while ((m = setRe.exec(text))) {
      const key = literalKey(m[1], bindings);
      if (!key) continue;
      if (!writers.has(key)) writers.set(key, new Set());
      writers.get(key).add(rel);
    }
    while ((m = getRe.exec(text))) {
      const key = literalKey(m[1], bindings);
      if (!key) continue;
      if (!readers.has(key)) readers.set(key, new Set());
      readers.get(key).add(rel);
    }
  }

  const allKeys = new Set([...writers.keys(), ...readers.keys()]);
  const deadWrites = [];
  const deadReads = [];

  for (const key of allKeys) {
    const w = writers.get(key);
    const r = readers.get(key);
    if (w && !r) deadWrites.push({ key, files: [...w] });
    if (r && !w) deadReads.push({ key, files: [...r] });
  }

  console.log('========== Dead Key Report ==========');
  console.log(\`Write-only keys (safe removal candidates): \${deadWrites.length}\`);
  deadWrites.forEach(d => console.log(\`  \${d.key}   (written in \${d.files.length} file(s))\`));

  console.log(\`\\nRead-only keys (likely missing writer / dead feature): \${deadReads.length}\`);
  deadReads.forEach(d => console.log(\`  \${d.key}   (read in \${d.files.length} file(s))\`));

  console.log('\\nNote: only literal string keys are analyzed. Computed keys (e.g.');
  console.log('clientScopedKey(vertical, clientId)) are skipped — audit those by hand.');
}

main();
`;

// ---------------------------------------------------------------------------
// Optional: patch entry-point HTML files to include the bootstrap
// ---------------------------------------------------------------------------

function patchEntryPoint(filePath) {
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full)) {
    console.log(`  SKIP   (not found) ${filePath}`);
    return;
  }
  let html = fs.readFileSync(full, 'utf8');
  if (html.includes('tsm-enterprise-runtime.js')) {
    console.log(`  SKIP   (already patched) ${filePath}`);
    return;
  }
  const tag = '  <script src="/html/shared/runtime/tsm-enterprise-runtime.js"></script>\n';
  if (html.includes('</body>')) {
    html = html.replace('</body>', tag + '</body>');
  } else {
    html += '\n' + tag;
  }
  fs.writeFileSync(full, html, 'utf8');
  console.log(`  PATCHED ${filePath}`);
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

function writeManifest() {
  const manifest = {
    phase: 11,
    name: 'Enterprise Runtime Consolidation',
    installedAt: new Date().toISOString(),
    runtimeFiles: [
      'html/shared/runtime/runtime-events.js',
      'html/shared/runtime/runtime-state.js',
      'html/shared/runtime/runtime-registry.js',
      'html/shared/runtime/runtime-health.js',
      'html/shared/runtime/runtime-migration.js',
      'html/shared/runtime/tsm-enterprise-runtime.js'
    ],
    tools: [
      'scripts/runtime-health-report.js',
      'scripts/runtime-migration-report.js',
      'scripts/runtime-relay-audit.js',
      'scripts/runtime-dead-key-report.js'
    ],
    patchedEntryPoints: PATCH,
    nextSteps: [
      'Run: node scripts/runtime-health-report.js',
      'Run: node scripts/runtime-relay-audit.js',
      'Run: node scripts/runtime-migration-report.js --md   (paste into a tracking doc)',
      'Patch high-value pages one at a time with --patch=path/to/page.html',
      'Migrate one relay key at a time using RuntimeMigration.bridgeLegacyKey()'
    ]
  };
  writeFileIdempotent(path.join(ROOT, 'runtime-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Phase 11 — Enterprise Runtime Consolidation installer');
  console.log(`Root: ${path.resolve(ROOT)}`);
  console.log(FORCE ? '(force mode: existing files will be overwritten)\n' : '(idempotent mode: existing files are left untouched)\n');

  console.log('Runtime layer:');
  writeFileIdempotent(path.join(RUNTIME_DIR, 'runtime-events.js'), RUNTIME_EVENTS_JS);
  writeFileIdempotent(path.join(RUNTIME_DIR, 'runtime-state.js'), RUNTIME_STATE_JS);
  writeFileIdempotent(path.join(RUNTIME_DIR, 'runtime-registry.js'), RUNTIME_REGISTRY_JS);
  writeFileIdempotent(path.join(RUNTIME_DIR, 'runtime-health.js'), RUNTIME_HEALTH_JS);
  writeFileIdempotent(path.join(RUNTIME_DIR, 'runtime-migration.js'), RUNTIME_MIGRATION_JS);
  writeFileIdempotent(path.join(RUNTIME_DIR, 'tsm-enterprise-runtime.js'), BOOTSTRAP_JS);

  console.log('\nEngineering tools:');
  writeFileIdempotent(path.join(SCRIPTS_DIR, 'runtime-health-report.js'), HEALTH_REPORT_JS);
  writeFileIdempotent(path.join(SCRIPTS_DIR, 'runtime-migration-report.js'), MIGRATION_REPORT_JS);
  writeFileIdempotent(path.join(SCRIPTS_DIR, 'runtime-relay-audit.js'), RELAY_AUDIT_JS);
  writeFileIdempotent(path.join(SCRIPTS_DIR, 'runtime-dead-key-report.js'), DEAD_KEY_REPORT_JS);

  if (PATCH.length) {
    console.log('\nPatching entry points:');
    PATCH.forEach(patchEntryPoint);
  }

  console.log('\nManifest:');
  writeManifest();

  console.log('\nDone. Next:');
  console.log('  node scripts/runtime-health-report.js');
  console.log('  node scripts/runtime-relay-audit.js');
}

main();