'use strict';

var assert = require('assert');

var contract =
  require('../../html/js/career/tsm-crm-operations-contract');

var account =
  require('../../html/js/career/tsm-crm-account');

var contact =
  require('../../html/js/career/tsm-crm-contact');

var opportunity =
  require('../../html/js/career/tsm-crm-opportunity');

var jobOrder =
  require('../../html/js/career/tsm-crm-job-order');

var activity =
  require('../../html/js/career/tsm-crm-activity');

var evidence =
  require('../../html/js/career/tsm-crm-evidence');

var dashboard =
  require('../../html/js/career/tsm-crm-dashboard');

var boundary =
  require('../../html/js/career/tsm-crm-boundary');

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS: ' + name);
  } catch (error) {
    failed += 1;
    console.error('FAIL: ' + name);
    console.error(error.message);
  }
}

/* 12A */

test('12A CRM contract identity', function () {
  var value = contract.createContract({
    account: {
      accountId: 'ACCT-12',
      name: 'Acme Health'
    }
  });

  assert.strictEqual(
    value.contract,
    'crm_employer_operations'
  );

  assert.strictEqual(
    value.account.accountId,
    'ACCT-12'
  );
});

test('12A CRM contract does not own staffing or HR state', function () {
  var value = contract.createEmptyContract('ACCT-12');

  assert.strictEqual(value.opportunities.length, 0);
  assert.strictEqual(value.jobOrders.length, 0);
});

/* 12B */

test('12B account creation', function () {
  var value = account.createAccount({
    accountId: 'ACCT-12',
    name: 'Acme Health'
  });

  assert.strictEqual(value.status, 'prospect');
  assert.strictEqual(value.name, 'Acme Health');
});

test('12B prospect can become active', function () {
  var value = account.createAccount({
    accountId: 'ACCT-12'
  });

  value = account.transition(value, 'active');

  assert.strictEqual(value.status, 'active');
});

test('12B invalid account transition rejected', function () {
  var value = account.createAccount({
    accountId: 'ACCT-12',
    status: 'prospect'
  });

  assert.throws(function () {
    account.transition(value, 'closed');
  });
});

/* 12C */

test('12C contact links to account', function () {
  var value = contact.createContact({
    contactId: 'CONTACT-1',
    accountId: 'ACCT-12',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    role: 'recruiter'
  });

  assert.strictEqual(
    contact.validateContact(value).valid,
    true
  );

  assert.strictEqual(value.accountId, 'ACCT-12');
});

test('12C contacts filter by account', function () {
  var result = contact.listByAccount([
    { contactId: 'C1', accountId: 'ACCT-12' },
    { contactId: 'C2', accountId: 'OTHER' }
  ], 'ACCT-12');

  assert.strictEqual(result.length, 1);
});

/* 12D */

test('12D lead starts open', function () {
  var value = opportunity.createLead({
    leadId: 'LEAD-1',
    companyName: 'Acme Health'
  });

  assert.strictEqual(value.state, 'open');
});

test('12D lead can be qualified into account', function () {
  var value = opportunity.createLead({
    leadId: 'LEAD-1',
    companyName: 'Acme Health'
  });

  value = opportunity.qualifyLead(value, 'ACCT-12');

  assert.strictEqual(value.state, 'qualified');
  assert.strictEqual(value.accountId, 'ACCT-12');
});

test('12D opportunity transitions deterministically', function () {
  var value = opportunity.createOpportunity({
    opportunityId: 'OPP-1',
    accountId: 'ACCT-12',
    name: 'Healthcare staffing'
  });

  value = opportunity.transition(value, 'qualified');
  value = opportunity.transition(value, 'proposal');
  value = opportunity.transition(value, 'won');

  assert.strictEqual(value.state, 'won');
});

test('12D closed opportunity is terminal', function () {
  var value = opportunity.createOpportunity({
    opportunityId: 'OPP-1',
    accountId: 'ACCT-12'
  });

  value = opportunity.transition(value, 'closed');

  assert.throws(function () {
    opportunity.transition(value, 'open');
  });
});

/* 12E */

test('12E job order links account', function () {
  var value = jobOrder.createJobOrder({
    jobOrderId: 'JOB-1',
    accountId: 'ACCT-12',
    title: 'IT Support Technician',
    requirements: ['Windows', 'ServiceNow']
  });

  assert.strictEqual(value.state, 'draft');
  assert.strictEqual(value.accountId, 'ACCT-12');
});

test('12E job order opens deterministically', function () {
  var value = jobOrder.createJobOrder({
    jobOrderId: 'JOB-1',
    accountId: 'ACCT-12'
  });

  value = jobOrder.transition(value, 'open');

  assert.strictEqual(value.state, 'open');
});

test('12E job order creates staffing input without owning placement', function () {
  var value = jobOrder.createJobOrder({
    jobOrderId: 'JOB-1',
    accountId: 'ACCT-12',
    title: 'IT Support Technician'
  });

  var staffingInput = jobOrder.toStaffingInput(value);

  assert.strictEqual(
    staffingInput.source,
    'crm_employer_operations'
  );

  assert.strictEqual(
    staffingInput.jobOrderId,
    'JOB-1'
  );

  assert.strictEqual(
    staffingInput.accountId,
    'ACCT-12'
  );
});

/* 12F */

test('12F employer activity links to account', function () {
  var value = activity.createActivity({
    activityId: 'ACT-1',
    accountId: 'ACCT-12',
    type: 'meeting',
    subject: 'Staffing discovery',
    actorId: 'USER-1'
  });

  assert.strictEqual(
    activity.validateActivity(value).valid,
    true
  );
});

test('12F activity filters by account', function () {
  var result = activity.listByAccount([
    { activityId: 'A1', accountId: 'ACCT-12' },
    { activityId: 'A2', accountId: 'OTHER' }
  ], 'ACCT-12');

  assert.strictEqual(result.length, 1);
});

/* 12G */

test('12G CRM evidence validates', function () {
  var value = evidence.createEvidence({
    evidenceId: 'CRM-EVID-1',
    accountId: 'ACCT-12',
    type: 'job_order',
    verified: true
  });

  assert.strictEqual(
    evidence.validateEvidence(value).valid,
    true
  );
});

test('12G duplicate evidence is removed', function () {
  var result = evidence.dedupe([
    {
      evidenceId: 'CRM-EVID-1',
      accountId: 'ACCT-12'
    },
    {
      evidenceId: 'CRM-EVID-1',
      accountId: 'ACCT-12'
    },
    {
      evidenceId: 'CRM-EVID-2',
      accountId: 'ACCT-12'
    }
  ]);

  assert.strictEqual(result.length, 2);
});

/* 12H */

test('12H CRM dashboard contract', function () {
  var value = dashboard.buildDashboard({
    account: {
      accountId: 'ACCT-12',
      name: 'Acme Health',
      status: 'active'
    }
  });

  assert.strictEqual(
    value.contract,
    'crm_employer_dashboard'
  );

  assert.strictEqual(
    value.account.accountId,
    'ACCT-12'
  );
});

test('12H dashboard counts open job orders', function () {
  var value = dashboard.buildDashboard({
    account: {
      accountId: 'ACCT-12'
    },
    jobOrders: [
      { state: 'open' },
      { state: 'filled' },
      { state: 'open' }
    ]
  });

  assert.strictEqual(value.jobOrders.total, 3);
  assert.strictEqual(value.jobOrders.open, 2);
});

test('12H dashboard does not write state', function () {
  var value = dashboard.buildDashboard({
    account: {
      accountId: 'ACCT-12'
    }
  });

  assert.strictEqual(
    value.boundaries.dashboardWritesState,
    false
  );
});

/* 12I */

test('12I CRM owns employer relationship', function () {
  var value = boundary.buildBoundary('ACCT-12');

  assert.strictEqual(
    value.crm.ownsEmployerRelationship,
    true
  );
});

test('12I staffing owns candidate placement', function () {
  var value = boundary.buildBoundary('ACCT-12');

  assert.strictEqual(
    value.staffing.ownsCandidateMatching,
    true
  );

  assert.strictEqual(
    value.staffing.ownsPlacementLifecycle,
    true
  );
});

test('12I HR owns employment lifecycle', function () {
  var value = boundary.buildBoundary('ACCT-12');

  assert.strictEqual(
    value.hr.ownsEmploymentLifecycle,
    true
  );
});

test('12I Candidate Registry remains canonical', function () {
  var value = boundary.buildBoundary('ACCT-12');

  assert.strictEqual(
    value.candidateRegistry.remainsCanonicalForCandidateIdentity,
    true
  );
});

test('12I CRM cannot rewrite staffing placement', function () {
  var value = boundary.buildBoundary('ACCT-12');

  assert.strictEqual(
    value.controls.crmDoesNotRewriteStaffingPlacement,
    true
  );
});

test('12I CRM cannot rewrite HR employment state', function () {
  var value = boundary.buildBoundary('ACCT-12');

  assert.strictEqual(
    value.controls.crmDoesNotRewriteHrEmploymentState,
    true
  );
});

console.log('');
console.log(
  'PHASE 12 CRM OPERATIONS TESTS — ' +
  passed + ' passed, ' + failed + ' failed'
);

if (failed) process.exit(1);
