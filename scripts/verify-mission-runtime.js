#!/usr/bin/env node
/**
 * verify-mission-control.js
 *
 * Exercises the real Mission runtime (html/shared/runtime/mission/mission-model.js
 * + mission-store.js) end-to-end: create -> add task -> transition stage
 * -> audit trail -> persistence -> analytics.
 *
 * This does NOT test bpo-internal1.html's sector demo panels (those are
 * static sample data, not the Mission runtime — see SECTORS object).
 * It tests the actual shared runtime that BPO's war room -> strategist ->
 * exec-portal chain persists missions through.
 *
 * Usage: node scripts/verify-mission-control.js
 * Exit code 0 = all checks passed, non-zero = failure (message printed).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const MODEL_PATH = path.join(ROOT, 'html/shared/runtime/mission/mission-model.js');
const STORE_PATH = path.join(ROOT, 'html/shared/runtime/mission/mission-store.js');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

// --- in-memory localStorage shim (these files are browser IIFEs that
// expect window.localStorage) ---
function makeLocalStorage() {
  const backing = new Map();
  return {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
    clear: () => backing.clear()
  };
}

const sandbox = { console, localStorage: makeLocalStorage() };
sandbox.window = sandbox; // so `typeof window !== 'undefined'` resolves to this sandbox
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const p of [MODEL_PATH, STORE_PATH]) {
  assert(fs.existsSync(p), `missing runtime file: ${p}`);
  const code = fs.readFileSync(p, 'utf8');
  vm.runInContext(code, sandbox, { filename: p });
}

const Model = sandbox.TSMMissionModel;
const Store = sandbox.TSMMissionStore;
assert(Model, 'TSMMissionModel did not attach to global scope');
assert(Store, 'TSMMissionStore did not attach to global scope');

// --- checks ---
assert(Model.VERTICALS.includes('mortgage'), 'mortgage missing from Model.VERTICALS');
assert(Model.VERTICALS.includes('bpo'), 'bpo missing from Model.VERTICALS');

const mission = Model.createMission({
  vertical: 'mortgage',
  tenantId: 'verify-tenant-1',
  title: 'Verify pipeline — Delgado Refi'
});
assert(mission && mission.id, 'createMission did not return a mission with an id');
assert(Array.isArray(mission.audit) && mission.audit.length >= 1, 'new mission should have an initial audit entry');

const auditLenBefore = mission.audit.length;
Model.addTask(mission, { title: 'Collect conditions', status: 'open' });
Model.addTask(mission, { title: 'Order title', status: 'complete' });
const pct = Model.completionPercent(mission);
assert(typeof pct === 'number' && pct > 0 && pct < 100, `completionPercent should be between 0-100 for 1/2 done tasks, got ${pct}`);

Model.transitionStage(mission, Model.STAGES ? Object.values(Model.STAGES)[1] || 'in_progress' : 'in_progress', 'verify-script');
assert(mission.audit.length > auditLenBefore, 'transitionStage did not append an audit event');

const validation = Model.validateMission(mission);
assert(validation && (validation.valid === true || (Array.isArray(validation.errors) && validation.errors.length === 0)), 'mission failed validateMission after mutation: ' + JSON.stringify(validation));

// --- audit entry shape (bpo-strategist.html's Mission Timeline tab renders
// directly off audit[].at/event/actor/meta — verify that shape explicitly) ---
for (const ev of mission.audit) {
  assert(typeof ev.event === 'string' && ev.event.length > 0, 'audit event missing/invalid "event" field: ' + JSON.stringify(ev));
  assert(typeof ev.actor === 'string' && ev.actor.length > 0, 'audit event missing/invalid "actor" field: ' + JSON.stringify(ev));
  assert(ev.at && !isNaN(new Date(ev.at).getTime()), 'audit event has unparseable "at" timestamp: ' + JSON.stringify(ev));
  assert(ev.meta === undefined || typeof ev.meta === 'object', 'audit event has invalid "meta" (present but not an object): ' + JSON.stringify(ev));
}
const sortedAts = mission.audit.map((e) => new Date(e.at).getTime());
assert(sortedAts.every((t, i) => i === 0 || t >= sortedAts[i - 1]), 'audit events were not created in chronological order');

// --- persistence round-trip through the store ---
const saved = Store.saveMission(mission);
assert(saved !== false, 'saveMission returned falsy/failure');

const fetched = Store.getMission(mission.id);
assert(fetched && fetched.id === mission.id, 'getMission did not return the saved mission');
assert(fetched.audit.length === mission.audit.length, 'persisted audit trail length mismatch after round-trip');

const list = Store.listMissions({ vertical: 'mortgage' });
assert(Array.isArray(list) && list.some((m) => m.id === mission.id), 'listMissions({vertical: "mortgage"}) did not include the saved mission');

const analytics = Store.getAnalytics({ vertical: 'mortgage' });
assert(analytics && typeof analytics === 'object', 'getAnalytics did not return an object');

console.log('OK: Mission runtime verified — createMission, addTask, completionPercent,');
console.log('    transitionStage, audit trail (shape + chronological order),');
console.log('    saveMission/getMission round-trip, listMissions, getAnalytics all');
console.log('    functioned correctly for vertical "mortgage".');
console.log(`    Mission id: ${mission.id}, final audit length: ${mission.audit.length}, completion: ${pct}%`);