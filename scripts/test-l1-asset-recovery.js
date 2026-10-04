'use strict';

/**
 * L1 asset recovery evaluator regression.
 *
 * Proves:
 *   - OFFBOARDING and HARDWARE SWAP are in scope; other task types are not
 *     and fall back to the plain assetVerified checkbox (applies: false)
 *   - every required field (assetTag, cmdbAsset, recoveryOutcome,
 *     technicianConfirmed) is individually enforced
 *   - an exception outcome requires a written reason
 *   - a CMDB record that doesn't match the entered tag is never accepted,
 *     even if every other field is present
 *   - a fully evidenced case resolves to assetVerified: true
 *   - the module never requires or performs any network call (no requires
 *     of http/https/fetch-capable modules; purely a function of its input)
 *
 * Run:
 *   node scripts/test-l1-asset-recovery.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  evaluateAssetRecovery,
  isAssetRecoveryTask,
  ASSET_RECOVERY_TASK_TYPES,
  RECOVERY_OUTCOMES
} = require('../server/l1-copilot/asset-recovery');

let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed++;
    console.log('PASS: ' + message);
  } else {
    failed++;
    console.error('FAIL: ' + message);
  }
}

const validCmdb = { assetTag: 'LT-00123', status: 'In Stock' };

console.log('\n=== L1 ASSET RECOVERY EVALUATOR ===');

/* ---------------------------------------------------------------- */
/* Scope                                                              */
/* ---------------------------------------------------------------- */

ok(isAssetRecoveryTask('OFFBOARDING') === true, 'OFFBOARDING is an asset-recovery task type');
ok(isAssetRecoveryTask('HARDWARE SWAP') === true, 'HARDWARE SWAP is an asset-recovery task type');
ok(isAssetRecoveryTask('ONBOARDING') === false, 'ONBOARDING is NOT an asset-recovery task type');
ok(isAssetRecoveryTask('INCIDENT') === false, 'INCIDENT is NOT an asset-recovery task type');
ok(isAssetRecoveryTask('FOOT MOVE') === false, 'FOOT MOVE is NOT an asset-recovery task type');

const outOfScope = evaluateAssetRecovery({ taskType: 'INCIDENT' });
ok(outOfScope.applies === false, 'out-of-scope task type returns applies: false');
ok(outOfScope.assetVerified === null, 'out-of-scope task type returns assetVerified: null (defer to the plain checkbox)');

/* ---------------------------------------------------------------- */
/* Required fields, each individually enforced                       */
/* ---------------------------------------------------------------- */

const missingTag = evaluateAssetRecovery({
  taskType: 'OFFBOARDING',
  cmdbAsset: validCmdb,
  recoveryOutcome: 'RETURNED_TO_STOCK',
  technicianConfirmed: true
});
ok(missingTag.applies === true && missingTag.assetVerified === false, 'missing assetTag blocks verification');
ok(missingTag.missing.includes('assetTag'), 'missing assetTag is reported');

const missingCmdb = evaluateAssetRecovery({
  taskType: 'OFFBOARDING',
  assetTag: 'LT-00123',
  recoveryOutcome: 'RETURNED_TO_STOCK',
  technicianConfirmed: true
});
ok(missingCmdb.assetVerified === false && missingCmdb.missing.includes('cmdbAsset'), 'no CMDB lookup result blocks verification (an asset tag alone is not evidence)');

const missingOutcome = evaluateAssetRecovery({
  taskType: 'OFFBOARDING',
  assetTag: 'LT-00123',
  cmdbAsset: validCmdb,
  technicianConfirmed: true
});
ok(missingOutcome.assetVerified === false && missingOutcome.missing.includes('recoveryOutcome'), 'missing recoveryOutcome blocks verification');

const badOutcome = evaluateAssetRecovery({
  taskType: 'OFFBOARDING',
  assetTag: 'LT-00123',
  cmdbAsset: validCmdb,
  recoveryOutcome: 'MADE_IT_UP',
  technicianConfirmed: true
});
ok(badOutcome.missing.includes('recoveryOutcome'), 'an outcome outside RECOVERY_OUTCOMES is rejected, not accepted as free text');

const missingConfirm = evaluateAssetRecovery({
  taskType: 'HARDWARE SWAP',
  assetTag: 'LT-00123',
  cmdbAsset: validCmdb,
  recoveryOutcome: 'REASSIGNED'
});
ok(missingConfirm.assetVerified === false && missingConfirm.missing.includes('technicianConfirmed'), 'missing technician confirmation blocks verification, even with everything else present');

/* ---------------------------------------------------------------- */
/* Exception outcome requires a written reason                       */
/* ---------------------------------------------------------------- */

const exceptionNoReason = evaluateAssetRecovery({
  taskType: 'OFFBOARDING',
  assetTag: 'LT-00123',
  cmdbAsset: validCmdb,
  recoveryOutcome: 'EXCEPTION_NOT_RECOVERED',
  technicianConfirmed: true
});
ok(exceptionNoReason.missing.includes('exceptionReason'), 'EXCEPTION_NOT_RECOVERED without a written reason is blocked');

const exceptionWithReason = evaluateAssetRecovery({
  taskType: 'OFFBOARDING',
  assetTag: 'LT-00123',
  cmdbAsset: validCmdb,
  recoveryOutcome: 'EXCEPTION_NOT_RECOVERED',
  exceptionReason: 'Employee departed same-day; asset shipped back by mail, tracking attached to ticket.',
  technicianConfirmed: true
});
ok(exceptionWithReason.assetVerified === true, 'EXCEPTION_NOT_RECOVERED with a documented reason can still be marked verified (documented, not silently dropped)');

/* ---------------------------------------------------------------- */
/* CMDB tag mismatch is never accepted                                */
/* ---------------------------------------------------------------- */

const mismatch = evaluateAssetRecovery({
  taskType: 'HARDWARE SWAP',
  assetTag: 'LT-00123',
  cmdbAsset: { assetTag: 'LT-99999', status: 'In Stock' },
  recoveryOutcome: 'RETURNED_TO_STOCK',
  technicianConfirmed: true
});
ok(mismatch.assetVerified === false, 'a CMDB record for a different asset tag is never accepted');
ok(mismatch.missing.includes('assetTagMismatch'), 'tag mismatch is reported explicitly');

/* ---------------------------------------------------------------- */
/* Fully evidenced case                                               */
/* ---------------------------------------------------------------- */

const complete = evaluateAssetRecovery({
  taskType: 'OFFBOARDING',
  assetTag: 'lt-00123', // lowercase/whitespace on purpose -- must still match
  cmdbAsset: validCmdb,
  recoveryOutcome: 'WIPED_AND_RETURNED',
  technicianConfirmed: true
});
ok(complete.applies === true && complete.assetVerified === true, 'a fully evidenced, matching, technician-confirmed case resolves to assetVerified: true');
ok(complete.assetTag === 'LT-00123', 'asset tag is normalized for comparison/storage');

/* ---------------------------------------------------------------- */
/* No network capability                                              */
/* ---------------------------------------------------------------- */

const src = fs.readFileSync(
  path.join(__dirname, '../server/l1-copilot/asset-recovery.js'),
  'utf8'
);
ok(
  !/require\(['"](http|https|net|dgram)['"]\)/.test(src) && !/fetch\s*\(/.test(src),
  'asset-recovery.js contains no network-capable requires or fetch calls (pure evaluator)'
);

console.log('');
console.log('PASSED: ' + passed);
console.log('FAILED: ' + failed);

if (failed > 0) {
  process.exit(1);
}

console.log('');
console.log('L1 ASSET RECOVERY: PASS');
