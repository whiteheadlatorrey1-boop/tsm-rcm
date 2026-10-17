# BPO client onboarding — connected acceptance

Real, connected acceptance test of the exact journey a new BPO client goes
through: an admin creates the client and its access code, the client logs
in, a case is created and a document is uploaded to it, the client reads
back its own rollup and monthly report, and cross-client isolation holds —
against a real MongoDB-compatible backend, not a mock.

This is a narrower, purpose-built companion to the broader
`scripts/test-bpo-mongo-live.js` acceptance pass (see
`docs/bpo-mongo-acceptance.md`): that script proves chunking limits,
soft-delete, and recovery-outcome evidence across the whole BPO surface;
this one exists so "did onboarding a new client just work?" has its own
one-command, documented answer — `npm run bpo:onboarding-check`.

## What the test proves, step by step

1. **Admin creates a client.** `POST /api/bpo/clients` returns a usable
   `accessCode` and `hasLogin: true` — the client's portal login is created
   in the same call (`server/tsm-ledger-service.js`'s `bpoCreateClient`,
   which also writes to `middleware/client-registry.js`'s
   `data/clients.json`).
2. **Client logs in.** `POST /api/auth/login` with that access code
   returns a session carrying `role: 'client'` and the right `clientId`.
   A bogus code is rejected with 401.
3. **Today's architecture is staff-mediated, confirmed not assumed:** a
   client session gets 403 if it tries to create a case
   (`POST /api/bpo/work-items/:caseId`) or upload a document
   (`POST /api/bpo/work-items/:caseId/documents`) itself — both routes are
   internal-staff-only (`BPO_INTERNAL_ROLES`). Staff creates the case and
   uploads the document on the client's behalf.
4. **Client reads back its own data.** `GET /api/bpo/reports/client-rollup`
   as the client session includes the case staff just created, with
   internal fields (`payload`, `owner`) stripped.
5. **Monthly report.** `scripts/generate-bpo-client-monthly-reports.js
   --client-id=<id>` runs scoped to the one client, then
   `GET /api/bpo/reports/client-monthly` reads the persisted snapshot back
   as that client.
6. **Cross-client isolation.** A second client is onboarded the same way.
   Neither client's rollup or monthly report ever includes the other's
   data, including when a client session passes `?clientId=<the other
   client's id>` explicitly — the session's own `clientId` always wins
   (confirmed in both `client-rollup` and `client-monthly`).

## Result

Ran live against the test database (`set -a; . ~/.tsm-mongo.env; set +a;
BPO_MONGO_LIVE=1 npm run bpo:onboarding-check`): **20/20 assertions
passed.** No bugs found in this flow — client creation, login,
staff-mediated case/document creation, rollup/monthly reporting, and
cross-client isolation all behaved exactly as documented on the first run.

## Cleanup

Every record is tagged `tsm-acceptance-<timestamp>-...`. The script
deletes every `bpo_clients`/`bpo_work_items`/`bpo_documents_meta`/
`bpo_document_chunks`/`bpo_client_monthly_reports`/`bpo_audit_logs` record
it created and restores `data/clients.json` to its pre-run bytes, in a
`finally` block that runs on both pass and failure. Confirmed via a direct
Mongo query after the run: zero `tsm-acceptance-`-tagged clients or cases
remained, and `git status` showed `data/` clean.

## Test coverage

`scripts/test-bpo-client-onboarding-live.js` — skips cleanly (exit 0)
unless both `MONGODB_URI` and `BPO_MONGO_LIVE=1` are set, and refuses
outright (exit 1) if `NODE_ENV=production` or `FLY_APP_NAME` is set, with
that refusal overriding even an explicit opt-in. Picked up automatically by
`scripts/run-tests.js` (matches the existing `test-bpo-*` discovery
pattern) and skips there too unless both variables are set. Also runnable
directly as `npm run bpo:onboarding-check` once the test-Mongo env is
sourced.
