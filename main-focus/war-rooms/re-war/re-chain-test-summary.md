# RE Chain — Playwright Smoke Test & Video Demo

Branch: `fix/re-chain-orphaned-script-tags`
Files under test: `html/reo-pro/re-war-room.html`, `re-strategist.html`, `re-exec-portal.html`
Server: local `node server.js` (Express, same server used in prod), no GROQ key configured locally

## What the test does

1. Loads **RE War Room**, confirms the chain bar and mission-builder UI render, calls the page's own `buildWarRoomPayload()` and writes it to `TSM_RE_WAR_RELAY` (same storage calls `escalateToStrategist()` uses).
2. Loads **RE Strategist** (auto-run disabled via `tsm_auto_mode=off` so the page can be inspected before it hands off), confirms:
   - the relay payload is still readable
   - `tsmReadScopedRelay`, `tsmWriteScopedStrat`, `tsmWriteRelay`, and `TSM_KERNEL` all exist — these are the functions that were stranded in the corrupted trailing footer before the fix
3. Clicks the real **"ESCALATE → EXEC PORTAL"** button (not a raw navigation) to hand off to **RE Exec Portal**, confirms:
   - the relay written by the war room is picked up
   - `state` initializes correctly — this is the object that had no `<script>` opener before the fix

## Result

- **0 JS runtime exceptions** (`pageErrors: []`) across all three pages and the two transitions
- Chain bar, relay handoff, and all previously-orphaned bridge functions confirmed present and callable on every page
- Remaining console/network entries are environmental, not app bugs:
  - `403` on `fonts.googleapis.com` and `code.responsivevoice.org` — blocked by this sandbox's egress allowlist, not reachable from here regardless of code correctness
  - `500` on `/api/mortgage/query` — expected, no `GROQ_KEY` set in this local test environment

## Artifacts

- `re-chain-demo.mp4` — screen recording of the full run (war room → strategist → exec portal, including the live button click for the handoff)
- `re-chain-test-report.json` — raw structured output from the Playwright script

## Not covered by this test

- Actual AI-generated content (would require a real `GROQ_KEY`)
- The two other known open items already tracked separately: `legal-pro/` HTML corruption (issue #160) and the Construction war room relay-key mismatch
