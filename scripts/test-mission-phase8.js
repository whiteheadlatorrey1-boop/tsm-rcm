// Phase 8 test — verbatim logic pulled from server.js lines 1556-1578 (commit 4ca19b34)
const TEAM_BY_VERTICAL = {};
const DEFAULT_OWNER = 'Latorrey';

function suggestTeam(parsed) {
  if (!parsed.primaryVertical) return DEFAULT_OWNER;
  return TEAM_BY_VERTICAL[parsed.primaryVertical] || DEFAULT_OWNER;
}

function scorePriority(parsed, validation, confidence) {
  const amountNum = Number(parsed.amount) || 0;
  const hasDefects = Array.isArray(parsed.defectFlags) && parsed.defectFlags.length > 0;

  if (!validation.valid) return 'Needs Review';
  if (confidence < 0.5) return 'Needs Review';
  if (hasDefects || amountNum > 25000) return 'High';
  if (amountNum > 5000) return 'Medium';
  return 'Low';
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name + (ok ? '' : ` (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`));
  ok ? pass++ : fail++;
}

// suggestTeam
check('suggestTeam: no primaryVertical -> DEFAULT_OWNER', suggestTeam({}), 'Latorrey');
check('suggestTeam: any vertical (empty map) -> DEFAULT_OWNER', suggestTeam({ primaryVertical: 'construction' }), 'Latorrey');
check('suggestTeam: unknown vertical -> DEFAULT_OWNER', suggestTeam({ primaryVertical: 'zzz' }), 'Latorrey');

// scorePriority
check('scorePriority: invalid validation -> Needs Review (even high amount)',
  scorePriority({ amount: 999999 }, { valid: false }, 0.99), 'Needs Review');
check('scorePriority: low confidence -> Needs Review',
  scorePriority({ amount: 100 }, { valid: true }, 0.49), 'Needs Review');
check('scorePriority: confidence exactly 0.5 -> not Needs Review (boundary)',
  scorePriority({ amount: 0 }, { valid: true }, 0.5), 'Low');
check('scorePriority: defect flags present, low amount -> High',
  scorePriority({ amount: 10, defectFlags: ['x'] }, { valid: true }, 0.9), 'High');
check('scorePriority: amount exactly 25000 -> not High (boundary, not >)',
  scorePriority({ amount: 25000 }, { valid: true }, 0.9), 'Medium');
check('scorePriority: amount 25001 -> High',
  scorePriority({ amount: 25001 }, { valid: true }, 0.9), 'High');
check('scorePriority: amount exactly 5000 -> not Medium (boundary, not >)',
  scorePriority({ amount: 5000 }, { valid: true }, 0.9), 'Low');
check('scorePriority: amount 5001 -> Medium',
  scorePriority({ amount: 5001 }, { valid: true }, 0.9), 'Medium');
check('scorePriority: amount 0, no defects, valid, high confidence -> Low',
  scorePriority({ amount: 0 }, { valid: true }, 0.9), 'Low');
check('scorePriority: non-numeric amount -> treated as 0 -> Low',
  scorePriority({ amount: 'garbage' }, { valid: true }, 0.9), 'Low');
check('scorePriority: empty defectFlags array -> not treated as defects',
  scorePriority({ amount: 100, defectFlags: [] }, { valid: true }, 0.9), 'Low');

console.log(`\nPhase 8: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
