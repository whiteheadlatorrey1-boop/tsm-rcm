'use strict';

/*
 * TSM Phase 11F — HR Case Workflow.
 */

var VERSION = '11F.0';

var STATES = [
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createCase(input) {
  input = input || {};

  return {
    caseId: clean(input.caseId),
    workerId: clean(input.workerId),
    category: clean(input.category || 'general_hr'),
    subject: clean(input.subject),
    priority: clean(input.priority || 'normal'),
    state: 'open',
    assignedTo: clean(input.assignedTo) || null,
    history: []
  };
}

function transition(caseRecord, nextState, actorId) {
  caseRecord = caseRecord || {};
  var from = clean(caseRecord.state || 'open');
  var to = clean(nextState);

  if (STATES.indexOf(to) < 0) {
    throw new Error('invalid HR case state');
  }

  if (from === 'closed') {
    throw new Error('closed HR case is terminal');
  }

  var allowed = {
    open: ['in_progress', 'pending', 'closed'],
    in_progress: ['pending', 'resolved', 'closed'],
    pending: ['in_progress', 'resolved', 'closed'],
    resolved: ['closed', 'in_progress']
  };

  if (!allowed[from] || allowed[from].indexOf(to) < 0) {
    throw new Error(
      'invalid HR case transition: ' + from + ' -> ' + to
    );
  }

  var next = Object.assign({}, caseRecord);

  next.state = to;
  next.history = Array.isArray(caseRecord.history)
    ? caseRecord.history.slice()
    : [];

  next.history.push({
    from: from,
    to: to,
    actorId: clean(actorId) || null
  });

  return next;
}

function listByWorker(cases, workerId) {
  var id = clean(workerId);

  return (Array.isArray(cases) ? cases : []).filter(function (record) {
    return clean(record.workerId) === id;
  });
}

module.exports = {
  VERSION: VERSION,
  STATES: STATES.slice(),
  createCase: createCase,
  transition: transition,
  listByWorker: listByWorker
};
