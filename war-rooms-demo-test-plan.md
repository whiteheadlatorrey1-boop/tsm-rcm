# War Rooms Demo Test Plan — Weekend Pass Before Monday

Base URL assumed: `https://tsm-consultz.fly.dev` (swap for `localhost:PORT` if testing local).
All 10 verticals follow the same **War Room → Strategist → Executive Portal** chain,
served statically from `/war-rooms/<vertical>/`. Test each one in this order — it's
the same order a live demo click-through would follow.

**General pass/fail signal for every vertical:**
- War Room: the small status line (usually `id="navStatus"`) updates to something like
  `ENGINE: RELAYED TO STRATEGIST` after you click Relay. If it doesn't change, the relay
  write failed silently — check browser console for errors before moving to the Strategist tab.
- Strategist / Executive Portal: these do **not** have a run button — they auto-read the
  relay on page load (`TSM.relay.read(...)`). If they load blank/empty, the relay write
  from the War Room step didn't persist (or you're in a different browser tab/session —
  it's `sessionStorage`-backed in places, so use the same tab, don't open a new one).

---

**Which hub to use:** launch from `/war-rooms/index.html` ("Enterprise Operations
Studio") — this is the real, live hub, driven by `architecture/kernel/phases.json`.
`war-room-prep.html` is a *different, older* page for the legacy 7 industry
verticals (healthcare, finops-suite, etc.) — it has no links to any of these 10
war rooms at all. Don't use it for this demo.

---

## 1. Approval — `/war-rooms/approval/approval-war-room.html`
ℹ️ If you launch this from the hub's **"Launch →"** button, you'll actually land
on `/html/approval-war-room.html` — a stale flat copy, not this file. That's
expected and fine: it writes to the same relay key, so everything below still
works identically whichever file you're on. Confirmed live on 2026-07-04
(sample data loaded, AI analysis ran, KPI panel populated correctly from the
flat file). No need to type the URL manually — just don't be surprised by the
URL bar showing `/html/approval-war-room.html` instead of the `war-rooms/` path.
1. Click **LOAD SAMPLE DATA**.
2. (Optional) Click **CHECK DELEGATION STATUS** — sanity-check output, not required for relay.
3. Click **RUN AI ANALYSIS** — wait for AI output panel to populate.
4. Click **RELAY TO STRATEGIST** — confirm status line updates.
5. Navigate to `approval-strategist.html` — confirm KPI/brief renders from the relay.
6. Click **Executive View →** (top nav) to reach `approval-executive-portal.html` — confirm it renders too.
7. Try **ACKNOWLEDGE** / **ESCALATE** — these just show a toast, no write. Don't rely on them to prove anything downstream.

## 2. BPO — `/war-rooms/bpo/bpo-war-room.html`
1. Click **LOAD SAMPLE DATA** (or **LOAD PASTE** if you want to test with pasted text instead).
2. Click **RUN AI ANALYSIS**.
3. Click **RELAY TO STRATEGIST**.
4. Navigate to `bpo-strategist.html`, then to `bpo-executive-portal.html`.
5. Launching this from the `/war-rooms/index.html` hub is fine — BPO's card there correctly points at this file. (The stale-BPO-link issue only affects `war-room-prep.html`, which isn't the hub you'd use for this demo anyway — see note at the top.)

## 3. Catalog — `/war-rooms/catalog/catalog-war-room.html`
ℹ️ Same as Approval: launching from the hub lands you on
`/html/catalog-war-room.html` (stale flat copy), not this file. Same relay
key underneath — confirmed live on 2026-07-04 that sample data, AI analysis,
and the KPI panel all populate correctly from the flat file. Nothing to do
differently, just expect that URL.
1. Click **LOAD SAMPLE DATA**.
2. Click **RUN AI ANALYSIS**.
3. Click **RELAY TO STRATEGIST** → check status line, then check Strategist/Executive Portal same as above.
4. There's also a **PUBLISH TO CPQ →** button. It's safe to click (updates the status line to something like "PUBLISHED N SKUS TO CPQ"), but ⚠️ **nothing on the CPQ side currently reads that data** — it writes to `localStorage`/`sessionStorage` but CPQ's war room doesn't look for it. Don't demo this as a live cross-vertical handoff — it'll look like nothing happened, because nothing happens downstream yet. Fine to mention as "coming soon" if asked.

## 4. CPQ — `/war-rooms/cpq/cpq-war-room.html`
⚠️ Same issue again: the hub's **"Launch →"** button points at a stale flat copy
(`html/cpq-war-room.html`). Harmless (same relay key), but type the URL above
directly to stay on the file you're testing.
1. Click **LOAD SAMPLE DATA**.
2. Click **CHECK COMPATIBILITY + DISCOUNT** (optional, shows a rules-check panel).
3. Click **RUN AI ANALYSIS**.
4. Click **RELAY TO STRATEGIST** → verify Strategist/Executive Portal render.

## 5. CRM — `/war-rooms/crm/crm-war-room.html`
1. Click **LOAD SAMPLE DATA**.
2. Click **RUN AI ANALYSIS**.
3. Click **RELAY TO STRATEGIST** → verify Strategist/Executive Portal render.

## 6. MDM — `/war-rooms/mdm/mdm-war-room.html`
Button IDs differ slightly here — it's **LOAD**, not "Load Sample," and **ANALYZE**, not "Run AI Analysis."
1. Click **LOAD**.
2. Click **ANALYZE**.
3. Click **RELAY TO STRATEGIST** → verify Strategist/Executive Portal render.
4. This is the vertical with the newest backend work (merge-approval, version history) — worth an extra look at whether the merge-approval flow still works end to end, separate from this basic relay test.

## 7. O2C — `/war-rooms/o2c/o2c-war-room.html`
1. Click **LOAD SAMPLE DATA** (or **LOAD PASTE**).
2. Click **RUN AI ANALYSIS**.
3. Click **RELAY TO STRATEGIST** → verify Strategist/Executive Portal render.

## 8. Governance — `/war-rooms/governance/governance-war-room.html`
No load/sample step here — it runs on internal data.
1. Click **ANALYZE**.
2. Click **RELAY TO STRATEGIST** → verify Strategist/Executive Portal render.

## 9. Digital Twin — `/war-rooms/digital-twin/digital-twin.html`
No load/sample step — runs on internal data.
⚠️ Reminder from the phases.json audit: Digital Twin's "live data" is hardcoded static arrays, not a real feed. Don't imply live telemetry if asked live questions about it Monday.
1. Click **ANALYZE**.
2. Click **RELAY TO STRATEGIST** → verify Strategist/Executive Portal render.

## 10. Integration Hub — `/war-rooms/integration-hub/integration-hub.html`
No load/sample step — runs on internal data.
1. Click **ANALYZE**.
2. Click **RELAY TO STRATEGIST** → verify Strategist/Executive Portal render.

---

## Cross-cutting things to check once, not per-vertical

- **Rate-limit 502s**: if any `RUN AI ANALYSIS` / `ANALYZE` call hangs or 502s, it's most likely the Groq rate-limit issue on later engine calls. Retry once before assuming it's broken — `fetchGroqWithRetry` should catch most of it, but it's not bulletproof under back-to-back testing across 10 verticals in one sitting. If you're hammering through all 10 in one weekend session, pace it out a bit rather than rapid-firing every "RUN ANALYSIS" button back to back — that's the fastest way to trip the same rate limit that hit engines 5/6 before.
- **Session scope**: keep each vertical's War Room → Strategist → Executive Portal walk in the *same browser tab*, since some of this is `sessionStorage`-backed. Opening the Strategist page in a new tab can show blank even when the relay write succeeded.
- **Known non-issues confirmed this week**: none of this touches `cyber-incident.html`, `plant-incident.html`, or `supplier-shutdown.html` (the Honeywell chain) — that's a fully separate pipeline and doesn't need re-testing as part of this pass.
- **Known cosmetic gap**: Catalog's "Publish to CPQ" (see #3 above) — not a bug to fix before Monday, just don't demo it as functional.
- **Known entry-point mismatch**: on the real hub (`/war-rooms/index.html`), the **Launch →** button for Approval, Catalog, and CPQ opens stale flat copies instead of the `war-rooms/` files. Doesn't break the demo (same relay key underneath), but stick to typing the direct URLs above rather than clicking Launch for those three, so you're testing what you'll actually show.
- **`war-room-prep.html` is not this demo's hub** — it's an older page for a different set of verticals entirely (healthcare, finops-suite, etc.). Ignore it for this pass.

## Suggested order to actually run this over the weekend
Do Approval, CRM, and O2C first — they're the simplest three-button flow, good for confirming the base relay mechanism still works post-refactor. Then MDM (most backend complexity). Then the three no-load ones (Governance, Digital Twin, Integration Hub) since they're one click shorter. Save BPO and Catalog for last since they both have the extra wrinkles noted above.