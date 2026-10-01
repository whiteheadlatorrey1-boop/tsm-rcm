# Phase 8E — Staffing Pipeline (Scope + pure model)

Status: pure model only. Unwired. Depends on 8B/8C (tag `phase-8d-complete`).

## Purpose
Define the legal stages and transitions of a placement, and the human-review gate
that must pass before a candidate is submitted, so wiring into the existing live
pipeline (`server/staffing-engine-service.js`) is a small, auditable change.

## Stages (identical to the live service's VALID_STATUSES)
submitted -> interviewing -> offered -> placed -> ended
declined reachable from submitted/interviewing/offered; declined and ended are terminal.

## Submission gate (inherits 8A/8B/8C constraints)
A placement may be created only when an 8B match result is flagged
`humanReviewRequired: true, automatedDecision: false` AND a human review with
`decision: 'approved'`, a reviewer id, a timestamp and a `reviewedFingerprint`
equal to the match's `audit.inputFingerprint` is supplied. A stale review (match
inputs changed) fails.

## Boundaries
- No I/O, clock, randomness, ranking, or automated decisions. Actor id and
  timestamp are caller-supplied.
- Does not read or write the Candidate Registry. Stage data is never training
  evidence (8F defines placement-outcome recording).
- No protected-class attributes in any field.

## Not in this phase (wiring phase, separate PR)
- Calling the gate from `submitCandidate()`
- Enforcing transitions in `updatePlacementStatus()` (currently accepts any valid status)
- Persisting reviewer/review records; any route or UI change

## Files
- `html/js/career/tsm-staffing-pipeline-model.js`
- `test/phase0.5/staffing-pipeline-model.test.js`
