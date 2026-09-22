# TSM BPO Production Readiness

_Last verified against a fresh clone of `origin/main` at `773fd6d9` (2026-09-22), including a full `npm test` run (26/26 suites, all passing) — the prior version of this doc was last touched 2026-08-18 and had drifted well behind the code; several items below flip from "not done" to done as a result._

## Current Status
BPO itself (the case pipeline, governance, reporting, and now the client portal) is materially more production-ready than this doc previously said. The gate items left are the same three kinds of thing they always were: (1) two things this sandbox cannot verify live (a real Groq call, a real write against the Firestore-Mongo-compat backend), (2) organizational work no code change can complete (HIPAA/BAA program), and (3) **RCM-OS and SAP are not pilot candidates yet at all** — they're standalone pages with no case pipeline into BPO. See "Per-Vertical Pilot Readiness" below before scoping any pilot beyond Healthcare.

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
- `20e4a46` / `9270d40` — `canExecuteApprovedAction()` implemented, wired into `tsm-ledger-service.js`, a 403 mapping fix, and `scripts/test-bpo-governance-execution.js` (21/0 passing)

Current state, verified this session via a fresh clone + full `npm test`: money-moving/case-mutating governed actions cannot execute without an explicit human `approve()` call recorded first — `canExecute()` is false on a fresh approval gate and only flips true after that call. This closes out the Phase 15 gap the last review correctly caught. Live-Groq/live-DB execution against a real deployment is still unverified from this sandbox, same standing caveat as everywhere else.

## Per-Vertical Pilot Readiness
"Production-level pilot" means: real case data flows from intake through a war room/strategist, a human approves an action in an exec portal, and that decision auto-relays into BPO's case engine so it shows up in reporting and (if applicable) the client portal — end to end, no manual re-entry.

| Vertical | Status | What's real | What's missing |
|---|---|---|---|
| **Healthcare** | Closest to pilot-ready | Full chain: war room → `hc-main-strategist.html` → `html/healthcare/executive-portal.html` (HC Intelligence V3 panel confirmed wired live) → registered in `EXEC_PORTAL_VERTICALS` → auto-relays into `bpo_cases` → client portal. Governed execution (Phase 15) now real per above. | Live end-to-end run with a real `GROQ_API_KEY` and real `MONGODB_URI` — never done outside a sandbox. The 1 MiB document-chunking assumption (Phase 3) also still unverified live. |
| **RCM-OS** | Not pilot-ready — no case pipeline exists | `html/finops-suite/tsm-rcm-os.html` is a standalone demo/presentation page. | No war room, no strategist, no exec portal, not in `EXEC_PORTAL_VERTICALS`, no route feeding `bpo_cases`. This isn't a bug to fix — it's a UI/architecture layer that doesn't exist yet. Needs a scoping decision (does RCM-OS get its own war-room/strategist/exec-portal chain like Healthcare, or does it feed into the existing FinOps chain?) before any code gets written — flagging rather than guessing, same as the standing note in `[[tsm-consultz]]` memory. |
| **SAP** | Not pilot-ready — no case pipeline exists | `html/war-rooms/sap/sap-strategist.html` + `sap-howto.html` only. | No war room, no exec portal, not in `EXEC_PORTAL_VERTICALS`, zero server-side wiring (the "SAP-phase" name in `server.js`'s WIP live-data comment refers to bpo/o2c/crm/cpq collectively and is unrelated to this vertical — don't conflate the two). Same as RCM-OS: needs a real scoping decision before build. |
| **Other verticals** | Mixed — see `[[bpo-services-launch]]` memory for the full tier table | 12 of 14 `EXEC_PORTAL_VERTICALS` entries do auto-relay into BPO (confirmed real, not re-audited this session): healthcare, finops, insurance, construction, legal, realestate, mortgage, pm, l1-copilot, schools, hotelops, honeywell. Concierge and College Command are exec-portal-registered but do **not** auto-relay to the client portal — must be entered into BPO manually (per prior session's audit, not re-verified here). | Re-verify the 12-of-14 claim before promising a client any specific vertical works end-to-end; it was last confirmed 2026-09-06, not this session. |

## Current Use Recommendation
Use these pages for:
- Sales demos, client discovery, BPO workflow preview
- Internal pilot testing (your own team running real cases) — Healthcare is the one vertical with a fully real, tested, governed closing loop into BPO right now
- **Not** RCM-OS or SAP pilots of any kind yet — there's no BPO case pipeline for either to run through

Do not use yet for:
- Handing a client an unsupervised login until the HIPAA/PII program (BAA, risk assessment, breach procedures, named owner) is actually executed — the technical controls are ready, the organizational program is not
- Regulated data / PHI / PII, for the same reason
- Contractual SLA delivery until "breach" and "recovered/leakage" formulas are defined per client contract (Phase 4)

## Not Yet Verified Live
Everything above marked "Done" was checked structurally — `node --check`, the full `npm test` suite (26/26 passing as of `773fd6d9`), and jsdom/functional harnesses against mocked Mongo — not via a live Groq-call or a live write to the real Firestore-Mongo-compat backend (this sandbox has no egress to `api.groq.com` and no `MONGODB_URI`). Before trusting this with a real client or a real pilot on any vertical, run from a booted server in Latorrey's own Codespace/Fly deployment with real credentials: the Decision Center click-through, the Executive Relay Queue persistence, one real document upload+download, and Phase 15's approval→execute path against a real case.
