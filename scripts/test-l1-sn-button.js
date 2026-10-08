'use strict';
// Static checks for the "ServiceNow update draft" card in l1-ticket-copilot.html.
// Guards wiring and syntax; behavior is exercised by hand through the review flow.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'html', 'l1-copilot', 'l1-ticket-copilot.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL', m)); };

const i = html.indexOf('id="snDraftCard"');
ok(i > -1, 'draft card present');
const rest = html.slice(i);
const m = rest.match(/<script>([\s\S]*?)<\/script>/);
ok(!!m, 'card script found');
let compiles = false;
try { new vm.Script(m ? m[1] : ''); compiles = true; } catch (e) { console.log(e.message); }
ok(compiles, 'card script compiles');
const code = m ? m[1] : '';
ok(code.includes("'/api/l1/servicenow'"), 'calls the draft API');
ok(code.includes('/l1-copilot/l1-sn-review.html?id='), 'links to the review page');
ok(!/\/send|\/approve/.test(code), 'card never calls approve or send');
ok(html.includes('window.__l1SnSysId = t.sysId'), 'incident lookup captures sysId');
ok(/id="tkIncident"/.test(html) && /id="tkRequester"/.test(html) && /id="notesArea"/.test(html), 'source fields still exist');
ok(html.split('id="snDraftCard"').length === 2, 'card appears once');
ok(fs.existsSync(path.join(__dirname, '..', 'html', 'l1-copilot', 'l1-sn-review.html')), 'review page exists');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
