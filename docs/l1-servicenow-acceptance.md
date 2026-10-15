# L1 Copilot <-> ServiceNow: connected acceptance report

Real, connected acceptance test of the L1 Ticket Copilot's ServiceNow integration
(`server/l1-copilot/servicenow-adapter.js` + the `/api/l1-copilot/servicenow/*`
and related governed-write routes in `server.js`) against an actual ServiceNow
Personal Developer Instance — not a mock, not a recorded fixture.

## Target instance

- Instance: `dev316534.service-now.com` (credentials from `~/.tsm-servicenow.env`,
  never committed, never logged)
- Release: **Australia**, patch 7 (`glide.war`:
  `glide-australia-02-11-2026__patch7-09-17-2026_10-06-2026_0905.zip`), build
  date 2026-10-06. Determined by querying `sys_properties` for `glide.war`
  directly — the instance has no public `/stats.do` or `glide.buildname`
  property exposed to this account, so the usual shortcuts didn't work; this
  is the actual authoritative build artifact name.
- Reachability: confirmed directly from this sandbox (DNS resolves, HTTPS
  connects, authenticated Table API calls return real data). An existing
  script in this repo (`scripts/test-servicenow-batch-pdi.js`'s sibling
  `test-servicenow-integration.sh`) carries a comment claiming "not the Claude
  sandbox — it can't reach service-now.com"; that was true of some earlier
  environment but is **not true here** — worth knowing if that comment is
  read as current guidance.

## What was proven live

### READ (`scripts/test-l1-servicenow-live.js`, adapter-level)
- `getTicket()` against a real, pre-existing incident (`INC0000060`) — full
  normalized shape, 32-char `sys_id`, `raw` carries the untouched source record.
- `getAsset()` against a real, pre-existing `cmdb_ci_hardware` record
  (`P1000082`) — full normalized CMDB shape.
- `getRequestItem()` + `getCatalogTasksByRequestItem()` against a real,
  pre-existing `sc_req_item` (`RITM0000002`) — full normalized RITM shape.
  This particular RITM has zero `sc_task` children on this PDI (a fact about
  this instance's data, not a bug); the empty-array shape was still asserted.
  A different `sc_req_item` on the same instance does have a real attached
  `sc_task` (`TASK0000001`, see the bug below) — not used for this assertion
  since the live script dynamically selects whatever RITM the Table API
  returns first, but it's what led to the SC Task prefix finding.

### WRITE (`scripts/test-l1-servicenow-live.js`, adapter-level — one ticket created, used, and deleted per run)
- `createTicket()` → `writeWorkNote()` (+independent re-read confirming the
  exact note text landed in `work_notes`) → `writeComment()` (+independent
  re-read confirming the exact text landed in `comments`) →
  `updateTicketStatus()` (+independent re-read confirming the state is now
  `IN PROGRESS`) → `deleteTicket()` (+independent re-read confirming the
  incident no longer exists). **Zero pre-existing records touched** — verified
  after every run (`short_descriptionLIKE"TSM L1 acceptance test"` query
  against the live instance returns empty).

### GATE (`scripts/test-l1-servicenow-live.js`, real HTTP routes, `server.js` booted in-process)
- `POST /api/l1-copilot/servicenow/work-note` with no session → **401**,
  nothing written.
- Same route, valid staff session but `technicianConfirmed` omitted → **403**
  with the exact "Technician confirmation is required..." message, nothing
  written. Confirmed by an independent re-read after both refused attempts.

### UI (`tests/e2e/l1-servicenow-live.spec.js`, real browser, real PDI)
- Loaded `html/l1-copilot/l1-ticket-copilot.html`, logged in as TSM staff
  (ServiceNow routes require a staff session once `isConfigured()` is true —
  confirmed this applies to every `/api/l1-copilot/servicenow/*` route except
  `/status`).
- **Pulled** a test-created incident by number via "LOAD INCIDENT FROM
  SERVICENOW" — confirmed non-demo (`snPullOut` text, no `[DEMO DATA]` tag).
- **Asset lookup** via "PULL FROM SERVICENOW" against a real, pre-existing
  CMDB asset — confirmed non-demo.
- **Reconciled** a real, pre-existing RITM via the reconcile panel — confirmed
  the output did not report "not found".
- **Saved a governed work note** on the test-created incident only: checked
  the technician-confirmation box, clicked "TECHNICIAN CONFIRM & WRITE",
  confirmed the UI's own success message, then independently re-read the
  incident server-side and confirmed the exact text was present in
  `work_notes`.
- **Zero page errors** throughout.
- Test incident deleted in `afterAll`; confirmed gone from the PDI afterward.

One deliberate stand-in, clearly labeled in the spec's own header and inline:
`GROQ_API_KEY` is not configured in this sandbox, so the step that would
normally call the AI resolution-drafting endpoint
(`buildResolution()` → `POST /api/l1-copilot/resolution` without
`writeToServicenow`) could not run. The spec writes fixed, clearly-labeled
technician-authored test text directly into `#resolutionOutput` instead of
calling that AI endpoint, then proceeds through the **exact real, unstubbed**
confirmation → write → verification path from that point on. Nothing about
the ServiceNow write itself is faked.

## Adapter bugs found and fixed

Both found by running against this real instance — neither reproduces against
the existing mock-based unit test's fixture data, which is exactly why a
connected acceptance pass against a real PDI catches things a mock can't.

1. **SC Task number format assumed one universal prefix.**
   `GET /api/l1-copilot/servicenow/request/:number` only accepted
   `SCTASK\d+`. This PDI's own demo `sc_task` records are numbered
   `TASK0000001` — a real instance, with real demo data, rejected by the
   route before ever reaching ServiceNow. Most production ServiceNow
   instances *do* use the out-of-the-box `SCTASK` prefix, so the fix accepts
   **both** (`/^(SC)?TASK\d+$/`) rather than swapping one assumption for
   another. `server/l1-copilot/demo-data.js`'s `demoRequestRecord()` had the
   same single-prefix assumption in its own classification logic (a
   `TASK...`-prefixed identifier would have been silently misclassified as a
   RITM in demo-fallback mode) — fixed the same way.
   Regression test: `scripts/test-l1-servicenow-request-format.js` (offline,
   asserts `RITM...`, `SCTASK...`, and `TASK...` all pass the route's format
   gate, and that a genuinely malformed number is still rejected; also
   asserts `demoRequestRecord()`'s classification for all three prefixes).

2. **`normalizeIncidentState()`'s numeric-code table was unreachable in
   practice.** `snRequest()` unconditionally sets `sysparm_display_value=all`
   on every Table API call. `readField()` — used for every field including
   `state` — always prefers `display_value` over the raw `value` when both
   are present. The practical result, confirmed live: a real closed
   incident's `state` field arrives as `{ value: "7", display_value:
   "Closed" }`, `readField()` returns `"Closed"`, and
   `normalizeIncidentState("Closed")` has no `"Closed"` key in its
   `'1'`–`'7'` lookup table — so it passes the value through **unchanged**.
   The adapter's own documented contract (and what `dispositionSequence`'s
   work-note parsing and the closure-evaluation code compare against) is the
   uppercase label set (`'OPEN'`, `'IN PROGRESS'`, `'RESOLVED'`, `'CLOSED'`,
   ...) — "Closed" (title case) is not that, so any strict-equality check
   against the documented labels would silently never match on a real
   instance. Fixed with a new `readRawValue()` helper (prefers `.value` over
   `.display_value`) used specifically for the `state` field in `getTicket()`
   — the one field with an actual normalization table expecting raw codes.
   Confirmed live after the fix: `updateTicketStatus(number, '2')` followed
   by `getTicket()` now correctly reports `state: 'IN PROGRESS'`.
   Verified this doesn't affect the existing offline unit test
   (`tests/unit/l1-copilot/servicenow-adapter.test.js`, still 47/47) — its
   mock fixture happens to pass `state` as a bare string, not an object, so
   both the old and new code paths were equivalent for that fixture; the bug
   only manifests with `sysparm_display_value=all`'s actual object shape,
   which only a live call (or a mock built to match it) would surface.

## Ambiguous / not fixed

- Nothing else was found that looked like a genuine bug. One thing worth
  tracking but not acted on: the `_pdi`-only helpers (`createTicket`,
  `deleteTicket`, `updateTicketStatus`, `createTicketsBatch`) are explicitly
  documented as non-production and are correctly not wired to any HTTP route
  (confirmed by grepping every `app.*` route in `server.js` for calls to
  them — none found). That's by design, not a gap, but flagging it here since
  it's exactly the kind of thing worth re-confirming stays true as routes
  are added.

## What's unverified

- **AI resolution-draft generation itself** (`groqChat` call inside
  `buildResolution()` / `POST /api/l1-copilot/resolution` without
  `writeToServicenow`) — `GROQ_API_KEY` is not configured in this sandbox.
  Stood in with fixed text in the Playwright spec (see above); the AI
  generation step's own correctness is out of scope for this ServiceNow
  acceptance pass.
- **`/api/l1-copilot/servicenow/bpo-intelligence`** (Incident → Problem →
  Related Incidents → CMDB intelligence) — not exercised live. Would need
  confirmed `problem` table demo data linked to a real incident on this PDI;
  not confirmed present.
- **`/api/l1-copilot/asset-action/execute`** (the disposition-sequence-gated
  governed write, e.g. asset return/replacement actions) — not exercised
  live in this pass. Its `technicianConfirmed` gate and its fail-closed
  behavior when work notes can't be read are structurally identical to the
  work-note gate that *was* proven live, but the disposition-sequence
  prior-stage check itself wasn't independently driven against a real
  ticket's real work-note history.
- **The `SN_WRITEBACK_ENABLED` gate on the drafts/approve/send flow**
  (`l1-servicenow/service.js`, routed via `routes/l1-servicenow-drafts.js`)
  — proven offline (`scripts/test-l1-servicenow-routes.js`, "send blocked by
  default"), not re-proven against this live PDI in this pass. `SN_WRITEBACK_ENABLED`
  is unset in this environment, so attempting it here would have been the
  same offline assertion, not a new live one.
- **`getTicketsBatch` / `createTicketsBatch`** (chunked batch read/write with
  429/5xx retry-backoff) — not exercised in this pass; separate existing PDI
  scripts (`scripts/test-servicenow-batch-pdi.js`,
  `scripts/test-servicenow-batch-read-pdi.js`) cover that surface and weren't
  re-run here.
- **ACL-blocked-write detection** (`WORK_NOTE_WRITE_UNVERIFIED` /
  `COMMENT_WRITE_UNVERIFIED`) — this PDI's service account has full admin
  access, so a real ACL-blocked write was never triggered live. This defensive
  path remains proven only by the existing offline unit test's mock.
- **Custom per-customer `fieldMap` overrides** — only `DEFAULT_FIELD_MAP` was
  exercised; this PDI's demo data happens to match it (apart from the SC Task
  prefix, now fixed).

## Test results

- `timeout 180 npm test` — **70/70 suites passed** (67.1s–61.1s across
  repeated runs), with `SERVICENOW_INTEGRATION_ENABLED=true` and real PDI
  credentials present in the environment — meaning `test-l1-servicenow-live.js`
  actually ran its live assertions as part of this run, not just a skip.
  Re-verified separately with the ServiceNow env vars removed: both
  `scripts/test-l1-servicenow-live.js` and
  `tests/e2e/l1-servicenow-live.spec.js` skip cleanly (exit 0 / Playwright
  "skipped"), so `npm test` stays green with no credentials present too.
- `npm run poc:audit` — L1 row, re-generated with the live credentials
  present:

  | Module | Reachable | Tests | Deps | Demo | Verdict |
  |---|---|---|---|---|---|
  | L1 | ✓ | 24 `test-l1-*` suites, all PASS (including the 2 new ones) | `SERVICENOW_INSTANCE_URL=set`, `GROQ_API_KEY=unset` | l1 (visualReview=true) | `BLOCKED-ON-GROQ_API_KEY` |

  Accurate and expected: ServiceNow is now genuinely configured and reachable
  in this environment; the one remaining blocker for the AI-assisted parts of
  L1 is the unconfigured `GROQ_API_KEY`, which this acceptance pass correctly
  did not attempt to fake around.
