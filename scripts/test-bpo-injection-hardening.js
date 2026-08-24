'use strict';

// Regression test for the NoSQL operator-injection guard
// (server/security/mongo-sanitize.js) and the CSV formula-injection guard
// (bpoToCsv() in server.js), landed in c4628cf8 / PR #109.
//
// No persisted regression script existed for these two fixes at the time
// they landed (the commit message cites 24 isolated assertions that were
// never saved to scripts/), unlike every other BPO fix in this repo. This
// closes that gap so a future change to either function is caught by
// `npm run test:bpo`-style sweeps instead of relying on manual re-verification.

const assert = require('assert');
const { deepSanitize } = require('../server/security/mongo-sanitize');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  OK  ', msg); }
  else { fail++; console.log('  FAIL', msg); }
}

console.log('1. mongo-sanitize: injection attempts stripped');
ok(JSON.stringify(deepSanitize({ status: { $ne: null } })) === JSON.stringify({ status: {} }), 'top-level $ne operator stripped');
ok(JSON.stringify(deepSanitize({ a: { b: { $gt: 5 } } })) === JSON.stringify({ a: { b: {} } }), 'nested operator stripped');
ok(JSON.stringify(deepSanitize({ 'a.b': 1 })) === JSON.stringify({}), 'dotted-path key stripped');
ok(JSON.stringify(deepSanitize([{ $where: 'x' }, { ok: 1 }])) === JSON.stringify([{}, { ok: 1 }]), 'array elements walked and sanitized');

console.log('2. mongo-sanitize: legitimate data passes through unchanged');
ok(JSON.stringify(deepSanitize({ status: 'open', clientId: 'acme' })) === JSON.stringify({ status: 'open', clientId: 'acme' }), 'plain object passes');
ok(JSON.stringify(deepSanitize({ tags: ['a', 'b'] })) === JSON.stringify({ tags: ['a', 'b'] }), 'array of primitives passes');
ok(JSON.stringify(deepSanitize({ nested: { ok: true, deep: { x: 1 } } })) === JSON.stringify({ nested: { ok: true, deep: { x: 1 } } }), 'legit nested object passes');
{
  const d = new Date();
  ok(deepSanitize({ when: d }).when.getTime() === d.getTime(), 'Date instance passes through untouched (not treated as plain object)');
}
ok(deepSanitize(null) === null, 'null passes');
ok(deepSanitize(undefined) === undefined, 'undefined passes');
ok(deepSanitize('plain string') === 'plain string', 'string passes');
ok(deepSanitize(42) === 42, 'number passes');

console.log('3. bpoToCsv: formula-injection guard');
{
  // bpoToCsv is defined inline in server.js (not exported as a module) —
  // extract it via source-slice + eval, same constraint as the other
  // stubbed-mongodb tests in this directory that can't require() server.js
  // directly without booting the whole app.
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'server.js'), 'utf8');
  const start = src.indexOf('function bpoToCsv');
  const end = src.indexOf('function bpoSendReport');
  assert(start > -1 && end > start, 'bpoToCsv not found in server.js — has it moved or been renamed?');
  // Indirect eval (the `(0, eval)` trick) runs in global/sloppy scope even
  // though this file is 'use strict' — a direct eval() here would scope the
  // function declaration to this block and leave bpoToCsv undefined outside it.
  (0, eval)(src.slice(start, end));

  ok(bpoToCsv([{ o: '=HYPERLINK("http://evil","x")' }], ['o']).includes("'=HYPERLINK"), '= prefix escaped with leading apostrophe');
  ok(bpoToCsv([{ o: '+1+1' }], ['o']).split('\n')[1] === "'+1+1", '+ prefix escaped');
  ok(bpoToCsv([{ o: '-1-1' }], ['o']).split('\n')[1] === "'-1-1", '- prefix escaped');
  ok(bpoToCsv([{ o: '@SUM(1)' }], ['o']).split('\n')[1] === "'@SUM(1)", '@ prefix escaped');
  ok(bpoToCsv([{ o: '\tcmd' }], ['o']).split('\n')[1] === "'\tcmd", 'tab prefix escaped');
  ok(bpoToCsv([{ o: 'normal, value' }], ['o']).split('\n')[1] === '"normal, value"', 'comma still RFC 4180 quoted, no formula prefix added');
  ok(bpoToCsv([{ o: 'she said "hi"' }], ['o']).split('\n')[1] === '"she said ""hi"""', 'embedded quotes doubled per RFC 4180');
  ok(bpoToCsv([{ o: 'plain' }], ['o']).split('\n')[1] === 'plain', 'ordinary value untouched');
  ok(bpoToCsv([{ o: '=cmd,x' }], ['o']).split('\n')[1] === '"\'=cmd,x"', 'formula prefix + comma: both mitigations apply together');
  ok(bpoToCsv([{ o: null }], ['o']).split('\n')[1] === '', 'null renders as empty string, no crash');
  ok(bpoToCsv([{ o: undefined }], ['o']).split('\n')[1] === '', 'undefined renders as empty string, no crash');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
