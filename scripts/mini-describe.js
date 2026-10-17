'use strict';
// Zero-dependency describe/it shim.  Usage: node -r ./scripts/mini-describe.js <test-file>
const mk = (name, parent) => ({ name, parent, tests: [], kids: [], before: [], after: [], beforeEach: [], afterEach: [] });
const root = mk('', null);
let cur = root;
const ctx = {};
function describe(name, fn) {
  const s = mk(name, cur); cur.kids.push(s);
  const prev = cur; cur = s;
  try { fn.call(ctx); } finally { cur = prev; }
}
describe.skip = () => {};
describe.only = describe;
function it(name, fn) { cur.tests.push({ name, fn }); }
it.skip = () => {};
it.only = it;
Object.assign(global, {
  describe, it, test: it, context: describe,
  before: (f) => cur.before.push(f), after: (f) => cur.after.push(f),
  beforeEach: (f) => cur.beforeEach.push(f), afterEach: (f) => cur.afterEach.push(f),
});
function call(fn) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout after 10s')), 10000);
    const done = (e) => { clearTimeout(t); e ? reject(e) : resolve(); };
    try {
      if (fn.length > 0) fn.call(ctx, done);
      else Promise.resolve(fn.call(ctx)).then(() => done(), (e) => done(e || new Error('rejected')));
    } catch (e) { done(e); }
  });
}
let passed = 0, failed = 0;
const out = [];
async function runSuite(s, trail, be, ae) {
  const label = s.name ? trail.concat(s.name) : trail;
  const beach = be.concat(s.beforeEach), aeach = s.afterEach.concat(ae);
  for (const h of s.before) await call(h);
  for (const t of s.tests) {
    const full = label.concat(t.name).join(' > ');
    try {
      for (const h of beach) await call(h);
      await call(t.fn);
      for (const h of aeach) await call(h);
      passed++; out.push('PASS ' + full);
    } catch (e) {
      failed++;
      out.push('FAIL ' + full + '\n      ' + String((e && e.stack) || e).split('\n').slice(0, 3).join('\n      '));
    }
  }
  for (const k of s.kids) await runSuite(k, label, beach, aeach);
  for (const h of s.after) await call(h);
}
setImmediate(async () => {
  try { await runSuite(root, [], [], []); } catch (e) { failed++; out.push('FAIL (hook) ' + e.message); }
  out.push(passed + ' passed, ' + failed + ' failed');
  process.stdout.write(out.join('\n') + '\n', () => process.exit(failed ? 1 : 0));
});
