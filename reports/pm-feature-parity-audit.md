# TSM PM Feature Parity Audit

Generated: 2026-08-29T03:20:53Z

## Feature Contract

| # | PM Capability |
|---:|---|
| 1 | portfolio_intelligence |
| 2 | digital_twin |
| 3 | deterministic |
| 4 | risk |
| 5 | forecast |
| 6 | executive_decisions |
| 7 | predictive_control |
| 8 | intelligence_v3 |
| 9 | actions |
| 10 | approval |
| 11 | lifecycle |
| 12 | verification |
| 13 | persistence |
| 14 | audit |
| 15 | telemetry |
| 16 | explainability |
| 17 | relationships |
| 18 | writeback |

## Vertical Coverage

| Vertical | Score | Coverage | Status |
|---|---:|---:|---|
| construction | 15/18 | 83% | DOMAIN_ADAPTED |
| healthcare | 11/18 | 61% | PARTIAL |
| mortgage | 5/18 | 27% | INTELLIGENCE_ONLY |
| real_estate | 14/18 | 77% | DOMAIN_ADAPTED |
| legal | 0/18 | 0% | RUNTIME_ONLY_OR_GAP |
| bpo | 0/18 | 0% | RUNTIME_ONLY_OR_GAP |
| schools | 3/18 | 16% | RUNTIME_ONLY_OR_GAP |
| hotelops | 0/18 | 0% | RUNTIME_ONLY_OR_GAP |
| insurance | 0/18 | 0% | RUNTIME_ONLY_OR_GAP |
| finops | 0/18 | 0% | RUNTIME_ONLY_OR_GAP |
| rcm | 0/18 | 0% | RUNTIME_ONLY_OR_GAP |

## Gap Matrix

| Vertical | Missing PM Capabilities |
|---|---|
| construction | digital_twin, predictive_control, intelligence_v3 |
| healthcare | digital_twin, predictive_control, intelligence_v3, approval, lifecycle, explainability, relationships |
| mortgage | digital_twin, forecast, executive_decisions, predictive_control, intelligence_v3, actions, approval, lifecycle, persistence, telemetry, explainability, relationships, writeback |
| real_estate | portfolio_intelligence, digital_twin, predictive_control, intelligence_v3 |
| legal | portfolio_intelligence, digital_twin, deterministic, risk, forecast, executive_decisions, predictive_control, intelligence_v3, actions, approval, lifecycle, verification, persistence, audit, telemetry, explainability, relationships, writeback |
| bpo | portfolio_intelligence, digital_twin, deterministic, risk, forecast, executive_decisions, predictive_control, intelligence_v3, actions, approval, lifecycle, verification, persistence, audit, telemetry, explainability, relationships, writeback |
| schools | digital_twin, risk, forecast, executive_decisions, predictive_control, actions, approval, lifecycle, verification, persistence, audit, telemetry, explainability, relationships, writeback |
| hotelops | portfolio_intelligence, digital_twin, deterministic, risk, forecast, executive_decisions, predictive_control, intelligence_v3, actions, approval, lifecycle, verification, persistence, audit, telemetry, explainability, relationships, writeback |
| insurance | portfolio_intelligence, digital_twin, deterministic, risk, forecast, executive_decisions, predictive_control, intelligence_v3, actions, approval, lifecycle, verification, persistence, audit, telemetry, explainability, relationships, writeback |
| finops | portfolio_intelligence, digital_twin, deterministic, risk, forecast, executive_decisions, predictive_control, intelligence_v3, actions, approval, lifecycle, verification, persistence, audit, telemetry, explainability, relationships, writeback |
| rcm | portfolio_intelligence, digital_twin, deterministic, risk, forecast, executive_decisions, predictive_control, intelligence_v3, actions, approval, lifecycle, verification, persistence, audit, telemetry, explainability, relationships, writeback |

## Rollout Strategy

PM is the reference implementation.

Real Estate is the current domain-adapter reference.

Each remaining vertical should be brought through the same sequence:

```text
Existing Domain Intelligence
        ↓
Domain Adapter
        ↓
Canonical Control Plane
        ↓
Risk + Forecast
        ↓
Executive Decision
        ↓
Approval Gate
        ↓
Proposed Action
        ↓
Verification
        ↓
Persistence + Audit + Telemetry
        ↓
Writeback Boundary
```

## Summary

- fullPmParity: 0
- domainAdapted: 2
- partial: 1
- intelligenceOnly: 1
- runtimeOrGap: 7
