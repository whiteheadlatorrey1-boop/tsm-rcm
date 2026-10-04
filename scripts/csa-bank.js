'use strict';
// node scripts/csa-bank.js status
// node scripts/csa-bank.js review <questionId> "<Reviewer Name>"
const { getWeightedBlueprint } = require('../server/certification/weighted-blueprints');
const { loadBank, markReviewed, validateBank } = require('../server/certification/question-bank');
const { bankCoverage } = require('../server/certification/simulation');
const ID = 'servicenow-csa-2026';
const [cmd, a, b] = process.argv.slice(2);
if (cmd === 'review') {
  try { const q = markReviewed(ID, a, b); console.log('Marked reviewed: ' + q.id + ' by ' + q.reviewedBy); }
  catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
} else {
  const bp = getWeightedBlueprint(ID); const bank = loadBank(ID);
  const problems = validateBank(bank, bp);
  console.log('Domain'.padEnd(26) + 'have  need  reviewed');
  bankCoverage(bank, bp).forEach((c) => console.log(c.domainId.padEnd(26) + String(c.have).padEnd(6) + String(c.need).padEnd(6) + c.reviewed));
  console.log('Total questions: ' + bank.length + ', reviewed: ' + bank.filter((q) => q.reviewed).length);
  console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'Bank validation: OK');
}
