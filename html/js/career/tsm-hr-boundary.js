'use strict';

/*
 * TSM Phase 11I — HR / Staffing Boundary.
 *
 * Staffing owns placement.
 * HR owns employment lifecycle after the worker enters HR operations.
 * Neither layer silently replaces the other.
 */

var VERSION = '11I.0';

function buildBoundary(workerId) {
  return {
    workerId: String(workerId == null ? '' : workerId).trim(),
    staffing: {
      ownsPlacementLifecycle: true,
      ownsPlacementEvidence: true
    },
    hr: {
      ownsEmploymentLifecycle: true,
      ownsOnboarding: true,
      ownsOffboarding: true,
      ownsHrCases: true,
      ownsHrRecords: true
    },
    shared: {
      workerIdentity: true,
      evidenceReferences: true
    },
    controls: {
      hrDoesNotRewriteStaffingPlacement: true,
      staffingDoesNotRewriteEmploymentState: true
    },
    provenance: {
      source: 'hr_operations',
      version: VERSION
    }
  };
}

module.exports = {
  VERSION: VERSION,
  buildBoundary: buildBoundary
};
