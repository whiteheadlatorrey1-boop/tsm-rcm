/*
 * TSM Phase 9 — Professional Readiness Contract
 *
 * PURE / UNWIRED:
 * - consumes an existing Phase 7C readiness profile
 * - no Registry writes
 * - no API calls
 * - no UI mutations
 * - no persistence
 *
 * Purpose:
 * Establish one explainable, provenance-aware contract for Professional
 * Readiness without replacing the existing readinessScore semantics.
 *
 * Phase 9 boundaries:
 * - Candidate Registry remains canonical identity/evidence storage.
 * - Training evidence remains distinct from staffing placement evidence.
 * - Existing 7C readinessScore is preserved.
 * - Existing 8B matching and Phase 8 staffing contracts are not rewritten.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TSMProfessionalReadinessContract = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '9.0';

  var DIMENSIONS = [
    'technicalCompetency',
    'domainCompetency',
    'workflowExecution',
    'communication',
    'documentation',
    'professionalReliability'
  ];

  /*
   * Placement evidence belongs to Staffing Pipeline audit/evidence.
   * It must not silently become Professional Readiness evidence.
   */
  var EXCLUDED_STAFFING_KINDS = {
    staffing_submission: true,
    staffing_interview: true,
    staffing_offer: true,
    staffing_placement: true,
    staffing_placement_outcome: true,
    staffing_stage_transition: true,
    staffing_audit: true
  };

  var DEFAULT_GAP_THRESHOLD = 70;
  var DEFAULT_QUALIFICATION_THRESHOLD = 80;

  function cleanString(value) {
    var result = String(value == null ? '' : value).trim();
    return result || null;
  }

  function clone(value) {
    if (value == null) return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  function uniqueStrings(values) {
    var seen = {};
    var result = [];

    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = cleanString(value);

      if (!clean || seen[clean]) return;

      seen[clean] = true;
      result.push(clean);
    });

    return result.sort();
  }

  function isStaffingPlacementEvidence(record) {
    if (!record || typeof record !== 'object') return false;

    var kind = cleanString(
      record.kind ||
      record.type ||
      record.category
    );

    if (kind && EXCLUDED_STAFFING_KINDS[kind]) {
      return true;
    }

    var source = cleanString(record.source);

    return source === 'staffing_pipeline' ||
      source === 'staffing' ||
      source === 'placement';
  }

  function normalizeEvidenceRefs(profile) {
    var basis = Array.isArray(profile && profile.readinessBasis)
      ? profile.readinessBasis
      : [];

    return basis
      .filter(function (record) {
        return record &&
          typeof record === 'object' &&
          !isStaffingPlacementEvidence(record);
      })
      .map(function (record, index) {
        var dimensions = uniqueStrings(record.dimensions);

        var evidenceId = cleanString(
          record.evidenceId ||
          record.id
        );

        return {
          evidenceId: evidenceId ||
            'readiness:basis:' + String(index + 1),
          kind: cleanString(record.kind) || 'evidence',
          category: cleanString(record.category),
          source: cleanString(record.source),
          verified: record.verified === true,
          dimensions: dimensions,
          competencyRef: cleanString(
            record.competencyRef ||
            record.competency
          )
        };
      });
  }

  function collectCompetencyDomains(evidenceRefs, profile) {
    var domains = [];

    evidenceRefs.forEach(function (record) {
      if (record.competencyRef) {
        domains.push(record.competencyRef);
      }
    });

    var profileBasis = Array.isArray(profile && profile.readinessBasis)
      ? profile.readinessBasis
      : [];

    profileBasis.forEach(function (record) {
      if (!record || typeof record !== 'object') return;

      if (record.competency) {
        domains.push(record.competency);
      }

      if (record.domain) {
        domains.push(record.domain);
      }
    });

    return uniqueStrings(domains);
  }

  function buildDimensionState(profile, gapThreshold) {
    var source = profile && profile.dimensions &&
      typeof profile.dimensions === 'object'
      ? profile.dimensions
      : {};

    return DIMENSIONS.map(function (dimensionId) {
      var raw = source[dimensionId];
      var informed = false;

      var basis = Array.isArray(profile && profile.readinessBasis)
        ? profile.readinessBasis
        : [];

      basis.forEach(function (record) {
        if (!record || typeof record !== 'object') return;

        if (Array.isArray(record.dimensions) &&
            record.dimensions.indexOf(dimensionId) >= 0) {
          informed = true;
        }
      });

      var score =
        typeof raw === 'number' &&
        isFinite(raw) &&
        raw >= 0 &&
        raw <= 100
          ? raw
          : null;

      return {
        dimensionId: dimensionId,
        score: informed ? score : null,
        informed: informed,
        gap: informed &&
          typeof score === 'number' &&
          score < gapThreshold
      };
    });
  }

  function deriveAssessmentState(profile) {
    var basis = Array.isArray(profile && profile.readinessBasis)
      ? profile.readinessBasis
      : [];

    var assessmentEvidence = basis.filter(function (record) {
      if (!record || typeof record !== 'object') return false;

      var kind = String(
        record.kind ||
        record.category ||
        ''
      ).toLowerCase();

      return kind.indexOf('assessment') >= 0 ||
        kind.indexOf('training') >= 0 ||
        kind.indexOf('simulation') >= 0;
    });

    return {
      status: assessmentEvidence.length ? 'evidenced' : 'not_started',
      evidenceCount: assessmentEvidence.length,
      verifiedEvidenceCount: assessmentEvidence.filter(function (record) {
        return record.verified === true;
      }).length
    };
  }

  function deriveInterviewReadiness(profile) {
    var basis = Array.isArray(profile && profile.readinessBasis)
      ? profile.readinessBasis
      : [];

    var interviewEvidence = basis.filter(function (record) {
      if (!record || typeof record !== 'object') return false;

      var kind = String(
        record.kind ||
        record.category ||
        ''
      ).toLowerCase();

      return kind.indexOf('interview') >= 0;
    });

    return {
      status: interviewEvidence.length ? 'evidenced' : 'not_started',
      evidenceCount: interviewEvidence.length,
      verifiedEvidenceCount: interviewEvidence.filter(function (record) {
        return record.verified === true;
      }).length
    };
  }

  function deriveProfessionalState(profile, dimensions) {
    var informed = dimensions.filter(function (record) {
      return record.informed;
    });

    var gaps = dimensions.filter(function (record) {
      return record.gap;
    });

    if (!informed.length) {
      return 'not_started';
    }

    if (gaps.length) {
      return 'developing';
    }

    return 'evidenced';
  }

  function buildTrainingActions(dimensions, evidenceRefs) {
    var actions = [];

    dimensions
      .filter(function (record) {
        return record.gap;
      })
      .forEach(function (record) {
        actions.push({
          actionId: 'TRAIN-' + record.dimensionId,
          dimensionId: record.dimensionId,
          sequence: [
            'TRAIN',
            'PRACTICE',
            'VERIFY'
          ],
          reason: 'Dimension is below the readiness gap threshold.',
          evidenceRequired: true
        });
      });

    if (!actions.length && !evidenceRefs.length) {
      actions.push({
        actionId: 'TRAIN-FOUNDATION',
        dimensionId: null,
        sequence: [
          'TRAIN',
          'PRACTICE',
          'VERIFY'
        ],
        reason: 'No professional-readiness evidence is currently available.',
        evidenceRequired: true
      });
    }

    return actions;
  }

  function buildQualification(profile, dimensions, options) {
    var threshold =
      options &&
      typeof options.qualificationThreshold === 'number'
        ? options.qualificationThreshold
        : DEFAULT_QUALIFICATION_THRESHOLD;

    var score =
      profile &&
      typeof profile.readinessScore === 'number'
        ? profile.readinessScore
        : null;

    var gaps = dimensions.filter(function (record) {
      return record.gap;
    });

    /*
     * This is a qualification projection, not a replacement score.
     * It references the existing 7C readinessScore unchanged.
     */
    return {
      contract: 'professional_readiness_qualification',
      qualified:
        typeof score === 'number' &&
        score >= threshold &&
        gaps.length === 0,
      threshold: threshold,
      readinessScore: score,
      gapCount: gaps.length,
      basis: 'existing_readiness_score_plus_explainable_dimension_gaps'
    };
  }

  function createContract(ref, profile, options) {
    if (!profile || typeof profile !== 'object') {
      throw new Error('readiness profile required');
    }

    var input = ref || {};
    var gapThreshold =
      options &&
      typeof options.gapThreshold === 'number'
        ? options.gapThreshold
        : DEFAULT_GAP_THRESHOLD;

    var evidenceRefs = normalizeEvidenceRefs(profile);
    var dimensions = buildDimensionState(profile, gapThreshold);
    var competencyDomains =
      collectCompetencyDomains(evidenceRefs, profile);

    var assessmentState = deriveAssessmentState(profile);
    var interviewReadiness = deriveInterviewReadiness(profile);
    var professionalState =
      deriveProfessionalState(profile, dimensions);

    var qualification =
      buildQualification(profile, dimensions, options);

    return {
      contract: 'professional_readiness',
      version: VERSION,

      candidateId: cleanString(
        input.candidateId ||
        profile.candidateId
      ),

      targetRole: {
        roleId: cleanString(
          input.roleId ||
          profile.roleId
        ),
        roleName: cleanString(
          input.targetRole ||
          input.roleName ||
          profile.targetRole
        )
      },

      competencyDomains: competencyDomains,

      evidenceRefs: clone(evidenceRefs),

      assessmentState: assessmentState,

      interviewReadiness: interviewReadiness,

      professionalReadiness: {
        state: professionalState,
        readinessScore:
          typeof profile.readinessScore === 'number'
            ? profile.readinessScore
            : null,
        dimensions: dimensions,
        gapThreshold: gapThreshold
      },

      trainingActions:
        buildTrainingActions(dimensions, evidenceRefs),

      qualification: qualification,

      provenance: {
        projectionVersion:
          cleanString(profile.version) || null,
        sources: uniqueStrings(
          evidenceRefs.map(function (record) {
            return record.source;
          })
        ),
        evidenceCount: evidenceRefs.length,
        verifiedEvidenceCount:
          evidenceRefs.filter(function (record) {
            return record.verified === true;
          }).length,
        generatedBy: 'TSMProfessionalReadinessContract'
      }
    };
  }

  function createEmptyContract(ref) {
    var input = ref || {};

    return {
      contract: 'professional_readiness',
      version: VERSION,
      candidateId: cleanString(input.candidateId),
      targetRole: {
        roleId: cleanString(input.roleId),
        roleName: cleanString(
          input.targetRole ||
          input.roleName
        )
      },
      competencyDomains: [],
      evidenceRefs: [],
      assessmentState: {
        status: 'not_started',
        evidenceCount: 0,
        verifiedEvidenceCount: 0
      },
      interviewReadiness: {
        status: 'not_started',
        evidenceCount: 0,
        verifiedEvidenceCount: 0
      },
      professionalReadiness: {
        state: 'not_started',
        readinessScore: null,
        dimensions: DIMENSIONS.map(function (dimensionId) {
          return {
            dimensionId: dimensionId,
            score: null,
            informed: false,
            gap: false
          };
        }),
        gapThreshold: DEFAULT_GAP_THRESHOLD
      },
      trainingActions: [{
        actionId: 'TRAIN-FOUNDATION',
        dimensionId: null,
        sequence: ['TRAIN', 'PRACTICE', 'VERIFY'],
        reason: 'No professional-readiness evidence is currently available.',
        evidenceRequired: true
      }],
      qualification: {
        contract: 'professional_readiness_qualification',
        qualified: false,
        threshold: DEFAULT_QUALIFICATION_THRESHOLD,
        readinessScore: null,
        gapCount: 0,
        basis: 'existing_readiness_score_plus_explainable_dimension_gaps'
      },
      provenance: {
        projectionVersion: null,
        sources: [],
        evidenceCount: 0,
        verifiedEvidenceCount: 0,
        generatedBy: 'TSMProfessionalReadinessContract'
      }
    };
  }

  return {
    VERSION: VERSION,
    DIMENSIONS: DIMENSIONS.slice(),
    DEFAULT_GAP_THRESHOLD: DEFAULT_GAP_THRESHOLD,
    DEFAULT_QUALIFICATION_THRESHOLD: DEFAULT_QUALIFICATION_THRESHOLD,
    EXCLUDED_STAFFING_KINDS: Object.keys(EXCLUDED_STAFFING_KINDS),

    createContract: createContract,
    createEmptyContract: createEmptyContract,
    normalizeEvidenceRefs: normalizeEvidenceRefs,
    isStaffingPlacementEvidence: isStaffingPlacementEvidence
  };
}));
