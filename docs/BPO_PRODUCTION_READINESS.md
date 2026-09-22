# TSM BPO Production Readiness

_Last structurally verified on 2026-09-22 against the current `main` working tree, including the Phase 15.2 approval regression (20/20) and Phase 15.3 governed-execution regression (21/21). The broader baseline remains `773fd6d9` for the previously verified 26/26 `npm test` suite._

## Current Status
BPO itself (the case pipeline, governance, reporting, and client portal) is materially more production-ready than this doc previously said. The remaining gates are: (1) two things this sandbox cannot verify live (a real Groq call and a real write against the Firestore-Mongo-compat backend), (2) organizational work no code change can complete (HIPAA/BAA program), and (3) targeted vertical integration work where an existing surface does not yet enter the governed BPO pipeline. RCM-OS is an orchestration/reconciliation layer over FinOps rather than a new case-originating vertical. SAP is an aggregation layer over Catalog, CRM/C4C, CPQ, and O2C/SD; its gap is governed integration of those upstream verticals.

## Production Requirements

### Phase 1 — Core Hardening — DONE
- ~~Add login/auth protection.~~ Done — Cloudflare-origin entitlement gate + session auth on all `/api/bpo/*` routes.
- ~~Add role-based views: Admin, Manager, Analyst, Client.~~ Done — `requireRole(BPO_INTERNAL_ROLES)` (admin/manager/analyst), a tighter `BPO_MANAGE_ROLES` (admin/manager) gate on mutating routes, and `BPO_CLIENT_VIEW_ROLES` now real end-to-end with a live client login + UI (see Phase 5).
- ~~Add request validation for `/api/bpo/query`.~~ Done — shared `validateQueryBody()` rejects empty/missing prompts, caps message length (8000 chars) and `maxTokens` (4096).
- ~~Add rate limiting.~~ Done — `express-rate-limit`: general `apiLimiter` on `/api/*`, a tighter `loginLimiter` (20/15min) on login specifically.
- ~~Add security headers.~~ Done — `helmet` applied.
- Remove all static operational numbers or label them as demo data. — Still only partially confirmed; some pages carry explicit "illustrative sample, not real data" banners (e.g. HC pilot deliverables), but this hasn't been swept page-by-page across every BPO/vertical page. Flagging again rather than claiming done.

### Phase 2 — Real BPO Operations — DONE
- Persistent database tables, intake, AI/BNCA output, and SLA tracking all unchanged and still real (`server/tsm-ledger-service.js`).

### Phase 3 — Documents — DONE (pending one live verify)
- Upload, chunked+encrypted storage, metadata extraction (landed since, wired via `docRouter.extractDocText()` before `bpoStoreDocument()`), evidence log, and secure download all real and tested (mocked-Mongo harness).
- **Still not yet verified:** one real upload+download through a booted server with a real `MONGODB_URI`, specifically confirming the 1 MiB-per-document ceiling assumption against the actual Firestore-Mongo-compat backend. This sandbox cannot reach that backend — this has to be run from Latorrey's own Codespace/Fly deployment before trusting it with real client documents.

### Phase 4 — Reporting — DONE
- WIP/SLA/executive-rollup exports, and the client-facing rollup + monthly-snapshot pair, are all real (`GET /api/bpo/reports/client-rollup`, `/client-monthly`, `/client-monthly/history`).
- `scripts/generate-bpo-client-monthly-reports.js` is still **not on a schedule** — no cron/Fly Machines/GitHub Actions job exists in this repo to run it monthly. This is an infra decision, not a code gap, but it will silently stop producing new snapshots until someone wires a scheduled trigger.
- Recovery/leakage/risk metrics and an SLA breach flag are both still explicitly out of scope — they need a client-contract-level formula (what counts as "recovered," what "breach" means per SLA tier) that isn't Claude's to invent. Note: `bpo_clients.slaThresholdHours` now exists per-client (Phase 5), so `GET /api/bpo/reports/sla` already reports a `breached` column when a client has a threshold set — the earlier "no threshold anywhere" framing is stale.

### Phase 5 — Production Security — DONE (HIPAA program excepted)
- ~~Client data separation~~ and ~~client-role scoping~~ — done, unchanged.
- **Client-facing UI now exists and is real** — `html/client-portal.html` is a live, session-gated page (`GET /api/auth/status`, redirects to `/login.html` if not an authenticated `client` role) that pulls `GET /api/bpo/reports/client-rollup` and lists per-case documents. The prior "no client-facing UI wired to the `client` role yet" line in this doc was wrong as of this check — that gap is closed.
- Audit trails, encryption at rest (AES-256-GCM, fail-closed on a missing `TSM_DOC_ENCRYPTION_KEY`), and admin SLA/pricing controls — all unchanged and real.
- HIPAA/PII compliance program — still **not something a code change can complete.** Technical safeguards (encryption in transit/at rest, RBAC, audit logging, session expiry, minimum-necessary access) are all real. What's still outside code entirely: a signed BAA with whoever hosts the DB if any PHI touches it, a documented risk assessment, breach-notification procedures, workforce training, and a named accountable owner. Unchanged from the prior version of this doc — nobody has reported this as done.

### Phase 15 — Governed Automation — now DONE, real, and tested (this is a correction to a correction)
A presentation-review pass on 2026-09-22 flagged Phase 15 as "CORRECTED — Not tested," because at that time `canExecuteApprovedAction()` and its test file did not exist anywhere in the pushed repository. Since that review, three commits landed for real on `main`:
- `129326e` — Governance Engine, Milestone 1 (observe-only recommend, no execution)
- `1c5f07b` — governed approval lifecycle (`server/tsm-governance-engine.js`, new `/api/bpo/os/cases/:caseId/governance/approval` + `/approvals/:approvalId/resolve|execute` routes in `server.js`)
- `20e4a46` / `9270d40` — `canExecuteApprovedAction()` implemented, wired into `tsm-ledger-service.js`, authorization denials mapped to 403, and the Phase 15.3 route regression added.
- `scripts/test-bpo-governance-approval.js` — **20 passed, 0 failed**.
- `scripts/test-bpo-governance-execution.js` — **21 passed, 0 failed**.

Current state, verified this session: governed case-mutating actions require an explicit human approval before execution. A PENDING approval cannot execute; an analyst cannot resolve/approve; an authorized manager can approve; execution then crosses the approval gate through the canonical Phase 14 mutation engine and writes the corresponding audit record. Wrong-case, wrong-action, missing-approval, and repeated execution attempts are rejected without mutation. Approval does not auto-execute the action — execution is a separate explicit request. Live-Groq/live-DB execution against a real deployment is still unverified from this sandbox, same standing caveat as everywhere else.

## Per-Vertical Pilot Readiness
"Production-level pilot" means: real case data flows from intake through a war room/strategist, a human approves an action in an exec portal, and that decision auto-relays into BPO's case engine so it shows up in reporting and (if applicable) the client portal — end to end, no manual re-entry.

| Vertical | Status | What's real | What's missing |
|---|---|---|---|
| **Healthcare** | Closest to pilot-ready | Full chain: war room → `hc-main-strategist.html` → `html/healthcare/executive-portal.html` (HC Intelligence V3 panel confirmed wired live) → registered in `EXEC_PORTAL_VERTICALS` → auto-relays into `bpo_cases` → client portal. Governed execution (Phase 15) now real per above. | Live end-to-end run with a real `GROQ_API_KEY` and real `MONGODB_URI` — never done outside a sandbox. The 1 MiB document-chunking assumption (Phase 3) also still unverified live. |
| **RCM-OS** | FinOps orchestration layer — contained integration fix remaining | `html/finops-suite/tsm-rcm-os.html` is the Reconciliation Command Center and sequences existing FinOps Operations, FinOps Accounting, and Compliance surfaces. Its exceptions panel consumes the shared client-side `TSMMemory.getCrossModuleAnomalies()` bus. | RCM-OS does **not** need its own war-room/strategist/exec-portal chain. Its CRITICAL-exception path currently writes to the client-side `TSMMissionStore`, which does not reach `bpo_cases`. The required fix is to route that escalation through the existing FinOps Executive Portal decision path (`/api/exec-portal/finops/decide`) rather than the orphaned Mission Core path. This is a contained integration change, not a new vertical build. |
| **SAP** | Aggregation layer; upstream governed integration required | `html/war-rooms/sap/sap-strategist.html` + `sap-howto.html` intentionally operate as a reader/aggregator across Catalog (Commerce Cloud), CRM/C4C, CPQ, and O2C/SD. | SAP does **not** need its own independent war-room/strategist/exec-portal chain. The gap is upstream: Catalog, CRM/C4C, CPQ, and O2C/SD are not currently wired into the shared governed BPO closing loop. Their executive portals use local client-side `recordExecutiveAction()` implementations and their war rooms use static model data; the server currently exposes Q&A endpoints rather than governed case/decision routes. Treat this as a four-vertical integration workstream, not a one-vertical SAP build. |
| **Other verticals** | Mixed — see `[[bpo-services-launch]]` memory for the full tier table | 12 of 14 `EXEC_PORTAL_VERTICALS` entries do auto-relay into BPO (confirmed real, not re-audited this session): healthcare, finops, insurance, construction, legal, realestate, mortgage, pm, l1-copilot, schools, hotelops, honeywell. Concierge and College Command are exec-portal-registered but do **not** auto-relay to the client portal — must be entered into BPO manually (per prior session's audit, not re-verified here). | Re-verify the 12-of-14 claim before promising a client any specific vertical works end-to-end; it was last confirmed 2026-09-06, not this session. |

## Current Use Recommendation
Use these pages for:
- Sales demos, client discovery, BPO workflow preview
- Internal pilot testing (your own team running real cases) — Healthcare is the one vertical with a fully real, tested, governed closing loop into BPO right now
- **RCM-OS** can be advanced through the existing FinOps governed pipeline after its contained CRITICAL-exception routing fix is implemented and tested.
- **SAP** should remain a scoped integration workstream until the upstream Catalog, CRM/C4C, CPQ, and O2C/SD verticals have governed closing-loop integration. No separate SAP BPO chain is required.

Do not use yet for:
- Handing a client an unsupervised login until the HIPAA/PII program (BAA, risk assessment, breach procedures, named owner) is actually executed — the technical controls are ready, the organizational program is not
- Regulated data / PHI / PII, for the same reason
- Contractual SLA delivery until "breach" and "recovered/leakage" formulas are defined per client contract (Phase 4)

## Not Yet Verified Live
Everything above marked "Done" was checked structurally — `node --check`, the previously verified full `npm test` suite (26/26 passing as of `773fd6d9`), mocked-Mongo/jsdom harnesses, plus the dedicated Phase 15.2 (20/20) and Phase 15.3 (21/21) governance regressions — not via a live Groq call or a live write to the real Firestore-Mongo-compat backend. Before trusting this with a real client or real pilot data, run from a booted deployment with the appropriate production configuration: the Decision Center click-through, Executive Relay Queue persistence, one real document upload+download, and Phase 15 approval→execute against a real case. For healthcare PHI specifically, complete the required BAA/HIPAA organizational controls before real PHI is introduced.
