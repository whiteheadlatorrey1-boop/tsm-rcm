const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const MODULE = path.resolve(
  __dirname,
  '../../html/js/career/tsm-professional-readiness-projection.js'
);

function loadProjection() {
  const code = fs.readFileSync(MODULE, 'utf8');

  const context = {
    console,
    globalThis: {}
  };

  vm.runInNewContext(code, context);

  return context.globalThis.TSMProfessionalReadinessProjection;
}

describe('Phase 7C — Evidence -> Professional Readiness projection', function () {

  it('loads as a pure projection module', function () {
    const projection = loadProjection();

    assert.equal(projection.VERSION, '7C');
    assert.equal(typeof projection.project, 'function');
    assert.equal(typeof projection.normalizeEvidence, 'function');
  });

  it('does not mutate source evidence', function () {
    const projection = loadProjection();

    const evidence = [{
      category: 'rcm',
      kind: 'career_training_attempt',
      score: 91,
      dimensions: ['domainCompetency'],
      verified: true
    }];

    const before = JSON.stringify(evidence);

    projection.project(evidence);

    assert.equal(JSON.stringify(evidence), before);
  });

  it('projects evidence into the correct readiness dimensions', function () {
    const projection = loadProjection();

    const profile = projection.project([
      {
        category: 'rcm',
        kind: 'career_training_attempt',
        score: 91,
        dimensions: ['domainCompetency'],
        verified: true
      },
      {
        category: 'it',
        kind: 'workflow_execution',
        score: 84,
        dimensions: ['workflowExecution'],
        verified: true
      }
    ]);

    assert.equal(profile.evidenceCount, 2);
    assert.equal(profile.verifiedEvidenceCount, 2);

    assert.equal(
      profile.dimensions.domainCompetency,
      91
    );

    assert.equal(
      profile.dimensions.workflowExecution,
      84
    );

    assert.equal(profile.readinessScore, 87.5);
  });

  it('accepts both 0-1 and 0-100 score representations', function () {
    const projection = loadProjection();

    const profile = projection.project([
      {
        category: 'test',
        score: 0.8,
        dimension: 'technical'
      },
      {
        category: 'test',
        score: 90,
        dimension: 'documentation'
      }
    ]);

    assert.equal(
      profile.dimensions.technicalCompetency,
      80
    );

    assert.equal(
      profile.dimensions.documentation,
      90
    );

    assert.equal(profile.readinessScore, 85);
  });

  it('preserves provenance without inventing verification', function () {
    const projection = loadProjection();

    const profile = projection.project([
      {
        category: 'rcm',
        kind: 'attempt',
        score: 88,
        dimension: 'domain',
        verified: false,
        provenance: {
          source: 'career_training',
          eventId: 'evt-001'
        }
      }
    ]);

    assert.equal(profile.verifiedEvidenceCount, 0);

    assert.equal(profile.provenance.length, 1);
    assert.equal(profile.provenance[0].source, 'career_training');
    assert.equal(profile.provenance[0].eventId, 'evt-001');
  });

  it('supports role-specific readiness', function () {
    const projection = loadProjection();

    const profile = projection.project([
      {
        category: 'it',
        kind: 'technical',
        score: 90,
        dimension: 'technical',
        role: 'L1 Support'
      },
      {
        category: 'it',
        kind: 'workflow',
        score: 80,
        dimension: 'workflow',
        role: 'L1 Support'
      }
    ], {
      roles: ['L1 Support']
    });

    assert.equal(
      profile.roleReadiness['L1 Support'],
      85
    );
  });

  it('does not fabricate readiness from unmapped evidence', function () {
    const projection = loadProjection();

    const profile = projection.project([
      {
        category: 'unknown',
        kind: 'unknown',
        score: 95,
        dimensions: []
      }
    ]);

    assert.equal(
      profile.dimensions.technicalCompetency,
      0
    );

    assert.equal(
      profile.dimensions.domainCompetency,
      0
    );

    assert.equal(
      profile.dimensions.workflowExecution,
      0
    );
  });

  it('returns a deterministic empty profile for no evidence', function () {
    const projection = loadProjection();

    const a = projection.project([]);
    const b = projection.project([]);

    assert.deepEqual(a, b);
    assert.equal(a.version, '7C');
    assert.equal(a.evidenceCount, 0);
    assert.equal(a.verifiedEvidenceCount, 0);
    assert.equal(a.readinessScore, 0);
  });

  it('keeps readinessBasis tied to actual evidence', function () {
    const projection = loadProjection();

    const profile = projection.project([
      {
        category: 'healthcare',
        kind: 'recovery_attempt',
        score: 93,
        dimension: 'domain',
        verified: true
      }
    ]);

    assert.equal(profile.readinessBasis.length, 1);

    assert.equal(profile.readinessBasis.length, 1);

    const basis = profile.readinessBasis[0];

    assert.equal(basis.category, 'healthcare');
    assert.equal(basis.kind, 'recovery_attempt');
    assert.equal(basis.score, 93);
    assert.equal(basis.verified, true);
    assert.equal(basis.dimensions.length, 1);
    assert.equal(basis.dimensions[0], 'domainCompetency');
  });

});
