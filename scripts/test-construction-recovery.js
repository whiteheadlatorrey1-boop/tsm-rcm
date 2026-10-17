'use strict';
const eng = require('../lib/construction-recovery.js');

let failed = 0;
function check(name, ok) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name);
  if (!ok) failed++;
}

const data = eng.buildSampleGCSeed();
const again = eng.buildSampleGCSeed();

check('seed is deterministic', JSON.stringify(data) === JSON.stringify(again));
check('23 open RFIs, 6 critical-path', data.rfis.length === 23 && data.rfis.filter(r => r.criticalPath).length === 6);
check('11 pending change orders totaling $2.7M', data.changeOrders.length === 11 && data.changeOrders.reduce((s, c) => s + c.amount, 0) === 2700000);
check('7 late submittals', data.submittals.length === 7);

const ranked = eng.rankExposures(data);
check('ranking covers every exposure (41)', ranked.length === 41);
check('ranking is sorted by score descending', ranked.every((x, i) => i === 0 || ranked[i - 1].score >= x.score));
check('top exposure is the electrical gear change order', ranked[0].id === 'CO-01');

const sv = eng.scheduleVariance(data.project);
check('schedule variance is 9 weeks behind, SPI 0.77', sv.weeksBehind === 9 && sv.spi === 0.77);

const impact = eng.changeOrderImpact(data.changeOrders[2], data.project);
check('CO-03 impact: $82K, 9 business days = 1.8 weeks', impact.scheduleWeeks === 1.8 && impact.pctOfContract === 0.17);

const before = eng.forecastAtCompletion(data.project, []);
const after = eng.forecastAtCompletion(data.project, eng.RECOVERY_PLAN);
check('forecast before recovery: +$3.1M', before.overrun === 3100000);
check('forecast after recovery: +$1.4M, 5 weeks recovered, 4 behind', after.overrun === 1400000 && after.weeksRecovered === 5 && after.weeksBehindAfter === 4);

const d = eng.decideChangeOrders(data.changeOrders);
const count = k => d.filter(x => x.decision === k).length;
check('decisions: 4 approve, 2 reject, 1 escalate', count('approve') === 4 && count('reject') === 2 && count('escalate') === 1);
check('every decision carries a reason', d.every(x => x.reason && x.reason.length > 10));

if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
console.log('All construction recovery checks passed');
