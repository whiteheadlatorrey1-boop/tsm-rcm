# Phase 8F — Placement Evidence (pure module)

Status: pure module + tests. Unwired. Depends on 8E (tag `phase-8e-wiring-complete`).

## Purpose
Record what happened to a candidate in the staffing pipeline (submitted,
interviewing, offered, placed, declined, ended) as an append-only stream, without
ever corrupting training evidence (7B) or readiness (7C/8D).

## The boundary (enforced by tests)
- Placement records carry no score, weight, dimensions, category, kind, or
  verification, and use event types (`placement_*`) absent from the 7A EVENT_MAP.
- 7B `normalizeEvidence` rejects every placement record as unmapped.
- No training-evidence module (7A, 7B, 7C, 8B inputs, 8D scorer) references
  placement data; a regression test greps for it.
- Only whitelisted fields are copied from a placement, so protected-class or
  other stray fields cannot propagate.

## Honesty rules
- Records come only from a placement's recorded `statusHistory`. Unknown stages,
  missing timestamps and duplicates are rejected with a reason, never guessed.
- No decline reason or "declined by" is invented; the model has none.
- The human-review reference (reviewer, time, fingerprint) is copied from
  `placement.humanReview` onto the `submitted` record only.
- Summaries are counts only: no rates, no scoring, no causal claims.

## Not in this phase (wiring phase, separate PR)
- Persisting records (planned: its own collection, e.g. `staffing_placement_evidence`,
  never the Candidate Registry)
- Emitting records from `updatePlacementStatus()`
- Any use of placement outcomes to change training recommendations (Phase 15
  feedback loop, with its own compliance review)

## Files
- `html/js/career/tsm-placement-evidence.js`
- `test/phase0.5/placement-evidence.test.js`
