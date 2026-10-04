'use strict';

const assert = require('assert');

const contract = require(
  '../../html/js/career/tsm-ats-hris-wfm-contract'
);

const requisition = require(
  '../../html/js/career/tsm-ats-requisition'
);

const application = require(
  '../../html/js/career/tsm-ats-application'
);

const worker = require(
  '../../html/js/career/tsm-workforce-profile'
);

const scheduling = require(
  '../../html/js/career/tsm-workforce-scheduling'
);

const assignment = require(
  '../../html/js/career/tsm-workforce-assignment'
);

const evidence = require(
  '../../html/js/career/tsm-workforce-evidence'
);

const dashboard = require(
  '../../html/js/career/tsm-workforce-dashboard'
);

const boundary = require(
  '../../html/js/career/tsm-ats-hris-wfm-boundary'
);

let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log(`PASS: ${name}`);
}

test('13A contract loads', () => {
  assert.strictEqual(contract.CONTRACT, 'ats_hris_wfm');
  assert.ok(contract.VERSION);
});

test('13A candidate normalization', () => {
  const c = contract.normalizeCandidate({
    candidateId: 'C-001',
    name: 'Test Candidate'
  });

  assert.strictEqual(c.candidateId, 'C-001');
});

test('13A requisition normalization', () => {
  const r = contract.normalizeRequisition({
    requisitionId: 'REQ-001',
    accountId: 'ACCT-001'
  });

  assert.strictEqual(r.requisitionId, 'REQ-001');
});

test('13A contract preserves separate domains', () => {
  const c = contract.createContract({
    candidate: { candidateId: 'C-001' },
    requisition: { requisitionId: 'REQ-001' }
  });

  assert.ok(c.candidate);
  assert.ok(c.requisition);
  assert.strictEqual(c.application, null);
  assert.strictEqual(c.worker, null);
});

test('13B requisition creates in draft', () => {
  const r = requisition.normalize({
    requisitionId: 'REQ-001',
    title: 'IT Support Technician'
  });

  assert.strictEqual(r.state, 'draft');
});

test('13B requisition opens', () => {
  const r = requisition.transition(
    { requisitionId: 'REQ-001', title: 'IT', state: 'draft' },
    'open',
    'USER-001'
  );

  assert.strictEqual(r.state, 'open');
  assert.strictEqual(r.lastActorId, 'USER-001');
});

test('13B invalid requisition transition rejected', () => {
  assert.throws(() => {
    requisition.transition(
      { requisitionId: 'REQ-001', state: 'closed' },
      'open',
      'USER-001'
    );
  });
});

test('13C application requires candidate', () => {
  assert.throws(() => {
    application.create({
      applicationId: 'APP-001',
      requisitionId: 'REQ-001'
    });
  });
});

test('13C application starts draft', () => {
  const a = application.create({
    applicationId: 'APP-001',
    candidateId: 'C-001',
    requisitionId: 'REQ-001'
  });

  assert.strictEqual(a.state, 'draft');
});

test('13C application submits', () => {
  const a = application.create({
    applicationId: 'APP-001',
    candidateId: 'C-001',
    requisitionId: 'REQ-001'
  });

  const next = application.transition(
    a,
    'submitted',
    'USER-001'
  );

  assert.strictEqual(next.state, 'submitted');
  assert.strictEqual(next.history.length, 1);
});

test('13C application reaches hired', () => {
  let a = application.create({
    applicationId: 'APP-001',
    candidateId: 'C-001',
    requisitionId: 'REQ-001'
  });

  for (const state of [
    'submitted',
    'screening',
    'interview',
    'offer',
    'hired'
  ]) {
    a = application.transition(a, state, 'USER-001');
  }

  assert.strictEqual(a.state, 'hired');
});

test('13D worker profile separates candidate and employee IDs', () => {
  const w = worker.create({
    workerId: 'W-001',
    candidateId: 'C-001'
  });

  assert.strictEqual(w.candidateId, 'C-001');
  assert.strictEqual(w.employeeId, null);
});

test('13D worker can receive employee identity', () => {
  const w = worker.create({
    workerId: 'W-001',
    candidateId: 'C-001'
  });

  const linked = worker.linkEmployee(w, 'E-001');

  assert.strictEqual(linked.employeeId, 'E-001');
  assert.strictEqual(linked.candidateId, 'C-001');
});

test('13E availability creates', () => {
  const a = scheduling.createAvailability({
    workerId: 'W-001'
  });

  assert.strictEqual(a.workerId, 'W-001');
  assert.deepStrictEqual(a.windows, []);
});

test('13E availability window added', () => {
  const a = scheduling.createAvailability({
    workerId: 'W-001'
  });

  const next = scheduling.addWindow(a, {
    start: '2026-10-05T09:00:00',
    end: '2026-10-05T17:00:00'
  });

  assert.strictEqual(next.windows.length, 1);
});

test('13F assignment starts planned', () => {
  const a = assignment.create({
    assignmentId: 'ASN-001',
    workerId: 'W-001'
  });

  assert.strictEqual(a.state, 'planned');
});

test('13F assignment reaches active', () => {
  let a = assignment.create({
    assignmentId: 'ASN-001',
    workerId: 'W-001'
  });

  a = assignment.transition(a, 'scheduled', 'USER-001');
  a = assignment.transition(a, 'active', 'USER-001');

  assert.strictEqual(a.state, 'active');
  assert.strictEqual(a.history.length, 2);
});

test('13F assignment cannot revive after completion', () => {
  let a = assignment.create({
    assignmentId: 'ASN-001',
    workerId: 'W-001'
  });

  a = assignment.transition(a, 'scheduled', 'USER-001');
  a = assignment.transition(a, 'active', 'USER-001');
  a = assignment.transition(a, 'completed', 'USER-001');

  assert.throws(() => {
    assignment.transition(a, 'active', 'USER-001');
  });
});

test('13G evidence normalizes', () => {
  const e = evidence.normalize({
    evidenceId: 'EVID-001',
    workerId: 'W-001',
    type: 'work_completion',
    verified: true
  });

  assert.strictEqual(e.evidenceId, 'EVID-001');
  assert.strictEqual(e.verified, true);
});

test('13G evidence deduplicates by stable ID', () => {
  const records = evidence.dedupe([
    {
      evidenceId: 'EVID-001',
      workerId: 'W-001',
      type: 'work_completion'
    },
    {
      evidenceId: 'EVID-001',
      workerId: 'W-001',
      type: 'work_completion'
    },
    {
      evidenceId: 'EVID-002',
      workerId: 'W-001',
      type: 'schedule_event'
    }
  ]);

  assert.strictEqual(records.length, 2);
});

test('13H dashboard counts open requisitions', () => {
  const d = dashboard.build({
    requisitions: [
      { state: 'open' },
      { state: 'filled' }
    ]
  });

  assert.strictEqual(d.requisitionCount, 2);
  assert.strictEqual(d.openRequisitionCount, 1);
});

test('13H dashboard counts active applications', () => {
  const d = dashboard.build({
    applications: [
      { state: 'screening' },
      { state: 'rejected' },
      { state: 'offer' }
    ]
  });

  assert.strictEqual(d.activeApplicationCount, 2);
});

test('13H dashboard counts active assignments', () => {
  const d = dashboard.build({
    assignments: [
      { state: 'active' },
      { state: 'completed' }
    ]
  });

  assert.strictEqual(d.activeAssignmentCount, 1);
});

test('13I ownership keeps Registry canonical', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.controls.includes('candidate_registry_remains_canonical')
  );
});

test('13I staffing retains placement ownership', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.ownership.staffing.includes('placement')
  );
});

test('13I HR retains employment lifecycle', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.ownership.hr.includes('employment_lifecycle')
  );
});

test('13I ATS owns application workflow', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.ownership.ats.includes('application_workflow')
  );
});

test('13I WFM owns workforce operations', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.ownership.wfm.includes('workforce_operations')
  );
});

console.log('');
console.log(
  `PHASE 13 ATS/HRIS/WFM TESTS — ${passed} passed, 0 failed`
);
