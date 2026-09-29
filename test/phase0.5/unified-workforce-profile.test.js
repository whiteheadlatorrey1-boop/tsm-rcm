'use strict';

var assert = require('assert');
var profile = require(
  '../../html/js/career/tsm-unified-workforce-profile'
);

describe('Phase 8E — Unified Workforce Profile', function () {

  it('creates a valid empty workforce profile', function () {
    var result = profile.createEmptyProfile();

    assert.strictEqual(result.version, '8E');
    assert.ok(result.identity);
    assert.ok(result.lifecycle);
    assert.ok(result.readiness);
    assert.ok(result.competencies);
    assert.ok(Array.isArray(result.evidence));
    assert.ok(Array.isArray(result.roles));
    assert.ok(Array.isArray(result.domains));
    assert.ok(Array.isArray(result.provenance));
  });

  it('composes candidate identity without changing the source', function () {
    var candidate = {
      id: 'CAND-001',
      firstName: 'Test',
      lastName: 'Candidate',
      email: 'test@example.com',
      status: 'active'
    };

    var before = JSON.stringify(candidate);

    var result = profile.compose({
      candidate: candidate
    });

    assert.strictEqual(
      result.identity.candidateId,
      'CAND-001'
    );

    assert.strictEqual(
      result.identity.fullName,
      null
    );

    assert.strictEqual(
      JSON.stringify(candidate),
      before
    );
  });

  it('preserves readiness semantics', function () {
    var result = profile.compose({
      readiness: {
        version: '7C',
        readinessScore: 82,
        readinessBasis: [
          'verified_training_event'
        ],
        evidenceCount: 4,
        verifiedEvidenceCount: 2,
        dimensions: {
          technicalCompetency: 80,
          domainCompetency: 84
        }
      }
    });

    assert.strictEqual(
      result.readiness.readinessScore,
      82
    );

    assert.deepStrictEqual(
      result.readiness.readinessBasis,
      ['verified_training_event']
    );

    assert.strictEqual(
      result.readiness.verifiedEvidenceCount,
      2
    );
  });

  it('normalizes competency scores without inventing competencies', function () {
    var result = profile.compose({
      competencies: {
        documentation: {
          score: 0.91,
          evidenceCount: 3,
          verifiedEvidenceCount: 1,
          provenance: [
            { source: 'training' }
          ]
        }
      }
    });

    assert.ok(result.competencies.documentation);
    assert.strictEqual(
      result.competencies.documentation.score,
      91
    );

    assert.strictEqual(
      Object.keys(result.competencies).length,
      1
    );
  });

  it('preserves evidence provenance and verification', function () {
    var result = profile.compose({
      evidence: [
        {
          id: 'EV-1',
          category: 'healthcare',
          kind: 'training_attempt',
          score: 88,
          verified: true,
          competency: 'documentation',
          provenance: {
            source: 'career_training',
            scenario: 'DENIAL-001'
          }
        }
      ]
    });

    assert.strictEqual(result.evidence.length, 1);
    assert.strictEqual(result.evidence[0].verified, true);
    assert.strictEqual(
      result.evidence[0].provenance.source,
      'career_training'
    );
  });

  it('does not upgrade verification', function () {
    var result = profile.compose({
      evidence: [
        {
          score: 95,
          verified: false
        }
      ]
    });

    assert.strictEqual(
      result.evidence[0].verified,
      false
    );
  });

  it('derives roles only from explicit role sources', function () {
    var result = profile.compose({
      candidate: {
        roles: ['Revenue Cycle Specialist']
      },
      readiness: {
        roleReadiness: {
          'Revenue Cycle Specialist': 84
        }
      },
      evidence: [
        {
          role: 'Healthcare Revenue Analyst',
          score: 90
        }
      ]
    });

    assert.deepStrictEqual(
      result.roles,
      [
        'Revenue Cycle Specialist',
        'Healthcare Revenue Analyst'
      ]
    );
  });

  it('derives domains only from explicit evidence/candidate fields', function () {
    var result = profile.compose({
      candidate: {
        domains: ['healthcare']
      },
      evidence: [
        {
          category: 'rcm',
          kind: 'training_attempt',
          score: 90
        }
      ]
    });

    assert.deepStrictEqual(
      result.domains,
      [
        'healthcare',
        'rcm',
        'training_attempt'
      ]
    );
  });

  it('creates a deterministic summary', function () {
    var result = profile.compose({
      candidate: {
        id: 'CAND-002',
        roles: ['IT Support']
      },
      readiness: {
        readinessScore: 76
      },
      competencies: {
        troubleshooting: 0.8
      },
      evidence: [
        { score: 80, verified: true },
        { score: 72, verified: false }
      ]
    });

    var summary = profile.summarize(result);

    assert.deepStrictEqual(summary, {
      version: '8E',
      candidateId: 'CAND-002',
      readinessScore: 76,
      competencyCount: 1,
      evidenceCount: 2,
      verifiedEvidenceCount: 1,
      roleCount: 1,
      domainCount: 0
    });
  });

  it('does not create a competing persistence layer', function () {
    var source = profile.compose.toString();

    assert.ok(
      source.indexOf('localStorage') === -1
    );

    assert.ok(
      source.indexOf('sessionStorage') === -1
    );

    assert.ok(
      source.indexOf('/api/') === -1
    );
  });

  it('is safe with malformed competency and evidence input', function () {
    var result = profile.compose({
      competencies: {
        bad: {
          score: 999
        },
        alsoBad: {
          score: 'not-a-score'
        }
      },
      evidence: [
        null,
        'bad-record',
        {
          score: 200
        }
      ]
    });

    assert.deepStrictEqual(
      result.competencies,
      {}
    );

    assert.strictEqual(
      result.evidence.length,
      1
    );

    assert.strictEqual(
      result.evidence[0].score,
      null
    );
  });

  it('keeps the unified profile additive and source-safe', function () {
    var input = {
      candidate: {
        id: 'CAND-003',
        roles: ['SAP Analyst']
      },
      readiness: {
        readinessScore: 81
      },
      competencies: {
        sap_sd: {
          score: 0.87
        }
      },
      evidence: [
        {
          kind: 'training',
          score: 90,
          verified: true,
          provenance: {
            source: 'sap-simulation'
          }
        }
      ]
    };

    var before = JSON.stringify(input);

    var first = profile.compose(input);
    var second = profile.compose(input);

    assert.deepStrictEqual(first, second);
    assert.strictEqual(JSON.stringify(input), before);
  });

});
