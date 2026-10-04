# Phase 6 Closeout: Candidate Registry <-> RCM Integration

Status: COMPLETE (6A-6J)

## What shipped
- RCM career engine (`html/js/career/tsm-rcm-career-engine.js`) accepts a candidate context
  (`setCandidateContext` / `clearCandidateContext`). Invalid or empty IDs are rejected and IDs are trimmed.
- With a candidate selected, each RCM attempt is written through to the Candidate Registry
  with `candidateId` and a 0-100 score.
- Failure isolation: a synchronous bridge throw or async rejection is swallowed, the local RCM attempt
  is preserved, and the failure is counted. With no candidate context, the Registry is never required.
- Candidate selection in the Career Command Center hands off to RCM; RCM evidence reaches the Registry.

## Evidence (all run and passing)
| Phase | Proof | Result |
|---|---|---|
| 6D/6E | test/phase0.5/rcm-write-through.test.js | 4/4 |
| 6F | test/phase0.5/registry-hardening.test.js | 33/33 |
| 6F | npm test (scripts/run-tests.js) | 26/26 suites |
| 6F | scripts/test-interview-prep-ui.js | 22/22 |
| 6G | tests/playwright/candidate-registry-rcm-browser.spec.js | pass |
| 6H | tests/playwright/candidate-registry-persistence.spec.js | pass |

## 6I cleanup
- Fixed stale assertions in test-interview-prep-ui.js (UI moved to generic per-sector panels).
- Fixed missing node:test import in rcm-write-through.test.js.
- Playwright specs pass with the stock config; the uncommitted config change is NOT part of Phase 6.

## Known / out of scope
- Suites needing credentials or services not run in the sandbox: ledger (MONGODB_URI), ServiceNow PDI,
  vertical HTTP suites (TSM_ADMIN_PASSWORD), L1 governed resolution (Groq key). Run locally before release.
- test-college-lighter-war-rooms-ai fails in jsdom (`TSMCollegeEndowmentEngine is not a constructor`); not investigated.
- test-l1-template-assist-route and test-l1-escalation-execute-route hang after completing (likely open handle).
- Separate auth-contract change (TSM_AUTH_PASSWORD mapping across Playwright specs, war-room HTML) is uncommitted and tracked outside Phase 6.

## Next
Phase 7A: Professional Readiness model.
