# TSM BPO Production Readiness

_Last verified against a fresh clone of `origin/main` at `3a9d1604` (2026-08-18)._

## Current Status
The BPO apps are ready for an internal/supervised pilot (your own team running real cases, or a demo to a prospect). The technical building blocks for handling regulated/client data now exist (client-scoped API access, document encryption at rest, structured audit/request logging) — but there's no client-facing UI wired to the `client` role yet, and HIPAA/PII handling requires organizational steps (BAA, risk assessment, breach procedures) beyond anything code can complete. Don't hand a client a login or route real PHI through this until both are addressed. See Phase 3–5 below.

## Production Requirements

### Phase 1 — Core Hardening — DONE
- ~~Add login/auth protection.~~ Done — Cloudflare-origin entitlement gate + session auth on all `/api/bpo/*` routes.
- ~~Add role-based views: Admin, Manager, Analyst, Client.~~ Done — `requireRole(BPO_INTERNAL_ROLES)` (admin/manager/analyst) and a tighter `BPO_MANAGE_ROLES` (admin/manager) gate mutating routes (`server.js`); no separate Client-facing role/view yet.
- ~~Add request validation for `/api/bpo/query`.~~ Done — shared `validateQueryBody()` rejects empty/missing prompts, caps message length (8000 chars) and `maxTokens` (4096).
- ~~Add rate limiting.~~ Done — `express-rate-limit`: general `apiLimiter` on `/api/*`, a tighter `loginLimiter` (20/15min) on login specifically.
- ~~Add security headers.~~ Done — `helmet` applied.
- Remove all static operational numbers or label them as demo data. — Partially done; some pages carry explicit "illustrative sample, not real data" banners (e.g. HC pilot deliverables), not yet confirmed swept across every BPO page.

### Phase 2 — Real BPO Operations — DONE
- ~~Add persistent database tables~~ — Done, Mongo-backed via `server/tsm-ledger-service.js`: `bpo_clients`, `bpo_work_items`, `bpo_audit_logs`, `bpo_notes`, `bpo_sla_events`, `bpo_bnca_reports`.
- ~~Save every intake submission.~~ Done — `bpoUpsertWorkItem()`.
- ~~Save every AI/BNCA output.~~ Done — `bpoSaveBncaReport()`.
- ~~Track owner, status, priority, due date, SLA age.~~ Done — work-item fields + `bpoListSlaEvents()`.

### Phase 3 — Documents — DONE (pending live verify)
- ~~Add file upload.~~ Done — `POST /api/bpo/work-items/:caseId/documents`, multer memory storage, 8MB cap, any internal role.
- ~~Store documents by client/account.~~ Done — `server/tsm-ledger-service.js` `bpoStoreDocument()`; manual chunked base64 storage across `bpo_documents_meta`/`bpo_document_chunks` (NOT the driver's GridFS — this DB is Firestore's Mongo-compatibility layer, and GridFSBucket's automatic index creation is unverified against it, so storage stays inside the plain insertOne/find pattern already proven elsewhere in this file). Chunked at 400KB pre-encoding to stay well under a possible 1 MiB per-document ceiling.
- Add metadata extraction. — Not done. `routes/doc-router.js`'s `extractDocText()` (pdf/docx/xlsx text extraction) exists platform-wide but isn't yet wired to auto-run on a BPO document upload.
- ~~Add document evidence log.~~ Done — every upload/download/delete writes a `bpo_audit_logs` entry (`document.upload`/`document.download`/`document.delete`) via the existing `bpoWriteAudit()`.
- ~~Add secure download links.~~ Done — `GET /api/bpo/documents/:docId/download`, role-gated, logs the access. Delete is soft (manager+ only) — chunk data and the audit trail are preserved, never physically removed.
- **Verified so far:** functional harness (mocked Mongo collections) confirms chunk/reassembly correctness byte-for-byte for both single- and multi-chunk files, oversize rejection, case-scoped listing, soft-delete behavior, and audit-log writes. `node --check` clean on both changed files.
- **Not yet verified:** a real write/read against the actual Firestore-Mongo-compat backend. The chunking approach was deliberately chosen to avoid GridFS's untested `createIndex()` call, but the 1 MiB assumption itself hasn't been confirmed against this specific backend — run one real upload+download through a booted server with `MONGODB_URI` set before trusting this with real client documents.

### Phase 4 — Reporting — DONE
- WIP report export. `GET /api/bpo/reports/wip`, JSON or `?format=csv`, internal roles only.
- SLA report export. `GET /api/bpo/reports/sla`, JSON or `?format=csv`. Reports the raw SLA event timeline (stage, type, `ageHoursAtEvent`) — no breach/pass flag, since no SLA threshold is defined anywhere in this codebase. Setting one (e.g. "48h = breach for Tier 1 clients") is a client-contract decision, not a code decision.
- Executive rollup. `GET /api/bpo/reports/executive-rollup`: counts by stage/status/priority, average open-item age, active client count, SLA event counts by type.
- Client-facing report. Scope decided by Latorrey (2026-08-24): full rollup (WIP + SLA counts + case-level summaries), available both on-demand and as a generated monthly snapshot.
  - `GET /api/bpo/reports/client-rollup` — always-current, client-role scoped to their own `clientId` (staff can pass `?clientId=`).
  - `GET /api/bpo/reports/client-monthly` — the persisted snapshot for a period (`?period=YYYY-MM`, or most recent if omitted).
  - `GET /api/bpo/reports/client-monthly/history` — internal-role only, lists which periods exist for a client (period labels + generation timestamps, not full report bodies).
  - `scripts/generate-bpo-client-monthly-reports.js` — generates + saves the current month's snapshot for every active client (or `--client-id=`/`--period=` for one client/a backfill). Not scheduled by this script — no cron infra exists in this repo; wire it into a Fly Machines scheduled run or GitHub Actions cron when ready.
  - Case-level summary deliberately strips internal-only fields (`owner`, raw `payload`) — same fields a client already can't see via the existing per-case client-scoped route.
  - Still explicitly out of scope, same reasoning as the SLA report above: recovery/leakage/risk metrics need a defined formula that isn't in this codebase and isn't a code decision to invent.
- Recovery / leakage / risk metrics. — Not done, same reason as the SLA breach flag above: these require a defined formula (e.g. what counts as "recovered," what baseline "leakage" is measured against) that isn't in this codebase and isn't mine to invent.

### Phase 5 — Production Security — PARTIALLY DONE
- ~~Client data separation.~~ Done — added a `client` role to `BPO_CLIENT_VIEW_ROLES`. Previously a client-role session was 403'd from every BPO route outright; now work-items (list/get), SLA events, and documents (list/download) allow it, with every query forced to the session's own `clientId` and cross-client lookups returning 404 (not 403), so a client account can't distinguish "not yours" from "doesn't exist." Write/manage routes, the client roster, and audit-log reads remain internal-only. No client-facing UI/login page exists yet for this role — the API supports it, nothing in `html/` uses it yet.
- ~~Audit trails.~~ Done — `bpo_audit_logs` (per-action, existing) plus structured JSON request logging added to stdout for every `/api/bpo/*` call (method, path, status, duration, role, actor, clientId).
- ~~Encryption at rest where applicable.~~ Done for BPO document bytes specifically — `bpoStoreDocument`/`bpoGetDocumentBuffer` now encrypt/decrypt with AES-256-GCM (per-document random IV, auth tag verified on read) before/after chunking, keyed by `TSM_DOC_ENCRYPTION_KEY` (32-byte key, base64 — `openssl rand -base64 32`). Fails closed: uploads are rejected if the key isn't set, rather than silently falling back to plaintext. **Two things this does NOT cover, and neither is a code fix:** (1) documents uploaded *before* this change are still plaintext at rest — a one-time re-encryption pass would need to run against the real DB, which this sandbox has no access to; (2) `TSM_DOC_ENCRYPTION_KEY` itself needs to live in a real secrets store (Fly secrets, a KMS) with a real rotation owner — right now it's just an env var like everything else in `.env`/Fly secrets, no different in kind from `TSM_SESSION_SECRET`.
- HIPAA/PII compliance program — **NOT something a code change can complete.** What's now true on the technical-safeguards side: encryption at rest (documents, above), encryption in transit (Fly TLS termination + `helmet`'s default HSTS), role-based access control, audit logging, session expiry (12h TTL), and minimum-necessary access (client-role scoping, above). What's still outside code entirely: a signed Business Associate Agreement with whoever hosts the DB (Firestore/Mongo-compat layer) if any PHI touches it, a documented risk assessment, breach-notification procedures, workforce training, and a named person responsible for the program. None of that can be "built" — it has to be decided and executed by whoever owns the business relationship with clients, which as of this doc's last edit hasn't happened.
- ~~Admin controls for pricing/SLA plans.~~ Done — `bpo_clients` gained `slaThresholdHours` (nullable positive number) and `pricingTier` (nullable enum: standard/premium/custom) plus a free-text `billingRate`, all editable via the existing `PATCH /api/bpo/clients/:id` (`BPO_MANAGE_ROLES` — admin/manager, unchanged gate). Per-client only; no vertical-level default layer, since nothing else in `bpo_clients` is vertical-scoped yet and a defaults-then-override system would be speculative ahead of a second real use case. `GET /api/bpo/reports/sla` now joins each event's client threshold live (not a snapshot from event time, so an old event reflects a client's *current* plan) and emits `slaThresholdHours`/`breached` columns — null/empty for any client with no threshold set, same behavior as before this existed. No new UI; same as every other client field, which has no dedicated management screen yet either.
- ~~Logging and monitoring.~~ Done — see structured request logging above.

## Current Use Recommendation
Use these pages for:
- Sales demos
- Client discovery
- BPO workflow preview
- Internal pilot testing (your own team running real cases through it)

Do not use yet for:
- Handing a client an unsupervised login
- Regulated data
- PHI/PII
- Production receivables workflow
- Contractual SLA delivery

## Not Yet Verified Live
Everything above marked "Done" was checked structurally, via syntax/`node --check`, and via jsdom/Puppeteer harnesses in a sandboxed clone — not via a live Groq-call end-to-end run (sandbox has no network access to `api.groq.com`). Before trusting this with a real client, run a live Puppeteer/browser pass in your own Codespace against a booted server with a real `GROQ_API_KEY`, specifically the Decision Center click-through (APPROVE STRATEGY / ASSIGN OWNERS / NOTIFY STAKEHOLDERS / EXPORT BRIEF) and the Executive Relay Queue persistence.
