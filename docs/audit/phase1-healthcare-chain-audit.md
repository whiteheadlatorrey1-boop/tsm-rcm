# Phase 1 — Healthcare relay-chain audit

## Real chain, as traced from source (not the FinOps-shaped chain assumed going in)

Healthcare does NOT follow the doc-search -> war-room -> strategist -> exec -> sentinel
chain the same way FinOps does. Two separate, non-overlapping paths exist:

### Path A — doc-search -> hc-denial-war-room.html: BROKEN, dead end
- `tsm-doc-search-multi.html` DOCSEARCH_ROUTES routes healthcare docs to
  `tsm_hc_docsearch_relay` -> `/html/healthcare/hc-denial-war-room.html`.
- `hc-denial-war-room.html` has ZERO references to `docsearch` anywhere in the file
  and no `#docPaste`-equivalent input. It never reads `tsm_hc_docsearch_relay`.
- A document uploaded via doc-search for Healthcare is written to a key nobody
  reads. Silent data loss, not a demo-only gap.
- `hc-denial-war-room.html` also has no writer for `TSM_WAR_ROOM_BRIEF` or any
  strategist-facing key — it's an isolated denial-management dashboard (local
  notes + exec-feedback only), not actually wired into the strategist/exec/
  sentinel chain at all despite the name "war room."
- **[NOT FIXED — flagged for Phase 3/discussion, not silently patched.]**

### Path B — the chain that actually works (node war rooms -> strategist -> exec -> sentinel)
Real input to the strategist is **not** doc-search. Each of the 10 HC "node" pages
(hc-billing, hc-medical, hc-insurance, hc-operations, hc-compliance, hc-pharmacy,
hc-taxprep, hc-grants, hc-vendors, hc-legal) has its own `relayToStrategist()` that
writes to `TSM_WAR_ROOM_BRIEF`.

1. **Node war room -> strategist**: writer shape (from `hc-billing/index.html`
   `relayToStrategist()`):
   ```js
   { sessionId, timestamp, engineOutputs: {...}, engine06: { narrative, recommendations }, documentMeta: { ingestType, charCount } }
   ```
   Reader: `html/healthcare/hc-main-strategist.html` `readWarRoomBrief()` — checks
   `TSM_WAR_ROOM_BRIEF` in session/localStorage, rejects if `age > 7200000ms` (2hr).
   Renders `#tsm-war-room-banner` with `brief.sessionId`, `brief.engine06.narrative`,
   `brief.engineOutputs`.

   NOTE: there are FOUR candidate "strategist" files for Healthcare:
   `html/healthcare/hc-main-strategist.html` (flat — the real one, branded
   "HONORHEALTH · LOCKED", persona "Dee Montee" — matches the actual named pilot),
   `html/healthcare/hc-main-strategist/index.html` (directory stub — no escalate
   logic, no relay writes at all), `html/hc-strategist/` and
   `html/healthcare/hc-strategist/` (older/parallel, not used in this chain).
   `html/js/core/tsm-auto-pipeline.js` autorun points its `strategistPath` at
   `/healthcare/hc-main-strategist/` (trailing slash, no `.html`) — that resolves
   to the STUB directory version via Express's static-index behavior, not the
   real flat file. **Autorun/demo mode for Healthcare silently strategist-does-nothing**;
   manual navigation to `hc-main-strategist.html` (the real file, linked from
   `suite-index.html`) is what actually works. **[REAL BUG — not yet fixed.]**

2. **strategist -> exec portal**: `escalateToExecPortal()` in the real
   `hc-main-strategist.html` writes `TSM_EXEC_RELAY` (session+local storage) with
   shape: `{ ts, enriched, sourceSnapshot, kpi, bnca, alerts, sessionId, warRoomBrief, dashSummary, aiSummary, stratReports, liveSignals, wip, explain }`.
   Reader: `html/healthcare/executive-portal.html` `buildStratReportsTab()`,
   populating `#strat-reports-content` — but only fires when the user clicks the
   "◈ STRATEGIST REPORTS" tab (`data-tab="stratreports"`), not on page load.

3. **strategist -> Sentinel Center**: same file also auto-writes
   `TSM_HEALTHCARE_STRATEGIST_RELAY` (separate from the exec-portal escalate
   button — fires as part of the AI JSON-explain parse flow) with shape:
   `{ generatedAt, anomalies: [{ id, title, severity, exposure, confidence, rootCause, recommendedAction }] }`.
   Sentinel reads this via its `TSM_<VERTICAL>_STRATEGIST_RELAY` convention
   (`v.id.toUpperCase()` = `HEALTHCARE`) and renders a `.vrow[data-vid="healthcare"]`
   row with `.exposure`.

4. **Sentinel -> exec portal link: BROKEN (404)**. Sentinel's own
   `EXEC_PORTAL_PATHS.healthcare` points to
   `/html/war-rooms/healthcare/executive-portal.html` — **this path does not
   exist in the repo.** The real file is at `/html/healthcare/executive-portal.html`.
   Sentinel's in-code comment claims healthcare's exec portal was "patched" to
   listen for the Sentinel-convention key (confirmed true — it does read
   `TSM_HEALTHCARE_STRATEGIST_RELAY`), but the *link path* to reach that portal
   from Sentinel is still wrong. Anyone clicking "Exec Portal ↗" for Healthcare
   from Sentinel Center gets a 404. **[REAL BUG — not yet fixed.]**

## Spec approach
Following the FinOps precedent: seed the payload shape at each hop directly via
`page.addInitScript`, matching the real writer shape above, and assert the next
page genuinely renders from it. For the strategist->exec and strategist->sentinel
hops (which in the real app depend on an LLM call completing before the write
fires), seed the *output* key directly rather than simulating the click-through —
same shortcut the FinOps spec took for its last two tests.

Path A (doc-search -> hc-denial-war-room) is intentionally NOT given a "passes"
test, since there is nothing to pass — the spec below documents the dead relay
with a test that asserts the current (broken) behavior, so a future fix is
visible as a spec change, not silently absorbed.
