'use strict';

/*
 * TSM Phase 12F — Employer Activity.
 */

var VERSION = '12F.0';

var TYPES = [
  'call',
  'email',
  'meeting',
  'note',
  'referral',
  'proposal',
  'job_order',
  'follow_up',
  'other'
];

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function createActivity(input) {
  input = input || {};

  return {
    activityId: clean(input.activityId || input.id),
    accountId: clean(input.accountId),
    contactId: clean(input.contactId) || null,
    opportunityId: clean(input.opportunityId) || null,
    jobOrderId: clean(input.jobOrderId) || null,
    type: clean(input.type || 'note'),
    subject: clean(input.subject),
    actorId: clean(input.actorId),
    occurredAt: input.occurredAt || null,
    nextAction: clean(input.nextAction) || null,
    source: clean(input.source || 'crm')
  };
}

function validateActivity(activity) {
  var failures = [];
  activity = activity || {};

  if (!activity.activityId) failures.push('activity_id_required');
  if (!activity.accountId) failures.push('account_id_required');
  if (TYPES.indexOf(activity.type) < 0) {
    failures.push('invalid_activity_type');
  }

  return {
    valid: failures.length === 0,
    failures: failures
  };
}

function listByAccount(activities, accountId) {
  var id = clean(accountId);

  return (Array.isArray(activities) ? activities : []).filter(function (item) {
    return clean(item.accountId) === id;
  });
}

module.exports = {
  VERSION: VERSION,
  TYPES: TYPES.slice(),
  createActivity: createActivity,
  validateActivity: validateActivity,
  listByAccount: listByAccount
};
