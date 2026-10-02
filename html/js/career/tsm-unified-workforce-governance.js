'use strict';

const VERSION = '14G.0';

function validate(input = {}) {
  const errors = [];

  if (input.contract !== 'unified_workforce_intelligence') {
    errors.push('invalid contract');
  }

  if (!input.candidateId) {
    errors.push('candidateId is required');
  }

  if (!Array.isArray(input.signals)) {
    errors.push('signals must be an array');
  }

  if (!Array.isArray(input.insights)) {
    errors.push('insights must be an array');
  }

  if (!Array.isArray(input.actions)) {
    errors.push('actions must be an array');
  }

  if (!Array.isArray(input.evidenceRefs)) {
    errors.push('evidenceRefs must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function enforceHumanReview(actions = []) {
  return actions.map(action => ({
    ...action,
    requiresHumanReview: true
  }));
}

module.exports = {
  VERSION,
  validate,
  enforceHumanReview
};
