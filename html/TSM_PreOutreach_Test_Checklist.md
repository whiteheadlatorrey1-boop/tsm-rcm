# TSM Pre-Outreach Test Checklist

Run this top to bottom **the day before** your first call/email batch, and again **the morning of** any live screen-share. Budget ~30-40 minutes for the full pass.

---

## 1. Cold-Load Sanity Check (catches stale deploys)

- [ ] Open an **incognito/private window** (no cached assets, no localStorage from your dev sessions)
- [ ] Go to `tsm-shell.fly.dev` — confirm the hub/landing page loads with no broken images or layout shifts
- [ ] Open DevTools Console (F12) and **leave it open for every test below** — you're hunting for any red errors
- [ ] Confirm there's **no leftover red error** like the `tsm-mission-orchestrator.js` syntax error from earlier — if you see ANY uncaught error on page load, stop and fix it before moving on (a parse error on one shared script can silently break features on every page that loads it)

---

## 2. Console Error Sweep — Every Page You'll Touch Live

For each URL below, load it in the incognito window and confirm **zero red errors** in console:

- [ ] `/html/bpo/bpo-doc-uploader.html`
- [ ] `/html/bpo/bpo-war-room.html`
- [ ] `/html/bpo/bpo-strategist.html`
- [ ] `/html/bpo/bpo-executive-portal.html`
- [ ] `/html/insurance-strategist.html` (or wherever your Insurance War Room lives)
- [ ] `/html/tsm-bpo-daily-workflow-gtm.html`
- [ ] `/html/tsm-bpo-competitive-playbook.html`
- [ ] `/html/suite-builder.html`
- [ ] `/html/hub-index.html`

If any page throws an error, note the file + line number, fix it via Ctrl+H find/replace, commit, and **re-run the cold-load test on that page** before continuing — don't assume the fix worked without re-checking.

---

## 3. Demo Mode End-to-End (BPO War Room)

This is the flow you just built — re-verify it works from a clean state, not just from your dev console:

- [ ] In incognito, go directly to `tsm-shell.fly.dev/html/bpo/bpo-war-room.html?demo=1` **without** pre-seeding sessionStorage
- [ ] Confirm it does **not** crash — since `TSM_BPO_DOC` won't exist, the demo IIFE should silently no-op (per the `if(!docText) return;` guard) and the page should still load normally with "Awaiting document load" placeholders
- [ ] Now go through the **toolbar buttons**: click `▶ DEMO MODE`, pick a scenario, confirm it redirects to `?demo=1` and **auto-fires** within ~1.5s
- [ ] Run **all 4 demo scenarios** at least once each (HC Denial CO-50, Construction Dispute, Legal MSA Breach, FinOps Cloud Anomaly) — confirm each one populates Sector/Doc Type correctly and all 6 engines complete
- [ ] For each scenario, confirm the **App Dispatch (Engine 06)** produces real recommendations, not the generic 3-app fallback (the fallback only fires if Groq returns empty/errors — if you see it on every run, your Groq key or `/api/hc/query` route may be misconfigured)
- [ ] Click **Escalate → BPO Strategist** and confirm the relay carries data forward (sector, exposure, defects) rather than landing on an empty strategist page

---

## 4. Insurance Strategist — CO-50 DME Scenario (Top Target #2 demo)

This is your Copper Star pitch — test it as if Copper Star is watching:

- [ ] Load the Insurance War Room cold (incognito)
- [ ] Confirm the **Mission Guide panel** loads correctly (per your recent fix)
- [ ] Run the CO-50 / DME denial scenario manually (paste a realistic CO-50 denial doc if there's no demo button here yet)
- [ ] Confirm `buildDefectManifest()` produces document-specific defects, not generic placeholder text
- [ ] Confirm the **Anomaly Advisor** side panel auto-triggers after engine completion
- [ ] Time the full run — if any single engine takes more than ~10-15 seconds, that's a dead-air moment in a live demo. Note it so you can narrate through it ("while that's running, let me show you...")

---

## 5. Competitive Playbook (Act 1 — The Hook)

- [ ] Load `tsm-bpo-competitive-playbook.html` cold
- [ ] Confirm the **headline stat screen** (12 scenarios / <30 min / 9 nodes) renders correctly and is the first thing visible — this is your silent opener, it needs to look perfect
- [ ] Scroll to the **scenario grid** — confirm all 12 cards render with correct titles and percentage stats (no "undefined" or placeholder text)
- [ ] Expand **one card per target type** you'll actually demo (Claims Denial Mgmt, Prior Auth, Eligibility Verification, Staffing & Scheduling, HIPAA Risk) and confirm:
  - The step-by-step execution guide is fully populated
  - The embedded AI prompt text is visible and not cut off
  - Any "open this app" / "run this scenario" links actually navigate correctly

---

## 6. BPO Daily Workflow GTM (Top Target #3 demo — RemX)

- [ ] Load `tsm-bpo-daily-workflow-gtm.html` cold
- [ ] Confirm the **left sidebar schedule** (Morning Standup → FinOps → Construction → Healthcare → Lunch BNCA → Insurance) renders in correct order with no missing icons/labels
- [ ] Confirm the **Domain Status tracker** on the right shows correct starting counts (0/8, 0/7, etc.) — not stale numbers from a previous test session (check this is reading fresh state, not cached localStorage)
- [ ] Click the **Healthcare tab** — confirm the 8-step clinical workflow with phases renders
- [ ] Click **Ask AI** on "Prior Auth Queue" — confirm output streams within a reasonable time and contains real guidance, not an error message
- [ ] Click **Run Full BNCA** — confirm it waits for/handles the case where not all domains have activity yet (does it still produce a sensible brief, or does it error/hang?). **This is your closer button — if it breaks live, it's your worst possible moment.**

---

## 7. Suite Builder (Act 3 — The Close)

- [ ] Load `suite-builder.html` cold
- [ ] Confirm it reflects the **current/expanded app inventory** (not an outdated list missing recent additions like the Real Estate or Legal suites)
- [ ] Confirm any links from Suite Builder to individual apps (CRC Practice, CRCR Scenarios, AHIP Prep, Interview Prep, Accounting Study Guide) all resolve — **404s here during your close would undercut the entire pilot pitch**

---

## 8. Cross-Page Relay Spot Check

Pick **one** full chain and walk it end to end to confirm sessionStorage relay still works after all your recent edits:

- [ ] BPO Intake → UNDERSTAND → DECIDE → EXECUTE → TRUST (or Insurance/Healthcare equivalent)
- [ ] At each hop, confirm the receiving page shows data from the previous page (sector, exposure, KPIs) — not blank/dash placeholders

---

## 9. Display & Screen-Share Readiness

- [ ] Open the site at the **resolution you'll actually screen-share at** (if you'll demo from a laptop connected to a projector or on a video call, test at that resolution — dark UIs with small text can become unreadable on compressed video)
- [ ] Zoom browser to ~100-110% and confirm no text overflow or cut-off panels (your dark-themed war rooms have a lot of dense small text)
- [ ] Test on whatever device you'll **actually present from** — if it's a different laptop than your dev machine, do at least the Demo Mode test (#3) and BPO Daily Workflow test (#6) on it

---

## 10. API Key / Rate Limit Check

- [ ] Confirm your Groq API key is valid and has **enough headroom** for a live multi-engine run without hitting rate limits mid-demo (a rate-limit error during Engine 03 of 6, live, in front of a prospect, is the nightmare scenario)
- [ ] If using a shared/server-side key (`/api/hc/stream`), confirm the per-client rate limiting won't throttle you if you run the same demo 2-3 times in testing right before the call

---

## 11. Backup Plan (in case something breaks live)

- [ ] Have **screenshots or a short screen recording** of each key flow (Demo Mode full run, CO-50 scenario, Run Full BNCA output) saved locally as a fallback if Wi-Fi/Fly.io has a hiccup mid-call
- [ ] Know which **one scenario per target** is your "safest" — i.e., the one you've tested most and are most confident won't surprise you — and default to that if you're short on prep time before a specific call

---

## Quick Pass/Fail Summary

If you only have 10 minutes before a call, prioritize:
1. Cold-load + console check on the **specific page(s)** for that target (Section 2)
2. Run the **specific demo scenario** for that target once, start to finish (Sections 3, 4, or 6 depending on target)
3. Confirm **Run Full BNCA** or **Escalate** button works if your script depends on it