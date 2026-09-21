'use strict';

/**
 * Auth hardening regression: sessions fail closed (no role / no exp / bad
 * signature / expired), the role guards honour that, and safeEqual is a
 * constant-time compare that never matches empty or non-string input.
 */

process.env.TSM_SESSION_SECRET = process.env.TSM_SESSION_SECRET || 'test-secret-for-auth-hardening';
const auth = require('../middleware/require-auth');

let passed = 0;
let failed = 0;
function ok(condition, message) {
  if (condition) { passed += 1; console.log('OK: ' + message); }
  else { failed += 1; console.error('FAIL: ' + message); }
}

function cookieFor(payload) { return 'tsm_session=' + encodeURIComponent(auth.signSession(payload)); }
function call(mw, cookie) {
  const req = { headers: { cookie: cookie || '' }, cookies: undefined };
  const res = { code: null, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  let nexted = false;
  mw(req, res, () => { nexted = true; });
  return { req, res, nexted };
}
const future = Date.now() + 60 * 1000;

// ── verifySession fails closed ──
ok(auth.verifySession(auth.signSession({ role: 'admin', exp: future })).role === 'admin', 'valid session verifies');
ok(auth.verifySession(auth.signSession({ exp: future })) === null, 'signed session with no role is rejected (was: admin)');
ok(auth.verifySession(auth.signSession({ role: '', exp: future })) === null, 'empty role is rejected');
ok(auth.verifySession(auth.signSession({ role: 7, exp: future })) === null, 'non-string role is rejected');
ok(auth.verifySession(auth.signSession({ role: 'admin' })) === null, 'session with no exp is rejected (was: never expires)');
ok(auth.verifySession(auth.signSession({ role: 'admin', exp: 'soon' })) === null, 'non-numeric exp is rejected');
ok(auth.verifySession(auth.signSession({ role: 'admin', exp: Date.now() - 1 })) === null, 'expired session is rejected');
const good = auth.signSession({ role: 'client', clientId: 'c1', exp: future });
ok(auth.verifySession(good.replace(/^[^.]+/, m => m.slice(0, -1) + (m.slice(-1) === 'A' ? 'B' : 'A'))) === null, 'tampered body is rejected');
ok(auth.verifySession(good.slice(0, -2) + 'xx') === null, 'wrong signature is rejected');
ok(auth.verifySession('') === null && auth.verifySession(null) === null && auth.verifySession('a.b.c') === null, 'empty / malformed tokens are rejected');

// ── role guards ──
let r = call(auth.requireRole(['admin']), cookieFor({ exp: future }));
ok(r.res.code === 401 && !r.nexted, 'requireRole: role-less session gets 401, not admin access');
r = call(auth.requireRole(['admin']), cookieFor({ role: 'client', clientId: 'c1', exp: future }));
ok(r.res.code === 403 && !r.nexted, 'requireRole: client hitting an admin route gets 403');
r = call(auth.requireRole(['admin', 'manager']), cookieFor({ role: 'manager', staffId: 's1', exp: future }));
ok(r.nexted && r.req.tsmSession.role === 'manager' && r.req.tsmSession.staffId === 's1', 'requireRole: allowed role passes and sets tsmSession');
r = call(auth.requireRole(['admin']), '');
ok(r.res.code === 401 && !r.nexted, 'requireRole: no cookie gets 401');
r = call(auth.requireAnyAuth, cookieFor({ exp: future }));
ok(r.res.code === 401 && !r.nexted, 'requireAnyAuth: role-less session gets 401');
r = call(auth.requireAnyAuth, cookieFor({ role: 'client', clientId: 'c1', exp: future }));
ok(r.nexted && r.req.tsmSession.role === 'client', 'requireAnyAuth: valid client session passes');

// ── safeEqual ──
ok(auth.safeEqual('s3cret', 's3cret') === true, 'safeEqual: equal strings match');
ok(auth.safeEqual('s3cret', 's3creT') === false, 'safeEqual: different strings do not match');
ok(auth.safeEqual('short', 'a-much-longer-value') === false, 'safeEqual: different lengths do not match');
ok(auth.safeEqual('', '') === false && auth.safeEqual('x', '') === false, 'safeEqual: empty never matches');
ok(auth.safeEqual(undefined, 'x') === false && auth.safeEqual({}, 'x') === false && auth.safeEqual(5, 5) === false, 'safeEqual: non-strings never match');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
