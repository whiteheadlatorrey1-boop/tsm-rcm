'use strict';
// tests/unit/hc-client-id.sanitize.spec.js
//
// Regression test for the path-traversal fix in routes/_shared.js
// (sanitizeClientId / resolveHcClientId). clientId is interpolated
// directly into a filesystem path — hc-node-state.${clientId}.json —
// so anything that isn't [a-zA-Z0-9_-]{1,64} must be rejected rather
// than silently accepted.

const assert = require('assert');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const {
  sanitizeClientId,
  resolveHcClientId,
  hcNodeStateFile,
  hcReportsFile,
  hcProfilesFile,
} = require(path.join(REPO_ROOT, 'routes', '_shared.js'));

function run() {
  // --- sanitizeClientId: valid input passes through unchanged ---
  assert.strictEqual(sanitizeClientId('gcu'), 'gcu');
  assert.strictEqual(sanitizeClientId('Client-123_ABC'), 'Client-123_ABC');
  assert.strictEqual(sanitizeClientId('a'.repeat(64)), 'a'.repeat(64));
  console.log('[PASS] sanitizeClientId accepts well-formed ids unchanged');

  // --- sanitizeClientId: path-traversal / injection payloads rejected ---
  const malicious = [
    '../../etc/passwd',
    '..',
    '../',
    'a/../../b',
    '/etc/passwd',
    'client\0id',           // null byte
    'client id',            // whitespace inside
    'client;rm -rf /',
    'a'.repeat(65),         // over length cap
    '',                     // empty
    '   ',                  // whitespace-only
    'CON',                  // fine actually (alnum) -- kept out of this list
  ].filter(v => v !== 'CON');

  for (const payload of malicious) {
    assert.strictEqual(
      sanitizeClientId(payload),
      null,
      `sanitizeClientId should reject ${JSON.stringify(payload)}`
    );
  }
  console.log('[PASS] sanitizeClientId rejects path-traversal and malformed ids');

  // --- sanitizeClientId: non-string input never throws; it's coerced via
  //     String() and then run through the same allowlist regex, so a
  //     "safe-shaped" value (e.g. a plain number) is accepted, while
  //     anything that coerces to a traversal-shaped string is rejected ---
  assert.strictEqual(sanitizeClientId(undefined), null);
  assert.strictEqual(sanitizeClientId(null), null);
  assert.strictEqual(sanitizeClientId(42), '42'); // String(42) is alnum -> safe, allowed
  assert.strictEqual(sanitizeClientId(['../../x']), null); // String([...]) -> "../../x", rejected
  assert.strictEqual(sanitizeClientId({ toString: () => '../../x' }), null);
  console.log('[PASS] sanitizeClientId coerces non-strings safely (allow only if result is alnum-shaped)');

  // --- resolveHcClientId: client-role sessions always use session clientId,
  //     ignoring any query/body override (prevents one client reading
  //     another client's bucket) ---
  const clientSessionReq = {
    tsmSession: { role: 'client', clientId: 'gcu' },
    query: { clientId: '../../other-client' },
    body: {},
  };
  assert.strictEqual(resolveHcClientId(clientSessionReq), 'gcu');
  console.log('[PASS] resolveHcClientId ignores query override for client-role sessions');

  // --- resolveHcClientId: admin/staff session may pass a valid override ---
  const adminReqValid = {
    tsmSession: { role: 'admin' },
    query: { clientId: 'gcu' },
    body: {},
  };
  assert.strictEqual(resolveHcClientId(adminReqValid), 'gcu');
  console.log('[PASS] resolveHcClientId honors a valid admin-supplied clientId');

  // --- resolveHcClientId: admin/staff session with a malicious override
  //     falls back to 'default' instead of propagating the payload ---
  const adminReqMalicious = {
    tsmSession: { role: 'admin' },
    query: { clientId: '../../etc/passwd' },
    body: {},
  };
  assert.strictEqual(resolveHcClientId(adminReqMalicious), 'default');
  console.log('[PASS] resolveHcClientId falls back to "default" on malicious override');

  // --- resolveHcClientId: no session, no query/body -> 'default' ---
  assert.strictEqual(resolveHcClientId({ query: {}, body: {} }), 'default');
  console.log('[PASS] resolveHcClientId defaults cleanly with no input at all');

  // --- End-to-end: malicious id can never escape DATA_DIR via the
  //     hc*File() helpers once routed through resolveHcClientId ---
  const DATA_DIR = path.join(REPO_ROOT, 'data');
  const attackerReq = {
    tsmSession: { role: 'admin' },
    query: { clientId: '../../../../etc/passwd' },
    body: {},
  };
  const resolved = resolveHcClientId(attackerReq);
  for (const fileFn of [hcNodeStateFile, hcReportsFile, hcProfilesFile]) {
    const resolvedPath = fileFn(resolved);
    assert.ok(
      resolvedPath.startsWith(DATA_DIR + path.sep),
      `${fileFn.name} must resolve inside DATA_DIR, got ${resolvedPath}`
    );
  }
  console.log('[PASS] hc*File() helpers stay inside DATA_DIR even with a malicious clientId');

  console.log('\n=== SUMMARY ===');
  console.log('sanitizeClientId / resolveHcClientId reject path-traversal and');
  console.log('non-conforming clientId values; client-role sessions cannot be');
  console.log('overridden via query/body; hc*File() paths never escape DATA_DIR.');
}

run();
