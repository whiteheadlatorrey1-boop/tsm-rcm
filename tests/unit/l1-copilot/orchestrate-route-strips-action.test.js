'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../../../server.js'), 'utf8');
const start = src.indexOf("app.post('/api/l1-copilot/workflow/orchestrate'");
assert.ok(start !== -1, 'orchestrate route not found');
const next = src.indexOf('\napp.post(', start + 10);
const block = src.slice(start, next === -1 ? undefined : next);

let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log('PASS:', name); } else { fail++; console.log('FAIL:', name); } }

check('route does not pass req.body directly to orchestrate()', !/orchestrate\(\s*req\.body/.test(block));
check('route strips client-supplied action before orchestrate()', /const\s*\{\s*action:\s*_clientAction\s*,\s*\.\.\.orchestrateInput\s*\}\s*=\s*req\.body/.test(block) && /orchestrate\(\s*orchestrateInput\s*\)/.test(block));

console.log(`\n${pass} passed, ${fail} failed`);
assert.strictEqual(fail, 0);
