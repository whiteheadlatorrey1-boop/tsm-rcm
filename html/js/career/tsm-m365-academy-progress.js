'use strict';

/*
 * TSM Phase 10F — Learner Progress Model.
 */

var VERSION = '10F.0';

var STATES = [
  'not_started',
  'in_progress',
  'practice',
  'verification',
  'verified',
  'completed'
];

function clean(v) {
  return String(v == null ? '' : v).trim();
}

function createProgress(candidateId, moduleId) {
  return {
    candidateId: clean(candidateId),
    moduleId: clean(moduleId),
    state: 'not_started',
    trainCompleted: false,
    practiceAttempts: 0,
    practiceCompleted: false,
    verificationAttempts: 0,
    verified: false,
    evidenceRefs: [],
    startedAt: null,
    completedAt: null
  };
}

function applyEvent(progress, event) {
  var next = Object.assign({}, progress || {});
  event = event || {};

  var type = clean(event.type);

  if (type === 'train_completed') {
    next.trainCompleted = true;
    next.state = 'practice';
  } else if (type === 'practice_attempt') {
    next.practiceAttempts += 1;
    next.state = 'practice';
  } else if (type === 'practice_completed') {
    next.practiceCompleted = true;
    next.state = 'verification';
  } else if (type === 'verification_attempt') {
    next.verificationAttempts += 1;
    next.state = 'verification';
  } else if (type === 'verification_passed') {
    next.verified = true;
    next.state = 'verified';
    next.completedAt = event.timestamp || null;
  } else {
    throw new Error('unknown academy progress event');
  }

  if (event.evidenceId) {
    var id = clean(event.evidenceId);
    if (next.evidenceRefs.indexOf(id) === -1) {
      next.evidenceRefs.push(id);
    }
  }

  return next;
}

function summarize(progressRecords) {
  var records = Array.isArray(progressRecords) ? progressRecords : [];

  return {
    modules: records.length,
    verifiedModules: records.filter(function (record) {
      return record.verified === true;
    }).length,
    inProgressModules: records.filter(function (record) {
      return record.state !== 'not_started' &&
        record.verified !== true;
    }).length,
    evidenceRefs: records.reduce(function (total, record) {
      return total + (
        Array.isArray(record.evidenceRefs)
          ? record.evidenceRefs.length
          : 0
      );
    }, 0)
  };
}

module.exports = {
  VERSION: VERSION,
  STATES: STATES.slice(),
  createProgress: createProgress,
  applyEvent: applyEvent,
  summarize: summarize
};
