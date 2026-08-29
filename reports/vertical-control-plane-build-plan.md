# TSM Vertical Control Plane Build Plan

Generated: 2026-08-29T02:28:05.072Z

Reference: **PM V5.5**

| Vertical | Score | Missing capabilities |
|---|---:|---|
| pm | 100/100 | None |
| construction | 100/100 | None |
| healthcare | 100/100 | None |
| mortgage | 100/100 | None |
| real_estate | 100/100 | None |
| legal | 100/100 | None |
| bpo | 100/100 | None |
| schools | 100/100 | None |
| hotelops | 100/100 | None |
| insurance | 100/100 | None |
| finops | 100/100 | None |
| rcm | 100/100 | None |

## Control Plane

- structuredData
- operationalEvents
- findingsExceptions
- severityPriority
- exposure
- relationships
- deterministicAggregation
- riskScoring
- forecasting
- decisionGeneration
- explainability
- humanApproval
- actionLifecycle
- idempotency
- persistence
- auditHistory
- authenticationAuthorization
- verification
- predictiveValuesModeled
- sourceSystemWritebackControl
- executiveRollup
- strategistSynthesis
- missionCreation
- decisionTelemetry
- evidenceLineage

## Implementation Policy

Existing vertical behavior must be preserved. Missing capabilities should be implemented through shared control-plane modules and vertical adapters rather than duplicated route logic.