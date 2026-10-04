'use strict';

const assert = require('assert');

const contract = require(
  '../../html/js/career/tsm-unified-workforce-intelligence-contract'
);

const signals = require(
  '../../html/js/career/tsm-unified-workforce-signals'
);

const evidence = require(
  '../../html/js/career/tsm-unified-workforce-evidence'
);

const insights = require(
  '../../html/js/career/tsm-unified-workforce-insights'
);

const actions = require(
  '../../html/js/career/tsm-unified-workforce-actions'
);

const profile = require(
  '../../html/js/career/tsm-unified-workforce-profile'
);

const governance = require(
  '../../html/js/career/tsm-unified-workforce-governance'
);

const dashboard = require(
  '../../html/js/career/tsm-unified-workforce-dashboard'
);

const boundary = require(
  '../../html/js/career/tsm-unified-workforce-boundary'
);

let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log(`PASS: ${name}`);
}

test('14A contract loads', () => {
  assert.strictEqual(
    contract.CONTRACT,
    'unified_workforce_intelligence'
  );
});

test('14A candidate identity required', () => {
  assert.throws(() => {
    contract.create({});
  });
});

test('14A contract creates', () => {
  const c = contract.create({
    candidateId: 'C-001',
    workerId: 'W-001'
  });

  assert.strictEqual(c.candidateId, 'C-001');
  assert.strictEqual(c.workerId, 'W-001');
});

test('14B signal normalization', () => {
  const s = signals.normalize({
    signalId: 'SIG-001',
    type: 'readiness',
    candidateId: 'C-001',
    value: 87,
    source: 'professional_readiness'
  });

  assert.strictEqual(s.signalId, 'SIG-001');
  assert.strictEqual(s.value, 87);
});

test('14B invalid signal rejected', () => {
  assert.throws(() => {
    signals.normalize({
      signalId: 'SIG-001',
      type: 'unknown',
      candidateId: 'C-001'
    });
  });
});

test('14B signals deduplicate by stable ID', () => {
  const result = signals.dedupe([
    {
      signalId: 'SIG-001',
      type: 'readiness',
      candidateId: 'C-001',
      value: 87
    },
    {
      signalId: 'SIG-001',
      type: 'readiness',
      candidateId: 'C-001',
      value: 87
    },
    {
      signalId: 'SIG-002',
      type: 'training',
      candidateId: 'C-001'
    }
  ]);

  assert.strictEqual(result.length, 2);
});

test('14C evidence is collected', () => {
  const refs = evidence.collect({
    training: [
      {
        evidenceId: 'E-001',
        candidateId: 'C-001',
        source: 'training'
      }
    ],
    readiness: [
      {
        evidenceRefs: ['E-002'],
        candidateId: 'C-001',
        source: 'readiness'
      }
    ]
  });

  assert.strictEqual(refs.length, 2);
});

test('14C duplicate evidence is removed', () => {
  const refs = evidence.collect({
    one: [
      { evidenceId: 'E-001', candidateId: 'C-001' }
    ],
    two: [
      { evidenceId: 'E-001', candidateId: 'C-001' }
    ]
  });

  assert.strictEqual(refs.length, 1);
});

test('14D readiness qualification insight', () => {
  const result = insights.buildFromSignals([
    {
      signalId: 'SIG-R',
      type: 'readiness',
      candidateId: 'C-001',
      value: 87,
      evidenceRefs: ['E-001']
    }
  ]);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, 'qualification');
});

test('14D readiness gap insight', () => {
  const result = insights.buildFromSignals([
    {
      signalId: 'SIG-R',
      type: 'readiness',
      candidateId: 'C-001',
      value: 62
    }
  ]);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, 'gap');
});

test('14D availability creates opportunity insight', () => {
  const result = insights.buildFromSignals([
    {
      signalId: 'SIG-A',
      type: 'availability',
      candidateId: 'C-001',
      status: 'available'
    }
  ]);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, 'opportunity');
});

test('14E gap produces training action', () => {
  const result = actions.actionsFromInsights([
    {
      insightId: 'GAP-001',
      type: 'gap',
      candidateId: 'C-001',
      description: 'Development required.'
    }
  ]);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].type, 'train');
  assert.strictEqual(result[0].requiresHumanReview, true);
});

test('14E qualification produces human review action', () => {
  const result = actions.actionsFromInsights([
    {
      insightId: 'QUAL-001',
      type: 'qualification',
      candidateId: 'C-001',
      description: 'Review qualification.'
    }
  ]);

  assert.strictEqual(result[0].type, 'review');
  assert.strictEqual(result[0].requiresHumanReview, true);
});

test('14E opportunity produces follow-up action', () => {
  const result = actions.actionsFromInsights([
    {
      insightId: 'OPP-001',
      type: 'opportunity',
      candidateId: 'C-001',
      description: 'Review opportunity.'
    }
  ]);

  assert.strictEqual(result[0].type, 'follow_up');
});

test('14F profile aggregates signals', () => {
  const p = profile.build({
    candidateId: 'C-001',
    signals: [{ signalId: 'S-1' }],
    insights: [{ type: 'qualification' }],
    actions: [{ requiresHumanReview: true }]
  });

  assert.strictEqual(p.signalCount, 1);
  assert.strictEqual(p.insightCount, 1);
  assert.strictEqual(p.actionCount, 1);
});

test('14F profile counts qualification signals', () => {
  const p = profile.build({
    candidateId: 'C-001',
    insights: [
      { type: 'qualification' },
      { type: 'gap' }
    ]
  });

  assert.strictEqual(p.qualificationSignals, 1);
});

test('14F profile counts gaps', () => {
  const p = profile.build({
    candidateId: 'C-001',
    insights: [
      { type: 'gap' },
      { type: 'gap' }
    ]
  });

  assert.strictEqual(p.gapSignals, 2);
});

test('14G valid governance contract accepted', () => {
  const result = governance.validate({
    contract: 'unified_workforce_intelligence',
    candidateId: 'C-001',
    signals: [],
    insights: [],
    actions: [],
    evidenceRefs: []
  });

  assert.strictEqual(result.valid, true);
});

test('14G missing candidate rejected', () => {
  const result = governance.validate({
    contract: 'unified_workforce_intelligence',
    signals: [],
    insights: [],
    actions: [],
    evidenceRefs: []
  });

  assert.strictEqual(result.valid, false);
});

test('14G governance forces human review', () => {
  const result = governance.enforceHumanReview([
    {
      actionId: 'A-001',
      requiresHumanReview: false
    }
  ]);

  assert.strictEqual(result[0].requiresHumanReview, true);
});

test('14H dashboard counts profiles', () => {
  const d = dashboard.build({
    profiles: [
      {
        qualificationSignals: 1,
        gapSignals: 2,
        opportunitySignals: 1,
        humanReviewActions: 3
      }
    ]
  });

  assert.strictEqual(d.profileCount, 1);
});

test('14H dashboard aggregates qualifications', () => {
  const d = dashboard.build({
    profiles: [
      { qualificationSignals: 2 },
      { qualificationSignals: 3 }
    ]
  });

  assert.strictEqual(d.qualificationCount, 5);
});

test('14H dashboard aggregates gaps', () => {
  const d = dashboard.build({
    profiles: [
      { gapSignals: 2 },
      { gapSignals: 4 }
    ]
  });

  assert.strictEqual(d.gapCount, 6);
});

test('14H dashboard aggregates human review actions', () => {
  const d = dashboard.build({
    profiles: [
      { humanReviewActions: 2 },
      { humanReviewActions: 3 }
    ]
  });

  assert.strictEqual(d.humanReviewActionCount, 5);
});

test('14I Registry remains canonical', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.controls.includes('registry_remains_canonical')
  );
});

test('14I intelligence owns signal aggregation', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.ownership.unifiedIntelligence.includes(
      'signal_aggregation'
    )
  );
});

test('14I staffing keeps placement ownership', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.ownership.staffing.includes('placement')
  );
});

test('14I HR keeps employment ownership', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.ownership.hr.includes('employment_lifecycle')
  );
});

test('14I ATS keeps application ownership', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.ownership.ats.includes('application_workflow')
  );
});

test('14I actions require human review', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.controls.includes('actions_require_human_review')
  );
});

test('14I intelligence remains non-persistent', () => {
  const b = boundary.buildBoundary();

  assert.ok(
    b.controls.includes('models_are_pure_and_non_persistent')
  );
});

console.log('');
console.log(
  `PHASE 14 UNIFIED WORKFORCE INTELLIGENCE TESTS — ${passed} passed, 0 failed`
);
