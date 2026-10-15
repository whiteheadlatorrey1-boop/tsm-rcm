'use strict';
// Regression test for server/l1-copilot/batch-options.js's clampBatchOptions()
// -- the server-side ceiling/floor on caller-supplied batch chunking/pacing
// options for the L1 ServiceNow batch-read and analyze/batch routes.
//
// Without this clamp, a caller could pass e.g.
// { chunkSize: 500, delayBetweenChunksMs: 0 } to either route and hammer a
// customer's ServiceNow instance (or the LLM provider) with effectively
// unbounded concurrency and no pacing between chunks, regardless of what
// each module's own internal defaults are tuned for.
//
// Runs fully offline -- pure function, no server, no credentials.

const { clampBatchOptions } = require('../server/l1-copilot/batch-options');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('PASS:', msg); } else { fail++; console.log('FAIL:', msg); } };

const SN_DEFAULTS = { chunkSize: 5, delayBetweenChunksMs: 500 };
const ANALYZE_DEFAULTS = { chunkSize: 3, delayBetweenChunksMs: 300 };

// --- ServiceNow batch route: chunkSize capped at 5, delay floored at 250ms ---

let r = clampBatchOptions({ chunkSize: 500, delayBetweenChunksMs: 0 }, SN_DEFAULTS, 5, 250);
ok(r.chunkSize === 5, 'ServiceNow: caller chunkSize 500 is clamped down to the cap of 5 (got ' + r.chunkSize + ')');
ok(r.delayBetweenChunksMs === 250, 'ServiceNow: caller delay 0 is floored up to 250ms (got ' + r.delayBetweenChunksMs + ')');

r = clampBatchOptions({ chunkSize: 2, delayBetweenChunksMs: 1000 }, SN_DEFAULTS, 5, 250);
ok(r.chunkSize === 2, 'ServiceNow: a caller chunkSize BELOW the cap is left alone (got ' + r.chunkSize + ')');
ok(r.delayBetweenChunksMs === 1000, 'ServiceNow: a caller delay ABOVE the floor is left alone (got ' + r.delayBetweenChunksMs + ')');

r = clampBatchOptions(undefined, SN_DEFAULTS, 5, 250);
ok(r.chunkSize === 5 && r.delayBetweenChunksMs === 500, 'ServiceNow: no options at all falls back to the module defaults (got ' + JSON.stringify(r) + ')');

r = clampBatchOptions({ chunkSize: 'not-a-number', delayBetweenChunksMs: 'nope' }, SN_DEFAULTS, 5, 250);
ok(r.chunkSize === 5 && r.delayBetweenChunksMs === 500, 'ServiceNow: non-numeric options fall back to defaults, not NaN (got ' + JSON.stringify(r) + ')');

r = clampBatchOptions({ chunkSize: -3 }, SN_DEFAULTS, 5, 250);
ok(r.chunkSize === 5, 'ServiceNow: a non-positive chunkSize falls back to the default rather than clamping to a useless <=0 value (got ' + r.chunkSize + ')');

// --- analyze/batch route: chunkSize capped at 3 (lower -- each item is an LLM call), delay floored at 250ms ---

r = clampBatchOptions({ chunkSize: 100, delayBetweenChunksMs: 10 }, ANALYZE_DEFAULTS, 3, 250);
ok(r.chunkSize === 3, 'analyze/batch: caller chunkSize 100 is clamped down to the cap of 3 (got ' + r.chunkSize + ')');
ok(r.delayBetweenChunksMs === 250, 'analyze/batch: caller delay 10ms is floored up to 250ms (got ' + r.delayBetweenChunksMs + ')');

r = clampBatchOptions({ chunkSize: 1 }, ANALYZE_DEFAULTS, 3, 250);
ok(r.chunkSize === 1, 'analyze/batch: a caller chunkSize BELOW the cap is left alone (got ' + r.chunkSize + ')');

r = clampBatchOptions(undefined, ANALYZE_DEFAULTS, 3, 250);
ok(r.chunkSize === 3 && r.delayBetweenChunksMs === 300, 'analyze/batch: no options at all falls back to the module defaults (got ' + JSON.stringify(r) + ')');

// --- the two routes' caps are genuinely independent of each other ---
r = clampBatchOptions({ chunkSize: 5 }, ANALYZE_DEFAULTS, 3, 250);
ok(r.chunkSize === 3, 'analyze/batch\'s cap of 3 still applies even to a chunkSize that would be valid under ServiceNow\'s cap of 5 (got ' + r.chunkSize + ')');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
