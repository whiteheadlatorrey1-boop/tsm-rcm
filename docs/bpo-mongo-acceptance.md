# BPO / Workforce: connected acceptance against a real Firestore-MongoDB TEST database

Real, connected acceptance test of BPO document storage, client reporting,
recovery-outcome evidence, and the Workforce candidate evidence-overview
(`server/tsm-ledger-service.js`, `server/candidate-registry-service.js`,
and their routes in `server.js`) against an actual MongoDB-compatible
backend — not a mock, not a recorded fixture.

## Target database

- Host: `tsmtest.4pbxrxg.mongodb.net`, db path in the connection string:
  `/tsm_test` — a dedicated test cluster, confirmed by the operator before
  this run (never printed or logged here; `MONGODB_URI` stayed in the
  process environment only).
- **Real database name actually used: `tsm-consultz`.** `tsm-ledger-service.js`
  hardcodes its database name to `'tsm-consultz'` regardless of what the
  connection string's own path segment says — see the "Ambiguous / not
  fixed" section below. Since the whole URI points at a dedicated test
  cluster (not just a different db within a shared cluster), this doesn't
  create any cross-environment leakage risk today, but it means the test
  script's own direct-Mongo verification queries had to target
  `tsm-consultz` explicitly, not the db implied by the URI path.
- Driver: `mongodb` npm package v6.21.0.

## What was proven live

All of the below ran against the real database via `scripts/test-bpo-mongo-live.js`
(skips cleanly when `MONGODB_URI` is unset). Every record created was
tagged `tsm-acceptance-<timestamp>-...`; nothing pre-existing was read,
modified, or deleted. Full run: **50/50 assertions passed** after the fix
below.

### 1) BPO document storage (chunking, encryption, soft-delete, audit trail)
- Uploaded and byte-for-byte round-tripped (sha256-verified) three real
  files through the booted server: a 10 KB file (1 chunk), a 1.5 MB file
  (4 chunks), and an 8,386,560-byte file — just under the 8 MB cap (21
  chunks).
- An 8,389,632-byte upload (1 KB over the cap) was rejected cleanly with
  **413**, not a 500.
- **Settles the "1 MiB per document" assumption documented in
  `tsm-ledger-service.js`'s own header comment:** `BPO_DOC_MAX_BYTES` (8 MB)
  is the real, enforced ceiling on a whole document. The "1 MiB" concern in
  that comment was about a single Mongo *chunk* document after base64
  inflation — `BPO_DOC_CHUNK_SIZE_BYTES` (400 KB pre-base64, ~533 KB per
  chunk doc after encoding) already keeps every individual chunk document
  safely under that, and this run confirmed it in practice: a 21-chunk
  document (the largest tested) stored and read back correctly, and no
  document-level ceiling below the app's own 8 MB cap was ever hit.
- Soft-delete: `deleted:true` is set, the meta record and all its chunk
  documents are left intact (confirmed directly via Mongo, not just via
  the HTTP response), and the document is no longer downloadable (404).
- `bpo_audit_logs` got real entries for every upload, the download, and
  the delete (confirmed directly via Mongo).

### 2) BPO case → client rollup
- Created two real clients with real generated access codes and cases
  under each. Logged in as client A via its access code (the real
  `POST /api/auth/login` path, not a crafted session) and confirmed:
  - Client A's rollup includes its own case and **never** includes client
    B's case — true cross-client isolation, not just a documented
    intention.
  - Every case object in the rollup had `payload` and `owner` stripped
    (confirmed on the real response, not just by reading the route's
    comment).
  - Passing `?clientId=<client B>` as client A is ignored — the session's
    own `clientId` wins, confirmed against client B's real data, not an
    empty result that could just mean "no cross-tenant data exists."
  - `scripts/generate-bpo-client-monthly-reports.js --client-id=<A>` ran
    against the real backend, persisted a real monthly snapshot, left
    client B untouched, and `GET /api/bpo/reports/client-monthly` read
    the persisted snapshot back correctly as client A.

### 3) BPO recovery outcome evidence
- Recorded a real `PARTIALLY_RECOVERED` outcome against a real case with a
  real `structuredCase.financialExposure`, confirmed the reconciliation
  math server-side.
- Built a real learning record (prediction-vs-actual pairing) and read it
  back.
- Built the evidence/appeal package and confirmed it references the right
  case and includes the recorded outcome.

### 4) Workforce candidate evidence-overview
- Seeded two test-prefixed candidates via the real
  `POST /api/candidates` admin route (not a direct DB write), each with a
  real training event via `POST /api/candidates/:id/training-events`.
- `GET /api/candidates/evidence-overview` returned both, and correctly
  flagged `scoreUnbacked: true` for the candidate with a nonzero
  readiness score (77) and zero CSA ledger entries.
- `html/workforce/certification-dashboard.html`, driven with real
  Playwright (not stubbed `page.route()`), rendered real rows including
  our tagged candidates by name, logged in with a real session — **zero
  page errors**.

## Bug found and fixed

**`bpoDeleteDocument()` (`server/tsm-ledger-service.js`) always reported
"document not found," even on a successful delete.**

`findOneAndUpdate(..., { returnDocument: 'after' })` used to return
`{ value: <doc|null> }` in older `mongodb` driver versions. Starting in
driver v5+ (v6.21.0 is what's installed here — confirmed via
`node_modules/mongodb/package.json`), it returns the document itself (or
`null`) directly, with no `.value` wrapper. `bpoDeleteDocument` still did:

```js
const updated = result && result.value ? result.value : null;
```

On the installed driver, `result.value` is always `undefined` on a
successful match — so this always fell through to `null`, and the route
always answered 404 regardless of whether the underlying Mongo write
succeeded. First reproduction: deleting a document that had just been
successfully uploaded and downloaded moments earlier in the same test run
still came back 404.

Three sibling functions in the same file (`bpoUpdateClient`,
`bpoSetClientStatus`, `paSetApInvoiceStatus`) already fall back to
`result` itself instead of `null`, which happens to be correct on the
installed driver (match → `result` IS the doc; no match → `result` IS
`null`). Fixed `bpoDeleteDocument` to match that same pattern. Confirmed
live after the fix: the same soft-delete now correctly returns the
updated document, the meta record's `deleted` flag is actually set, and
the audit-log delete entry is written.

This means **any production code path that called `bpoDeleteDocument` was
silently broken** — every document "delete" has actually been failing
with a reported 404 since the driver was last upgraded to v5+ (exact
upgrade date not determined by this acceptance pass), even though nothing
in the existing offline test suite caught it, since those tests mock the
driver rather than exercising the real wrapped/unwrapped return shape.

## Ambiguous / not fixed

- **`tsm-ledger-service.js` hardcodes its database name to `'tsm-consultz'`**,
  ignoring both the connection string's own path segment and any
  `MONGODB_DB_NAME` override — inconsistent with
  `candidate-registry-service.js`, which honors `MONGODB_DB_NAME` with a
  `'tsm-consultz'` default. Not fixed here: changing which database BPO
  data resolves to is a bigger, riskier change than this acceptance pass's
  scope, and could affect where *production's* BPO data actually lives if
  gotten wrong. Flagging for a deliberate follow-up rather than touching
  it incidentally.
- The other three `findOneAndUpdate` call sites using the `: result`
  fallback (`bpoUpdateClient`, `bpoSetClientStatus`, `paSetApInvoiceStatus`)
  are correct on the installed driver, but share a latent edge case: if a
  *future* driver version reverted to the old wrapped shape, a genuine
  "no match" (`{ value: null, ok: 1 }`) would be truthy and get returned
  as if it were a found document. Not touched here since it isn't a bug
  on the currently-installed driver, and this acceptance pass's fix for
  `bpoDeleteDocument` was deliberately scoped to the one call site that
  was actually broken today.
- This run did not attempt to exceed the chunking/encryption path with a
  file large enough to find an actual Firestore-side per-document ceiling
  below the app's own 8 MB cap, because none was found at any size tested
  up to that cap (see above) — there may still be one above 8 MB that this
  pass can't speak to, since the app never allows an upload that large in
  the first place.

## Test coverage

`scripts/test-bpo-mongo-live.js` — skips cleanly (exit 0) when
`MONGODB_URI` is unset, so `npm test` stays green everywhere. Picked up
automatically by `scripts/run-tests.js` (matches the existing `test-bpo-*`
discovery pattern) — when `MONGODB_URI` *is* set (as it was for this
acceptance pass), it runs for real as part of `npm test` too, and cleans
up after itself the same way a standalone run does.
