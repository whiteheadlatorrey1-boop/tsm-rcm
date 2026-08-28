'use strict';

/**
 * TSM PM Verification Engine v1
 *
 * Converts completed operational work into measurable verification.
 */

const VERSION = 'pm-verification-engine-v1';

function verifyOutcome(action, input = {}) {
  if (!action) {
    throw new Error('Action is required');
  }

  const verified = Boolean(input.verified);

  if (!verified) {
    return {
      engine: VERSION,
      actionId: action.id,
      verified: false,
      outcome: 'NOT_VERIFIED',
      exposureBefore: Number(action.exposure || 0),
      exposureAfter: null,
      exposureReduction: 0,
      verifiedAt: null,
      verifiedBy: input.verifiedBy || null,
      notes: input.notes || ''
    };
  }

  const before = Number(action.exposure || 0);
  const after = Number(
    input.exposureAfter == null ? before : input.exposureAfter
  );

  if (!Number.isFinite(after) || after < 0) {
    throw new Error('exposureAfter must be a non-negative number');
  }

  const reduction = Math.max(0, before - after);

  let outcome = 'NO_CHANGE';

  if (after === 0) {
    outcome = 'CONDITION_CLEARED';
  } else if (after < before) {
    outcome = 'EXPOSURE_REDUCED';
  } else if (after > before) {
    outcome = 'EXPOSURE_INCREASED';
  }

  return {
    engine: VERSION,
    actionId: action.id,
    verified: true,
    outcome,
    exposureBefore: before,
    exposureAfter: after,
    exposureReduction: reduction,
    verifiedAt: new Date().toISOString(),
    verifiedBy: input.verifiedBy || 'PM Manager',
    notes: input.notes || ''
  };
}

module.exports = {
  VERSION,
  verifyOutcome
};
