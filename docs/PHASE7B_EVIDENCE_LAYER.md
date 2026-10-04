# Phase 7B: Unified Evidence Layer

Status: pure module + tests. Not wired into routes, UI, or scoring (7C/7D).

`server/readiness/evidence-layer.js`
- `normalizeEvidence(events, { candidateId })` -> `{ records, rejected }`
- `summarizeEvidence(records)` -> per-category counts + explicit gaps

## Evidence record
evidenceId, candidateId, category, kind, type, source, recordedAt, score (0-100 or null),
scored, weight, dimensions, verification, summary.
Kind and dimensions come from the 7A EVENT_MAP (single source of truth); a test fails if the
two registries drift.

## Categories and where evidence comes from today
| Category | Emitting event types |
|---|---|
| training | module_complete, quiz, mlo_safe_quiz |
| practice | mock_shift |
| rcm | career_training_attempt |
| it_l1 | servicenow_itil_exam, l1_resolution, l1_escalation |
| assessment | readiness_assessment |
| interview, sap, healthcare, certification, work_project | NONE YET (reported as categoriesWithoutSource) |

## Honesty rules
- Unmapped or malformed events are rejected with a reason, never guessed.
- Unscored events stay as records with score null so gaps are visible.
- verification is always `system_recorded`. Events are client-posted to the Registry API and are
  not independently verified; `verified` is reserved for a future server-side verifier and cannot
  be set from event meta.

## Known gap for later phases
Interview, SAP, healthcare and certification evidence cannot exist until those modules emit
Registry events (Phase 8/9). The interview engine stores sessions separately from Registry events.
