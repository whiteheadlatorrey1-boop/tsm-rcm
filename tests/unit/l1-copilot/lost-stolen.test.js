'use strict';

const assert = require('assert');

const {
  normalizeSecurityState,
  assessLostStolen,
  evaluateLostStolenReadiness
} = require('../../../server/l1-copilot/lost-stolen');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test('security states normalize safely', () => {
  assert.strictEqual(normalizeSecurityState('compliant'), 'COMPLIANT');
  assert.strictEqual(normalizeSecurityState('noncompliant'), 'NONCOMPLIANT');
  assert.strictEqual(normalizeSecurityState('non-compliant'), 'NONCOMPLIANT');
  assert.strictEqual(normalizeSecurityState('anything-else'), 'UNKNOWN');
});

test('missing user and asset verification blocks assessment', () => {
  const result = assessLostStolen({
    complianceStatus: 'COMPLIANT'
  });

  assert.strictEqual(result.recommendation, 'INSUFFICIENT_DATA');
  assert.ok(result.missingInputs.includes('userVerified'));
  assert.ok(result.missingInputs.includes('assetVerified'));
});

test('missing security status fails safe', () => {
  const result = assessLostStolen({
    userVerified: true,
    assetVerified: true
  });

  assert.strictEqual(result.recommendation, 'INSUFFICIENT_DATA');
  assert.ok(result.missingInputs.includes('securityStatus'));
});

test('noncompliant device recommends security escalation', () => {
  const result = assessLostStolen({
    userVerified: true,
    assetVerified: true,
    complianceStatus: 'NONCOMPLIANT'
  });

  assert.strictEqual(result.recommendation, 'SECURITY_ESCALATION');
  assert.strictEqual(result.suggestedAction, 'ESCALATION');
  assert.strictEqual(result.securityState, 'NONCOMPLIANT');
  assert.strictEqual(result.requiresSecurityGate, true);
  assert.strictEqual(result.autonomousActionAllowed, false);
  assert.strictEqual(result.humanApprovalRequired, true);
});

test('compliant device still requires security escalation for lost/stolen event', () => {
  const result = assessLostStolen({
    userVerified: true,
    assetVerified: true,
    complianceStatus: 'COMPLIANT'
  });

  assert.strictEqual(result.recommendation, 'SECURITY_ESCALATION');
  assert.strictEqual(result.suggestedAction, 'ESCALATION');
  assert.strictEqual(result.autonomousActionAllowed, false);
});

test('unknown security status is fail-safe', () => {
  const result = assessLostStolen({
    userVerified: true,
    assetVerified: true,
    complianceStatus: 'UNKNOWN'
  });

  assert.strictEqual(result.recommendation, 'SECURITY_ESCALATION');
  assert.strictEqual(result.securityState, 'UNKNOWN');
  assert.strictEqual(result.autonomousActionAllowed, false);
});

test('incomplete evidence blocks closure', () => {
  const result = evaluateLostStolenReadiness({
    userVerified: true,
    assetVerified: true,
    securityEscalation: true
  });

  assert.strictEqual(result.ready, false);
  assert.strictEqual(result.status, 'BLOCKED');
  assert.ok(result.missing.includes('securityActionVerified'));
  assert.ok(result.missing.includes('assetReconciled'));
  assert.ok(result.missing.includes('finalWorkNoteConfirmed'));
  assert.strictEqual(result.autonomousCloseAllowed, false);
});

test('complete evidence makes workflow closure-ready but never autonomous', () => {
  const result = evaluateLostStolenReadiness({
    userVerified: true,
    assetVerified: true,
    securityEscalation: true,
    securityActionVerified: true,
    assetReconciled: true,
    finalWorkNoteConfirmed: true
  });

  assert.strictEqual(result.ready, true);
  assert.strictEqual(result.status, 'READY');
  assert.deepStrictEqual(result.missing, []);
  assert.strictEqual(result.autonomousCloseAllowed, false);
});

console.log('L1 lost/stolen tests complete.');
