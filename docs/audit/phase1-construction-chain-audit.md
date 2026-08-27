# Phase 1 — Construction relay-chain audit

## Summary
Unlike Healthcare and FinOps, Construction's front-end relay chain
(doc-search -> war-room -> strategist -> exec portal -> Sentinel) is already
fully wired and confirmed working — this vertical already went through a prior
fix pass (see the dated comments in `sentinel-center.html` and the extensive
inline documentation in `construction-strategist.html`). No dead relay keys,
no orphaned strategist duplicates, no directory-stub autorun bug.

The real bug this pass surfaced is server-side, not front-end: a shadowed
Express route silently discards the war room's per-engine safety guard on
every single engine call.

## Chain trace (all confirmed working)

1. **doc-search -> war-room**: `tsm-doc-search-multi.html`'s `DOCSEARCH_ROUTES`
   routes Construction docs to `tsm_con_docsearch_relay` ->
   `/html/war-rooms/construct-war/construction-war-room.html`.
   `construction-war-room.html` reads that exact key (`localStorage.getItem
   ('tsm_con_docsearch_relay')`) into `#docPaste`. Confirmed working.

2. **war-room -> strategist**: `storeSession()` writes `TSM_CONSTRUCTION_WAR_RELAY`
   (session + local storage) with shape `{ doc, docType, engines: {e1..e6},
   snapshot: {risk, exposure, deadline, docType}, timestamp, chainStep }`.
   `construction-strategist.html`'s `loadWarRoomRelay()` reads the exact same
   key/shape. Confirmed working.

3. **strategist -> exec portal**: `storeStrategistRelay()` writes
   `TSM_CONSTRUCTION_STRATEGIST_RELAY` (sessionStorage) +
   `tsm_construction_strategist_output` (localStorage).
   `construction-executive-portal.html`'s `RELAY_KEYS` array checks both, in
   the same order they're written. Confirmed working.

4. **strategist -> Sentinel Center**: `pushToSentinel()` writes
   `TSM_CONSTRUCTION_STRATEGIST_RELAY` to **localStorage** (Sentinel's own
   read side, separate from the sessionStorage write in #3) in the
   `{ generatedAt, anomalies: [...] }` shape Sentinel requires, and dispatches
   `TSM_SENTINEL_REFRESH`. `sentinel-center.html`'s own code comments confirm
   this vertical was already patched correctly in an earlier pass — "as of
   this pass, construction's executive portal already listened for
   TSM_CONSTRUCTION_STRATEGIST_RELAY ... no changes needed there."

5. **Sentinel -> exec portal link**: `EXEC_PORTAL_PATHS.construction` points
   to `/html/war-rooms/construct-war/construction-executive-portal.html` —
   confirmed to resolve (200) via `verify-exec-portal-paths.sh`.

6. **autorun/demo mode**: `tsm-auto-pipeline.js`'s `strategistPath` for
   construction points at the real flat file
   (`/html/war-rooms/construct-war/construction-strategist.html`), not a
   directory stub — no Healthcare-style trailing-slash bug here.

## Real bug found: shadowed route silently drops the engine safety guard

**`POST /api/construction/query` is defined in two places, and the wrong one
wins.**

- `routes/construction.js` (line 81) defines the route and is mounted via
  `app.use(require('./routes/construction'))` at `server.js:2721`.
- `server.js` (line 2837) *also* defines `app.post('/api/construction/query', ...)`
  directly, but this registration happens **later** in the file (line 2837 vs.
  the router mount at line 2721).

Express dispatches routes in registration order. The router's handler always
calls `res.json(...)` or `res.status(500).json(...)` — it never calls
`next()` — so it fully terminates every request before Express ever reaches
the line-2837 handler. **The `server.js` version is unreachable dead code.**

This matters because the two versions are not equivalent:

| | `routes/construction.js` (live) | `server.js:2837` (dead) |
|---|---|---|
| Reads `req.body.system`? | **No** — hardcodes `SP.construction` | Yes — `req.body.system \|\| SP.construction` |
| Calls `recordVerticalMemory()`? | No | Yes |

(Both versions get Groq 429 retry for free via the shared `groqChat()` in
`routes/_shared.js` — 2 retries, capped 12s wait, using Groq's own
Retry-After hint. That resilience was never actually missing here; only the
system-prompt passthrough and memory logging were.)

The frontend's 6-engine chain in `construction-war-room.html` sends a specific
guard on every engine call:

```js
body: JSON.stringify({ system: CON_ENGINE_SYSTEM_GUARD, question: prompt, maxTokens: ... })
```

`CON_ENGINE_SYSTEM_GUARD` is a deadline/date-honesty guard purpose-built for
construction's legal exposure — it explicitly forbids the model from
inferring lien-filing windows or abatement dates not stated in the source
document, and forbids claiming a notice/filing was sent unless the document
confirms it. Because the live route ignores `req.body.system` entirely and
always substitutes the generic `SP.construction` prompt (a general
"don't invent findings" guard, but with no mention of dates/deadlines/filing
status), **this specific anti-hallucination guard never reaches the model on
any real war-room run.** The UI implies each engine call carries this
safeguard; in production, none of them do.

Secondary effects of the same shadowing:
- No retry-on-rate-limit for Construction's engine chain, unlike the
  standardized Groq retry convention (`tsmAIJSON()`) rolled out elsewhere —
  every 429 from Groq during a 6-engine run just fails outright.
- `recordVerticalMemory('construction', ...)` never fires for this endpoint,
  so Construction's cross-vertical memory logging is silently empty for its
  primary engine-chain traffic, even though the logging code exists and looks
  operative on read of `server.js` alone.

**[FIXED — see `routes/construction.js` and the removed dead block in
`server.js`. `routes/construction.js` now honors `req.body.system` and logs
to `global.__TSM_MEMORY__.construction`; the shadowed duplicate in
`server.js` was deleted rather than left in place as a second copy, to
avoid recreating this exact trap.]**

## Orphaned files (dead code, no functional impact, worth archiving)
Three more Construction server files exist on disk with zero `require()`
references anywhere in the codebase — none are mounted, none run:
- `server/routes/construction.js` (38 lines) — a third, unmounted definition
  of the same route family.
- `servers/construction.js` (59 lines)
- `server/servers/construction.js` (59 lines)

These don't affect runtime (nothing routes to them), but they're exactly the
kind of duplicate-file trap that caused the FinOps orphaned-strategist bug —
worth a cleanup pass into an archive folder so a future edit doesn't get made
against a file nothing actually serves.

## Spec approach
Not adding a Playwright relay-chain spec for Construction — that layer is
already fully working and already covered by `verify-exec-portal-paths.sh`
for the one path-level thing that could regress silently (Sentinel's link to
the exec portal). The bug that matters here is server-side route shadowing,
which a browser-driven relay-chain spec wouldn't catch anyway (it's invisible
from the client — the request still gets a 200 with a plausible-looking
answer). A regression test for this would be an integration test at the
Express-app level asserting `req.body.system` actually reaches the prompt
sent to Groq, deferred to Phase 3 alongside the fix itself.
