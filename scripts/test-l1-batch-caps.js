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

const SN_DEFAULTS = { chunkSize: 5, delayBetweenChunksMs: 500, maxRetries: 3, initialBackoffMs: 1000 };
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

// --- maxRetries: capped at 3, a caller asking for fewer is left alone ---

r = clampBatchOptions({ maxRetries: 50 }, SN_DEFAULTS, 5, 250);
ok(r.maxRetries === 3, 'maxRetries: caller value 50 is clamped down to the ceiling of 3 (got ' + r.maxRetries + ')');

r = clampBatchOptions({ maxRetries: 1 }, SN_DEFAULTS, 5, 250);
ok(r.maxRetries === 1, 'maxRetries: a caller value BELOW the ceiling is left alone (got ' + r.maxRetries + ')');

r = clampBatchOptions({ maxRetries: 0 }, SN_DEFAULTS, 5, 250);
ok(r.maxRetries === 0, 'maxRetries: 0 (no retries at all) is a valid value, left alone (got ' + r.maxRetries + ')');

r = clampBatchOptions({ maxRetries: -1 }, SN_DEFAULTS, 5, 250);
ok(r.maxRetries === 3, 'maxRetries: a negative value falls back to the default rather than a nonsensical negative retry count (got ' + r.maxRetries + ')');

r = clampBatchOptions({ maxRetries: 'nope' }, SN_DEFAULTS, 5, 250);
ok(r.maxRetries === 3, 'maxRetries: a non-numeric value falls back to the default, not NaN (got ' + r.maxRetries + ')');

r = clampBatchOptions(undefined, SN_DEFAULTS, 5, 250);
ok(r.maxRetries === 3, 'maxRetries: no caller options at all falls back to the module default (got ' + r.maxRetries + ')');

// --- initialBackoffMs: clamped between 250ms and 10000ms ---

r = clampBatchOptions({ initialBackoffMs: 1 }, SN_DEFAULTS, 5, 250);
ok(r.initialBackoffMs === 250, 'initialBackoffMs: caller value 1ms is floored up to 250ms (got ' + r.initialBackoffMs + ')');

r = clampBatchOptions({ initialBackoffMs: 999999 }, SN_DEFAULTS, 5, 250);
ok(r.initialBackoffMs === 10000, 'initialBackoffMs: caller value 999999ms is capped down to 10000ms (got ' + r.initialBackoffMs + ')');

r = clampBatchOptions({ initialBackoffMs: 2000 }, SN_DEFAULTS, 5, 250);
ok(r.initialBackoffMs === 2000, 'initialBackoffMs: a value within [250, 10000] is left alone (got ' + r.initialBackoffMs + ')');

r = clampBatchOptions({ initialBackoffMs: 'nope' }, SN_DEFAULTS, 5, 250);
ok(r.initialBackoffMs === 1000, 'initialBackoffMs: a non-numeric value falls back to the default, not NaN (got ' + r.initialBackoffMs + ')');

// --- maxRetries/initialBackoffMs are only touched when actually present
//     on defaults or caller options -- analyze/batch's own defaults don't
//     define either (its retry behavior lives in groqChat(), not here),
//     so nothing gets invented on its merged result ---

r = clampBatchOptions(undefined, ANALYZE_DEFAULTS, 3, 250);
ok(r.maxRetries === undefined && r.initialBackoffMs === undefined, 'analyze/batch: maxRetries/initialBackoffMs are not invented when absent from both defaults and caller options (got ' + JSON.stringify(r) + ')');

r = clampBatchOptions({ maxRetries: 99 }, ANALYZE_DEFAULTS, 3, 250);
ok(r.maxRetries === 3, 'analyze/batch: a caller-supplied maxRetries is still clamped even though the route\'s own defaults don\'t define one (got ' + r.maxRetries + ')');

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
