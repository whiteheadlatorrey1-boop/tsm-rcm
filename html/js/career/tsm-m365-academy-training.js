'use strict';

/*
 * TSM Phase 10C — Academy Learning Loop
 *
 * Deterministic learning-state model.
 */

var VERSION = '10C.0';

var SEQUENCE = ['TRAIN', 'PRACTICE', 'VERIFY'];

function clean(v) {
  return String(v == null ? '' : v).trim();
}

function createModulePlan(module) {
  module = module || {};

  return {
    moduleId: clean(module.moduleId),
    title: clean(module.title),
    product: clean(module.product),
    sequence: SEQUENCE.slice(),
    stages: [
      {
        stage: 'TRAIN',
        status: 'available',
        evidenceRequired: false
      },
      {
        stage: 'PRACTICE',
        status: 'locked',
        evidenceRequired: true
      },
      {
        stage: 'VERIFY',
        status: 'locked',
        evidenceRequired: true
      }
    ]
  };
}

function advance(plan, currentStage, evidencePresent) {
  if (!plan || !Array.isArray(plan.stages)) {
    throw new Error('training plan required');
  }

  var stage = clean(currentStage);
  var index = SEQUENCE.indexOf(stage);

  if (index < 0) {
    throw new Error('invalid training stage');
  }

  if (stage !== 'TRAIN' && !evidencePresent) {
    throw new Error('evidence required');
  }

  if (index === SEQUENCE.length - 1) {
    return {
      stage: 'VERIFY',
      state: 'verified',
      completed: true
    };
  }

  return {
    stage: SEQUENCE[index + 1],
    state: SEQUENCE[index + 1] === 'VERIFY'
      ? 'verification'
      : 'practice',
    completed: false
  };
}

function buildPlans(modules) {
  return (Array.isArray(modules) ? modules : []).map(createModulePlan);
}

module.exports = {
  VERSION: VERSION,
  SEQUENCE: SEQUENCE.slice(),
  createModulePlan: createModulePlan,
  advance: advance,
  buildPlans: buildPlans
};
