# TSM BPO Production Readiness

_Last verified against a fresh clone of `origin/main` at `90eeeee26` (2026-08-18)._

## Current Status
The BPO apps are ready for an internal/supervised pilot (your own team running real cases, or a demo to a prospect). Not yet ready to hand a client a login for unsupervised live client records — see Phase 3–5 below.

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

### Phase 4 — Reporting
- WIP report export.
- SLA report export.
- Executive rollup.
- Client-facing monthly report.
- Recovery / leakage / risk metrics.

### Phase 5 — Production Security
- Client data separation.
- Audit trails.
- Encryption at rest where applicable.
- HIPAA/PII caution for healthcare lanes.
- Admin controls for pricing/SLA plans.
- Logging and monitoring.

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
