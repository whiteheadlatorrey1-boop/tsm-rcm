# Phase 7A: Professional Readiness Model

Status: model + tests only. Not wired into routes, UI, or scoring (that is 7D/7E).

`server/readiness/professional-readiness-model.js` -> `assessProfessionalReadiness(events)`

## Dimensions
technical, professional, communication, documentation, reliability.
Evidence quality (none < knowledge < practice/assessment < operational) and assessment
confidence (none/low/medium/high) are reported per dimension and overall.

## Event -> dimension mapping (review these; they are judgement calls)
| Event type | Kind | Feeds |
|---|---|---|
| module_complete, quiz, servicenow_itil_exam, mlo_safe_quiz | knowledge | technical |
| career_training_attempt (RCM) | practice | technical |
| mock_shift | practice | professional, reliability |
| l1_resolution | operational | technical, documentation, reliability |
| l1_escalation | operational | professional, communication, reliability |
| readiness_assessment | assessment | meta.workflow -> reliability; compliance, adapt -> professional; comm -> communication |

## Honesty rules
- Unscored events are not evidence. Unmapped event types are listed, never guessed.
- No evidence = score null / "not_assessed", never 0.
- Overall confidence is capped by coverage (1 of 5 dimensions can never be "high").
- Each contribution carries provenance: what / where / when / score / evidence / source (7F).

## Relationship to existing scoring
`computeReadinessScore()` in candidate-registry-service.js is unchanged and remains canonical.
