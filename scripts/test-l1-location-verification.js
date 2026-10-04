'use strict';
const { evaluateLocationVerification: ev } = require('../server/l1-copilot/location-verification');
let failed = 0;
function ok(c, m) { if (c) console.log('  ok   ' + m); else { failed++; console.error('  FAIL ' + m); } }
const base = { taskType: 'Foot Move', assetTag: 'A123', fromLocation: 'Bldg 1 Fl 2', toLocation: 'Bldg 2 Fl 3', cmdbLocation: 'bldg 2  fl 3' };
ok(ev(base).locationVerified === true, 'matching CMDB location verifies (case/space-insensitive)');
ok(ev({ ...base, cmdbLocation: 'Bldg 1 Fl 2' }).locationVerified === false, 'mismatched CMDB location blocks');
ok(ev({ ...base, cmdbLocation: '' }).missing.includes('cmdbLocation'), 'missing CMDB location blocks');
ok(ev({ ...base, toLocation: '' }).missing.includes('toLocation'), 'missing to-location blocks');
ok(ev({ ...base, fromLocation: '' }).missing.includes('fromLocation'), 'foot move requires from-location');
ok(ev({ ...base, fromLocation: 'Bldg 2 Fl 3' }).locationVerified === false, 'identical from/to blocks');
ok(ev({ ...base, taskType: 'ONBOARDING', fromLocation: '' }).locationVerified === true, 'onboarding does not need from-location');
ok(ev({ ...base, taskType: 'OFFBOARDING', fromLocation: '' }).locationVerified === true, 'offboarding does not need from-location');
ok(ev({ ...base, taskType: 'HARDWARE' }).applicable === false, 'other task types are not applicable');
ok(ev(null).locationVerified === false, 'null input fails safe');
ok(ev({ ...base, locationVerified: true, cmdbLocation: 'X' }).locationVerified === false, 'a ticked flag cannot override evidence');
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('location verification: all passed');
