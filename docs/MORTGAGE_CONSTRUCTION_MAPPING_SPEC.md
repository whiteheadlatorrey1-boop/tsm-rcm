# Mortgage + Construction Vertical Intelligence Control Plane — Mapping Spec

**Repo state audited:** `whiteheadlatorrey1-boop/tsm-rcm` @ `e7f9070`
**Reference implementation:** PM Copilot (`server/pm/*`)
**Status:** Decision-engine layer is DONE and correctly generalized. Action/verification lifecycle is DONE and reusable as-is. **The gap is upstream — the structured findings layer PM has and Mortgage/Construction don't.**

---

## 0. Headline finding (read this before the rest)

The 12-point framework below assumes each vertical already has "existing structured operational data" feeding the pipeline. That's true for PM. It is **not yet true** for Mortgage or Construction. Today:

- PM's findings come from `server/pm/portfolio-intelligence.js` — a deterministic, no-LLM normalizer over real portfolio entities (units, vendors, work orders).
- Mortgage's and Construction's findings come from Groq LLM calls (`tsmAIJSON(...)`) per node, written into an **in-memory, non-persisted** `TSM_MEMORY.mortgage.nodes[node]` / `TSM_MEMORY.construction.nodes[node]` object (`server.js` L761–762). This resets on every server restart and isn't structured — it's free-text JSON the LLM was asked to produce.
- `mortgageNodeReports` / `constructionNodeReports` (`server.js` L3198, ~L2988) are raw ingestion caches, also in-memory, keyed by `nodeId`, no schema enforcement beyond `enforceBNCASchema`.
- The new `/api/mortgage/intelligence-v3` and `/api/construction/intelligence-v3` routes (`server.js` L4798, L4833) are wired and correct, but they expect the caller to POST a `payload` already containing `findings` / `exceptionReport` / named exposure buckets. **Nothing in the current pipeline produces that payload deterministically** — it would have to come from the LLM node reports reformatted, which reintroduces an LLM into the ranking path exactly where PM avoided one.

So "Mortgage + Construction are structurally similar to PM" is correct about the *decision/action/governance* layers, and *not yet true* about the *data* layer. That's the actual scope of the next engineering task — not a new decision engine (already built), but a `mortgage-portfolio-intelligence.js` / `construction-portfolio-intelligence.js` normalizer, mirroring `server/pm/portfolio-intelligence.js`, sitting in front of the decision engine that already exists.

This doesn't invalidate the marketing reframe — it sharpens it. "Governed operational intelligence for businesses with structured work/exception/exposure data" is the right story *once* Mortgage/Construction actually have that structured layer. Right now they have the governance and decision layers built ahead of the data layer.

---

## 1. Existing routes

| | Mortgage | Construction |
|---|---|---|
| Query/chat | `POST /api/mortgage/query` (L3155) | `POST /api/construction/query` (`routes/construction.js` L116) |
| Node ingestion (raw) | `POST /api/mortgage/node-report` (L3200) | `POST /api/construction/node-report` (L2988) |
| Node reports (read/clear) | `GET`/`DELETE /api/mortgage/node-reports` | `GET`/`DELETE /api/construction/node-reports` |
| Node AI analysis | `POST /api/mortgage/node/:node` (L3245) | `POST /api/construction/node/:node` (L3033) |
| Command BNCA | `POST /api/mortgage/bnca` (L3258) | `POST /api/construction/bnca` (L3046) |
| Strategist synthesis | *(not found as separate route — check `routes/mortgage.js` if it exists)* | `POST /api/construction-strategist/bnca` (L3060) |
| Executive portal | *(inline in mortgage-executive-portal.html today — no dedicated BNCA route found)* | `POST /api/construction/executive-portal` (L3073) |
| Report/doc ingestion | — | `POST /api/construction/report`, `POST /api/construction/upload-doc` (`routes/construction.js` L128, L211) |
| **Decision package (new)** | `POST /api/mortgage/intelligence-v3` (L4798) | `POST /api/construction/intelligence-v3` (L4833) |
| Action lifecycle | Shared: `/api/pm/actions/:id/transition`, `/approve`, `/reject`, `/api/pm/actions/verify` — vertical-agnostic by design, keyed only by `actionId` string | Same |

Route inventory gap: Mortgage has no dedicated static-mount block confirmed in this pass (Construction has `/construction-suite`, L1968/2033) — worth a follow-up `grep` before shipping if a Mortgage suite hub is expected to exist.

## 2. Existing structured data

- **PM:** `server/pm/portfolio-intelligence.js` — normalized entities (units/vendors/work-orders) with a defined schema (`normalizeEntity`), no LLM required.
- **Mortgage:** none, persisted. Only `mortgageNodeReports` (in-memory, unschemad, LLM-authored `analysisText`) and `TSM_MEMORY.mortgage.nodes`.
- **Construction:** same shape, `constructionNodeReports` / `TSM_MEMORY.construction.nodes`.
- **Demo fixtures:** `demo/mortgage-demo.json`, `demo/construction-demo.json` exist but are e2e test *step scripts*, not a data model — not usable as the structured-data foundation.

**This is the real blocker**, not domain-config quality (which is good on both verticals — see §11).

## 3. Current LLM decision path

Both verticals currently run LLM-in-the-loop at every stage: node analysis (`tsmAIJSON` prompted per entity), command BNCA, strategist synthesis, executive portal narrative — four separate LLM calls per cycle, none deterministic, none idempotent. This is the exact pattern PM Copilot moved away from when `decision-engine-core.js` was extracted (per its own file comment: "no LLM in the priority/ranking path").

The new `intelligence-v3` routes bypass this correctly *if* fed real findings — but nothing currently produces real findings for them. Today, calling `/api/mortgage/intelligence-v3` with an empty payload just returns an empty decision package.

## 4. Canonical finding schema

Already defined implicitly by what `extractItems()` in `decision-engine-core.js` (L84–120) accepts: `{ domain?, severity|priority|risk, exposure|exposureAmount|financialExposure|estimatedExposure|amount|cost, id|<vertical-id-field>, claim|finding|description|rationale|label|title, rationale?, sources? }`. Both domain configs already declare their `namedExposureBuckets` (compliance_exception_items, condition_pipeline_items, delinquency_items, document_deficiency_items for Mortgage; cost_overrun_items, schedule_delay_items, permit_compliance_items, safety_incident_items for Construction). **This part of the spec is done** — it just needs a real producer.

## 5. Exposure calculation

Fully generic and already shared: `money()`, severity → priority ranking (`priorityFrom`, L69–82), dedup (`dedupeDecisions`, L185–199), total exposure rollup with `existingFinancials.total_exposure` override (L295–306). No vertical-specific work needed here — confirmed by reading the file, not assumed.

## 6. Decision schema

Shared and complete: `{ id, priority, priorityRank, domain, entityId, finding, exposure, action, owner, urgency, status, evidence, generatedBy }` (`makeDecision`, L122–183), sorted and ranked (L285–293). Identical shape across all three verticals by construction.

## 7. Action schema

Shared and complete via `server/pm/action-engine.js` — `actionFromDecision()` (L28+) reads only generic decision fields (`id`, `entityId`, `domain`, `priority`, `finding`, `exposure`, `action`, `owner`, `urgency`) — no PM-specific literals, confirmed by inspection. `VALID_TRANSITIONS` (OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → VERIFIED) is vertical-agnostic. This is directly reusable, and the intelligence-v3 routes already reuse it (`pmActionEngine.buildActionQueue`, `resolvePmAction`) rather than forking it — correct call already made in the code.

## 8. Persistence boundary

- Decisions: computed fresh per request, not persisted (stateless — regenerated from source data each call).
- Action lifecycle status: persisted in `pm_action_status` (via `tsmLedger.pmGetActionStatus` / `pmUpsertActionStatus`), keyed by `actionId` string — already vertical-agnostic since Mortgage/Construction action ids are prefixed `ACT-MTG-DEC-*` / `ACT-CON-DEC-*` and can't collide with `ACT-PM-DEC-*`.
- **Gap:** no persistence layer exists yet for the findings/structured data itself in Mortgage or Construction (see §2). That's the actual net-new persistence boundary this spec needs to define before Phase 6-equivalent work starts.

## 9. Governance boundary

Fully shared and already correctly enforced: `PM_APPROVAL_GATE.recordDecision()` for approve/reject (L4906, L4924), verify route (`/api/pm/actions/verify`, L4945) hard-blocks unless the *latest* recorded decision for that action id is `APPROVED` — looked up from the real decision log, not trusted from the request body (L4977–4983, with an explicit code comment noting this was a prior bypass vulnerability that's now fixed). `requireRole(PM_INTERNAL_ROLES)` gates all of it. Nothing vertical-specific here; Mortgage and Construction inherit this for free.

## 10. Verification boundary

Shared via `server/pm/verification-engine.js` — `verifyOutcome()` computes `exposureBefore/After/Reduction` and an outcome enum (`CONDITION_CLEARED`, `EXPOSURE_REDUCED`, `NO_CHANGE`, worse-case) generically off `action.exposure` and caller-supplied `exposureAfter`. Reusable as-is.

## 11. What can be reused from PM (confirmed, not assumed)

- `server/shared/decision-engine-core.js` — 100% reused, zero vertical literals.
- `server/pm/action-engine.js` — 100% reused, zero PM literals (confirmed by reading the file).
- `server/pm/verification-engine.js` — 100% reused.
- `intelligence-v3` response assembler (`buildPmIntelligenceV3`) — reused by both new routes.
- `resolvePmAction` overlay logic — reused.
- Approval gate + role check (`PM_APPROVAL_GATE`, `PM_INTERNAL_ROLES`) — reused; no separate Mortgage/Construction role sets exist, which is fine for now but worth flagging if role granularity ever needs to differ per vertical.

## 12. What must remain vertical-specific

- `mortgage-domain-config.js` / `construction-domain-config.js` — already written, look correct (owner routing, urgency rules, action-sentence templates, `inferDomain` regex heuristics). Not touched by this audit beyond reading them; no issues found.
- **The structured findings producer** — this is the one piece each vertical actually needs built, and it can't be shared, because "loan condition" and "permit compliance" don't normalize the same way "unit/vendor/work-order" does for PM. This is the real next engineering task.

---

## Recommended next step

Not Phase 6. Build `server/mortgage/portfolio-intelligence.js` and `server/construction/portfolio-intelligence.js` as deterministic normalizers — same role as PM's `portfolio-intelligence.js` — that turn the existing raw node-report ingestion (or a real backing data source, if one is meant to replace the LLM node-analysis step) into the `findings` / named-exposure-bucket shape the decision engine already expects. Until that exists, `/api/mortgage/intelligence-v3` and `/api/construction/intelligence-v3` are correctly built pipes with nothing structured flowing through them yet.
