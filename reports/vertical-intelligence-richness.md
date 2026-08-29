# TSM Vertical Intelligence Richness Audit

Generated: 2026-08-29T02:26:39.217Z

Git HEAD: f2afdc59 test: certify vertical control-plane runtime baseline

## PM V5.5 Reference

| Category | Maximum |
|---|---:|
| Data richness | 30 |
| Intelligence | 25 |
| Governance | 25 |
| Runtime | 20 |
| **Total** | **100** |

## Vertical Scorecard

| Vertical | Data | Intelligence | Governance | Runtime | Total | Fitness |
|---|---:|---:|---:|---:|---:|---|
| PM | 30/30 | 25/25 | 20/25 | 20/20 | **95/100** | HIGH |
| Mortgage | 30/30 | 25/25 | 10/25 | 20/20 | **85/100** | HIGH |
| Construction | 30/30 | 25/25 | 20/25 | 20/20 | **95/100** | HIGH |
| Real Estate | 30/30 | 15/25 | 5/25 | 10/20 | **60/100** | MEDIUM |
| Legal | 30/30 | 25/25 | 15/25 | 20/20 | **90/100** | HIGH |
| BPO | 30/30 | 15/25 | 10/25 | 20/20 | **75/100** | HIGH |
| Healthcare | 30/30 | 25/25 | 20/25 | 20/20 | **95/100** | HIGH |
| Schools | 30/30 | 15/25 | 15/25 | 15/20 | **75/100** | HIGH |
| HotelOps | 30/30 | 10/25 | 10/25 | 20/20 | **70/100** | HIGH |
| Insurance | 30/30 | 20/25 | 10/25 | 20/20 | **80/100** | LOW — training/certification shape |
| FinOps | 30/30 | 25/25 | 15/25 | 20/20 | **90/100** | LOW — backend foundation incomplete |
| RCM-OS | 30/30 | 20/25 | 5/25 | 20/20 | **75/100** | LOW — control-plane migration prerequisite |

## Detailed Results

### PM — 95/100

**Classification:** PM-LEVEL / ENTERPRISE READY

**Recommended path:** REFERENCE IMPLEMENTATION — PM V5.5 benchmark

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- ✅ riskScoring
- ✅ forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- ✅ idempotency
- — sourceSystemWritebackControl
- ✅ predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/pm-strategist/bnca`
- `/api/pm/(portfolio-intelligence|risk|forecast|executive-decisions|predictive-control|intelligence-v3|actions/verify`
- `/api/pm/actions/`
- `/api/pm/actions/verify`
- `/api/pm/analysis`
- `/api/pm/executive-decisions`
- `/api/pm/forecast`
- `/api/pm/intelligence-v3`
- `/api/pm/portfolio-intelligence`
- `/api/pm/predictive-control`
- `/api/pm/risk`

### Mortgage — 85/100

**Classification:** PM-LEVEL / ENTERPRISE READY

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- ✅ riskScoring
- ✅ forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- — idempotency
- — sourceSystemWritebackControl
- — predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/mortgage-strategist/bnca`
- `/api/mortgage/bnca`
- `/api/mortgage/executive-portal`
- `/api/mortgage/intelligence-v3`
- `/api/mortgage/node-reports`
- `/api/mortgage/node/conditions`
- `/api/mortgage/node/exceptions`
- `/api/mortgage/node/loan_files`
- `/api/mortgage/portfolio-intelligence`
- `/api/mortgage/query`

### Construction — 95/100

**Classification:** PM-LEVEL / ENTERPRISE READY

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- ✅ riskScoring
- ✅ forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- ✅ idempotency
- — sourceSystemWritebackControl
- ✅ predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/construction/bnca`
- `/api/construction/executive-portal`
- `/api/construction/intelligence-v3`
- `/api/construction/node-report`
- `/api/construction/node-reports`
- `/api/construction/portfolio-intelligence`
- `/api/construction/query`
- `/api/construction/report`
- `/api/construction/upload-doc`

### Real Estate — 60/100

**Classification:** MODERATE / BUILD MISSING CONTROL LAYERS

**Recommended path:** BUILD MISSING INTELLIGENCE / GOVERNANCE LAYERS

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- — deterministicAggregation
- — riskScoring
- ✅ forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- — humanApproval
- ✅ actionLifecycle
- — idempotency
- — sourceSystemWritebackControl
- — predictiveValuesModeled

**Runtime**

- — persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- — verification

**Routes discovered:**

- None discovered

### Legal — 90/100

**Classification:** PM-LEVEL / ENTERPRISE READY

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- ✅ riskScoring
- ✅ forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- — idempotency
- — sourceSystemWritebackControl
- ✅ predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/legal/query`

### BPO — 75/100

**Classification:** HIGH FIT / ADAPT PM PATTERN

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- — riskScoring
- — forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- — idempotency
- — sourceSystemWritebackControl
- — predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/bpo`
- `/api/bpo/batches`
- `/api/bpo/batches/${batchId}/documents`
- `/api/bpo/batches/${batchId}/summary`
- `/api/bpo/batches/${encodeURIComponent(batchId`
- `/api/bpo/batches/${encodeURIComponent(persistBatchId`
- `/api/bpo/cases`
- `/api/bpo/cases/`
- `/api/bpo/clients`
- `/api/bpo/clients/${encodeURIComponent(client.id`
- `/api/bpo/clients/${encodeURIComponent(clientId`
- `/api/bpo/documents/${encodeURIComponent(d.docId`
- `/api/bpo/documents/${encodeURIComponent(doc.docId`
- `/api/bpo/query`
- `/api/bpo/reports/case-summary?vertical=`
- `/api/bpo/reports/client-rollup`
- `/api/bpo/reports/executive-rollup`
- `/api/bpo/rollup?client=`
- `/api/bpo/sla-events`
- `/api/bpo/tasks`
- `/api/bpo/tasks/`
- `/api/bpo/tasks?client=`
- `/api/bpo/work-items`
- `/api/bpo/work-items/`
- `/api/bpo/work-items/${encodeURIComponent(caseId`
- `/api/bpo/work-items/${encodeURIComponent(stratData.caseId`
- `/api/bpo/work-items/${encodeURIComponent(warData.caseId`
- `/api/bpo/work-items/:caseId`
- `/api/bpo/work-items/:caseId/bnca-reports`
- `/api/bpo/work-items/:caseId/documents`
- `/api/bpo/work-items/:caseId/executive-recovery`
- `/api/bpo/work-items/:caseId/executive-recovery/decision`
- `/api/bpo/work-items/:caseId/notes`
- `/api/bpo/work-items/:caseId/sla-events`

### Healthcare — 95/100

**Classification:** PM-LEVEL / ENTERPRISE READY

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- ✅ riskScoring
- ✅ forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- ✅ idempotency
- — sourceSystemWritebackControl
- ✅ predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/hc/ask`
- `/api/hc/bnca`
- `/api/hc/brief`
- `/api/hc/delegate`
- `/api/hc/intelligence-v3`
- `/api/hc/layer2`
- `/api/hc/node-report`
- `/api/hc/node-reports`
- `/api/hc/nodes`
- `/api/hc/nodes/`
- `/api/hc/nodes/${node.toLowerCase(`
- `/api/hc/nodes/:node`
- `/api/hc/nodes/:nodeKey`
- `/api/hc/nodes/filter?system=${encodeURIComponent(system`
- `/api/hc/ocr`
- `/api/hc/portfolio-intelligence`
- `/api/hc/profiles`
- `/api/hc/query`
- `/api/hc/reports`
- `/api/hc/reports/:id`
- `/api/hc/strategist-rollup`
- `/api/hc/stream`
- `/api/hc/tasks`
- `/api/health`

### Schools — 75/100

**Classification:** HIGH FIT / ADAPT PM PATTERN

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- — riskScoring
- ✅ forecasting
- ✅ decisionGeneration
- — explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- — idempotency
- ✅ sourceSystemWritebackControl
- — predictiveValuesModeled

**Runtime**

- — persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/schools/analysis`
- `/api/schools/financial-summary`
- `/api/schools/intelligence-v3`
- `/api/schools/node-report`
- `/api/schools/node-reports`
- `/api/schools/portfolio-intelligence`
- `/api/schools/query`

### HotelOps — 70/100

**Classification:** HIGH FIT / ADAPT PM PATTERN

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- — deterministicAggregation
- — riskScoring
- — forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- — idempotency
- — sourceSystemWritebackControl
- — predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/hotelops/bookings/pending?since=${since}`
- `/api/hotelops/query`

### Insurance — 80/100

**Classification:** HIGH FIT / ADAPT PM PATTERN

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- ✅ riskScoring
- — forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- — idempotency
- — sourceSystemWritebackControl
- — predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/insurance/agents/brief`
- `/api/insurance/audit/prep`
- `/api/insurance/brief`
- `/api/insurance/chat`
- `/api/insurance/claims/triage`
- `/api/insurance/compliance/check`
- `/api/insurance/fraud/analyze`
- `/api/insurance/query`
- `/api/insurance/reserves/review`
- `/api/insurance/siu/referral`
- `/api/insurance/underwriting/score`

### FinOps — 90/100

**Classification:** PM-LEVEL / ENTERPRISE READY

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- ✅ riskScoring
- ✅ forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- ✅ humanApproval
- ✅ actionLifecycle
- ✅ idempotency
- — sourceSystemWritebackControl
- — predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/finops/action`
- `/api/finops/actions`
- `/api/finops/bnca/report`
- `/api/finops/copilot`
- `/api/finops/docs`
- `/api/finops/ingest`
- `/api/finops/mesh-health`
- `/api/finops/multi-report`
- `/api/finops/report`
- `/api/finops/run-doc`
- `/api/finops/upload-doc`

### RCM-OS — 75/100

**Classification:** HIGH FIT / ADAPT PM PATTERN

**Recommended path:** ADAPT PM GOVERNED CONTROL-PLANE PATTERN

**Data**

- ✅ structuredEntities
- ✅ operationalEvents
- ✅ findingsExceptions
- ✅ severityPriority
- ✅ exposure
- ✅ relationships

**Intelligence**

- ✅ deterministicAggregation
- ✅ riskScoring
- — forecasting
- ✅ decisionGeneration
- ✅ explainability

**Governance**

- — humanApproval
- ✅ actionLifecycle
- — idempotency
- — sourceSystemWritebackControl
- — predictiveValuesModeled

**Runtime**

- ✅ persistence
- ✅ auditHistory
- ✅ authenticationAuthorization
- ✅ verification

**Routes discovered:**

- `/api/rcm`
- `/api/rcm/guidance`
- `/api/rcm/requirements`
- `/api/rcm/self-reported`

