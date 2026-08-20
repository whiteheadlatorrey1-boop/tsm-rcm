'use strict';

// Smoke test for the two operational-os fixes from last session:
//   282a4355 - fall back to BNCA-derived exposure when a case has none
//   60495cc8 - bncaExposureForCase read the wrong nested shape
//
// No DB needed; buildRecoveryPackage is pure logic over passed-in arrays.

const { buildRecoveryPackage } = require('../server/tsm-operational-os');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

// Case 1: has its own direct exposure field -> should use that, ignore BNCA.
const caseDirect = {
  caseId: 'BPO-DIRECT-1',
  vertical: 'healthcare',
  revenueExposure: 5000,
  priority: 'high'
};

// Case 2: no direct exposure field at all -> must fall back to BNCA report,
// reading the *nested* shape (currentExposure preferred).
const caseBncaOnly = {
  caseId: 'BPO-BNCA-1',
  vertical: 'healthcare',
  priority: 'critical'
};

// Case 3: no direct exposure, BNCA report present but missing currentExposure
// -> must fall back to the nested ifIgnored.exposure.
const caseBncaIfIgnoredOnly = {
  caseId: 'BPO-BNCA-2',
  vertical: 'healthcare',
  priority: 'medium'
};

const bncaReports = [
  {
    caseId: 'BPO-BNCA-1',
    ts: '2026-08-18T10:00:00Z',
    exposure: {
      currentExposure: 12000,
      ifIgnored: { exposure: 18000, basis: 'no action taken' },
      ifActed: { exposure: 2000, basis: 'immediate action' }
    }
  },
  {
    caseId: 'BPO-BNCA-2',
    ts: '2026-08-18T11:00:00Z',
    exposure: {
      // no currentExposure on purpose - must fall through to ifIgnored
      ifIgnored: { exposure: 7000, basis: 'no action taken' },
      ifActed: { exposure: 500, basis: 'immediate action' }
    }
  },
  // older report for BPO-BNCA-1, should be ignored in favor of the newer one
  {
    caseId: 'BPO-BNCA-1',
    ts: '2026-08-10T10:00:00Z',
    exposure: { currentExposure: 999999 }
  }
];

const pkg = buildRecoveryPackage({
  member: { id: 'test-tenant' },
  cases: [caseDirect, caseBncaOnly, caseBncaIfIgnoredOnly],
  bncaReports,
  slaEvents: [],
  notes: [],
  documents: []
});

const row = pkg.verticals.find(v => v.vertical === 'healthcare');

assert(!!row, 'healthcare vertical row present in package');
// Expected total: 5000 (direct) + 12000 (BNCA currentExposure, latest report) + 7000 (BNCA ifIgnored fallback)
assert(row && row.exposure === 24000,
  `vertical exposure totals correctly (direct + BNCA currentExposure + BNCA ifIgnored fallback) - got ${row && row.exposure}`);

console.log('\nFull vertical row:', JSON.stringify(row, null, 2));
console.log(process.exitCode ? '\nSMOKE TEST FAILED' : '\nSMOKE TEST PASSED');
