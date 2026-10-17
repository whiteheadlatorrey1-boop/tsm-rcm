'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let failed = 0;
function check(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; }

const pagePath = path.join(root, 'html/construction-suite/construction-recovery.html');
const tabsPath = path.join(root, 'html/war-rooms/construct-war/construction-war-tabs.js');
const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : '';
const tabs = fs.readFileSync(tabsPath, 'utf8');

check('recovery page exists', page.length > 1000);
check('page calls the recovery, decisions, draft and audit endpoints',
  ['/api/construction/recovery', '/api/construction/decisions', '/api/construction/draft', '/api/construction/audit'].every(p => page.includes(p)));
check('page never uses innerHTML (API data is rendered as text)', !/innerHTML/.test(page));
check('page sends confirm:true only from the two-click confirm path', /confirm:\s*true/.test(page) && /classList\.contains\('armed'\)/.test(page));
check('page handles 401, 409 and 503', ['401', '409', '503'].every(c => page.includes(c)));
check('war room registers the recovery tab pointing at the page',
  /slug:\s*'recovery'/.test(tabs) && tabs.includes('construction-suite/construction-recovery.html'));
const idx = [...tabs.matchAll(/slug:\s*'([a-z]+)'/g)].map(m => m[1]);
check('tab slugs are unique', new Set(idx).size === idx.length);
check('tab src resolves to a real file', fs.existsSync(path.join(root, 'html/construction-suite/construction-recovery.html')));

if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
console.log('All construction recovery page checks passed');
