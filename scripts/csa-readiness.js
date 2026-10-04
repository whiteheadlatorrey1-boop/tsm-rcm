'use strict';
// node scripts/csa-readiness.js   (reads every recorded run and applies the weighted gate)
const { loadResults, readinessFromResults, resultsDir } = require('../server/certification/sim-record');
const ID = 'servicenow-csa-2026';
const results = loadResults(ID);
const r = readinessFromResults(ID, results);
const f = (n) => (n === null || n === undefined ? '-' : n.toFixed(1));
console.log(r.label);
console.log('Runs recorded: ' + results.length + ' (' + resultsDir() + '), counted as full: ' + r.sims.fullCount + ', latest full scores: ' + (r.sims.lastScores.join(', ') || '-'));
console.log('Weighted score: ' + f(r.weighted.score) + ' (' + r.weighted.coveredWeight + '% of blueprint covered)');
console.log('Domain'.padEnd(46) + 'wt   score  samples  status');
r.domains.forEach((d) => console.log(d.name.padEnd(46) + String(d.weight).padEnd(5) + f(d.score).padEnd(7) + String(d.sampleSize).padEnd(9) + d.status));
if (r.reasons.length) console.log('Why not ready:\n  ' + r.reasons.join('\n  '));
if (r.weakDomains.length) console.log('Weakest first: ' + r.weakDomains.map((w) => w.domainId).join(', '));
console.log(r.disclaimer);
