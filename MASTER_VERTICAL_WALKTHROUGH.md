# TSM Consultz — Master Vertical Walkthrough
## War Room → Strategist → Executive Portal (8 Core Verticals)

**Verticals covered:** Healthcare, Construction, FinOps, Insurance, Legal, Real Estate, Mortgage, Schools
**Pattern:** every vertical runs the same three-layer chain — operator desk (War Room) → analytical handoff (Strategist) → leadership decision surface (Executive Portal). All onClick chains below are verified against the live HTML/JS, not assumed.

---

## 0. The Story (use before touching any vertical)

**Talk points:**
- "Every one of these eight verticals runs the same three conversations: what's happening on the ground, what does it mean, what does leadership need to decide. Normally that's three tools and three people. Here it's one connected chain."
- "The War Room is the operator's desk — live engines running against real case data. The Strategist is the analytical layer that turns that into a report. The Executive Portal is where a decision gets made and a client package gets exported."
- "Watch the data travel. Nothing gets re-typed between screens."

---

## 1. Healthcare (HC)

**Path:** `html/healthcare/hc-denial-war-room.html` → `html/healthcare/hc-main-strategist.html` → `html/healthcare/executive-portal.html`
**Relay key:** `tsm_hc_docsearch_relay` / `TSM_HC_WAR_RELAY`

### War Room — `hc-denial-war-room.html`
- **⚡ FIRE ALL 5 ENGINES** — `fireAll()` — runs the denial-analysis engine stack against loaded claims data.
- **↗ Escalate to Strategist** — `escalateToStrategist()` (`#escalate-strategist-btn`) — hands the fired-engine output to the Strategist.
- **⬇ Export All / Export Full Report** — `exportAll()` — three separate export touchpoints (summary, full report, footer variant).
- **⚡ Run New Scenario** — `fireAll()` re-triggered from the results panel.

**Talk points:**
- "This is denial management for a multi-site practice group — Scottsdale, Mesa, Tempe, North Mountain. Five engines fire at once: eligibility, coding, prior-auth friction, appeal drafting, and payer-pattern detection."
- Click **FIRE ALL 5 ENGINES** → "That's not a canned demo response — it's reading the loaded denial codes (CO-29, PR-96, CO-4, CO-11) and building the same intervention list a denial manager would build by hand."

### Strategist — `hc-main-strategist.html`
- **◈ Run HC Strategist Analysis** (`#strat-run-btn`) — `runStrategist()`.
- **Quick-ask presets** (`quickAsk(...)`): Mesa Denial Spike, Board Brief, 99215 Defense, Site Variance Analysis — each fires a fully-scoped prompt with real dollar figures baked in (e.g. "$48K revenue at risk," "47 claims, $8,460").
- **⚡ GENERATE APPEAL FROM SELECTED CASE** — `tsmGenerateAppealFromSelectedCase()`.
- **◈ ANALYZE** (denial code breakdown) — `runDenialAnalysis()`.
- **◈ Medicare Strategy / ◈ Aetna Strategy** — payer-specific `quickAsk(...)` calls.
- **Escalate to Exec Portal** — `escalateToExecPortal()`.

**Talk points:**
- "The Strategist isn't starting cold — it inherited the fired-engine context from the war room. Watch: Board Brief." Click it. "That's a board-ready narrative with the 18.4% denial rate, the $48K at risk, and a recovery plan, generated in one click from data that already existed upstream."

### Executive Portal — `executive-portal.html`
- **⬇ EXPORT CLIENT PACKAGE** (`#tsmk-delivery-btn`) — `exportClientPackage()`.
- **⬇ Export Executive Report** (`#esc-export-btn`) — `exportExecutiveReport()`.
- **⚡ GENERATE / REFRESH DENIAL PACK** — `sbGenerateDenialPack()` / `generateDenialPack()`.
- **📋 GENERATE PHYSICIAN E/M TEMPLATE** — `sbGeneratePhysicianEMTemplate()`.
- **◈ RUN HC STRATEGIST ANALYSIS** (from within the exec portal itself) — `sbRunStratEngine()`.
- **✓ RELAY NOTE TO STRATEGIST** — `submitExecNote()` — closes the loop back down to the strategist layer.

**Close:** "Export Client Package — that's the board-ready PDF, generated from the exact same session data that started at the war room three screens ago."

---

## 2. Construction

**Path:** `html/war-rooms/construct-war/construction-war-room.html` → `construction-strategist.html` → `construction-executive-portal.html`

### War Room
- Nav bar: **STRATEGIST** / **EXECUTIVE** — `goNav('construction-strategist.html')`, `goNav('construction-executive-portal.html')`.
- **⚡ FIRE ALL 6 ENGINES** (`#fireBtn`) — `fireEngines()`.
- **⚡ ESCALATE TO STRATEGIST →** — `escalateToStrategist()`.
- **EXPORT ANALYSIS** — `exportFull()`.
- **→ OPEN PERMITS & PROPOSALS / → OPEN FIELD & DOCUMENT OPS** — `tsmRouteToPermits()` / `tsmRouteToFieldOps()` — deep-links into adjacent modules.

**Talk points:**
- "Six engines: budget variance, retainage, lien waivers, pay-app matching, GL reconciliation, and compliance. Fire them together — this is the same close-day workload a project accountant runs manually across three systems."

### Strategist
- **Executive** sidebar link — direct `window.location.href` to the exec portal.
- **→ ESCALATE TO EXECUTIVE** — `escalateToExecutive()`.
- **◈ INJECT INTO STRATEGIST** — `injectWarRoomContext()` — pulls war-room findings into the active strategist session.
- **EXEC** issue-pack assignment — `assignConstIssuePack('Construction Executive')`.

### Executive Portal
- **STRATEGIST** nav — `nav('construction-strategist.html')`.
- **AUTHORIZE** (`#d1-authorize-btn`, `data-action="approve"`) — `tsmConfirmExec()`.
- **OPEN** — routes back to strategist for a specific decision item.
- **⬇ EXPORT CLIENT PACKAGE** (`#tsmk-delivery-btn`) — `exportClientPackage()`.
- **OPEN STRATEGIST** (footer) — `nav('construction-strategist.html')`.

**Talk points:**
- "AUTHORIZE is a real state change — it flips the decision item's status and it's what unlocks the client package export."

---

## 3. FinOps

**Path:** `html/finops-suite/finops-war/finops-war-room.html` → `finops-main-strategist.html` → `finops-executive-portal.html`

### War Room
- Nav: **DOC ANALYSIS** — `nav('doc-analysis-tab.html')`; **STRATEGIST** — `nav('finops-main-strategist.html')`; **EXECUTIVE** — `nav('finops-executive-portal.html')`.
- **▶ GUIDED TOUR** — `startTour()`.
- **⚡ FIRE ALL 6 ENGINES** (`#fireBtn`) — `fireEngines()`.
- **⚡ ESCALATE TO STRATEGIST →** — `escalateToStrategist()`.
- **EXPORT ANALYSIS** — `exportFull()`.

### Strategist
- Two tabs: **▶ Strategist Report** / **⚡ 4-Engine Doc Analysis** — `switchTab(...)`.
- **Relay source chips** — `setRelaySource('exec', this)` — lets the strategist pick which upstream session (exec vs war room) feeds the report.
- **▶ Generate Strategist Report** (`#genBtn`) — `generateReport()`.
- **→ Relay to Executive Portal** (`#relayExecBtn`) — `relayToExecutive()`.
- **⚡ FIRE ALL 4 ENGINES** (`#fireBtn`) — `fireAllEngines()` — a second, doc-analysis-specific engine set.
- **📤 MGR EXPORT** / **→ PUSH TO STRATEGIST** — `managerExport()` / `pushDocToStrategist()`.
- **Log Approvals → Relay to Executive** — `submitApprovals()`.
- **▶ Run Strategist →** — `generateReport()` (CTA variant).

### Executive Portal
- Nav: **DOC ANALYSIS**, **STRATEGIST** — `nav(...)`.
- Decision card **STRATEGIST** button — `nav('finops-main-strategist.html')`.
- **⬇ EXPORT CLIENT PACKAGE** — `exportClientPackage()`.
- **OPEN STRATEGIST** — `nav('finops-main-strategist.html')`.

**Talk points:**
- "FinOps is the only vertical here with two separate engine stacks — 6 in the war room for GL/AP posture, 4 in the strategist for document-level analysis. Relay Source chips let the strategist decide which upstream context to pull from before generating the report."

---

## 4. Insurance

**Path:** `html/war-rooms/insure-war/insurance-war-room.html` → `insurance-strategist.html` → `insurance-executive-portal.html`

### War Room
- Nav: **STRATEGIST** / **EXECUTIVE** — `nav(...)`.
- **⚡ FIRE ALL 6 ENGINES** (`#fireBtn`) — `fireEngines()`.
- **⚜ ESCALATE TO STRATEGIST →** — `escalateToStrategist()`.
- **EXPORT ANALYSIS** — `exportFull()`.

### Strategist
- Nav: **EXECUTIVE** — `nav('insurance-executive-portal.html')`.
- **⚜ RUN STRATEGIST CHAIN** (`#runBtn`) — `runStrategist()`.
- **→ SEND TO EXECUTIVE PORTAL** — `escalateToExec()`.
- **EXPORT PACKAGE** — `exportPackage()`.

### Executive Portal
- Nav / decision-card **STRATEGIST** — `nav('insurance-strategist.html')`.
- **⬇ EXPORT CLIENT PACKAGE** — `exportClientPackage()`.
- **OPEN STRATEGIST** — `nav('insurance-strategist.html')`.

**Talk points:**
- "RUN STRATEGIST CHAIN is the phrase to watch — it's not one call, it's a chained sequence: claims triage → coverage analysis → reserve recommendation, in order, each step feeding the next."

---

## 5. Legal

**Path:** `html/war-rooms/legal-war/legal-war-room.html` → `legal-main-strategist.html` (chief) — with `case-strategist.html` as a case-level intermediate layer → `legal-executive-portal.html`

### War Room
- Nav: **STRATEGIST** (case-level, `case-strategist.html`), **CHIEF STRATEGIST** (`legal-main-strategist.html`), **EXECUTIVE PORTAL** (`legal-executive-portal.html`) — three-deep chain, unique to Legal.
- **⚡ FIRE ALL 6 ENGINES** (`#fireBtn`) — `fireEngines()`.
- **⬇ EXPORT FULL REPORT** — `exportFull()`.
- **⚡ ESCALATE TO LEGAL CHIEF STRATEGIST →** — `escalateToChief()`.
- Footer links to all three downstream screens (Case Strategist, Chief Strategist, Executive Portal).

### Chief Strategist — `legal-main-strategist.html`
- **Escalate** link (`#escalate-btn`, href to exec portal) — `writeExecRelay(event)` fires on click before navigating, writing the relay payload.
- **Export Full Report** — `exportFullReport()`.

### Executive Portal
- **⬇ EXPORT CLIENT PACKAGE** (`#tsmk-delivery-btn`) — `exportClientPackage()`.
- **APPROVE** — `authorizeAction(this, 'Discovery Expansion')` — a named, case-specific authorization action (differs from the generic AUTHORIZE seen in other verticals).

**Talk points:**
- "Legal is the deepest chain on the platform — case-level strategist *and* a chief strategist above it, because a single case escalates to the case strategist, but portfolio-wide legal risk escalates to the chief. Two altitudes, one platform."
- "APPROVE isn't generic — it's tied to a named action, 'Discovery Expansion,' logged with that label in the audit trail."

---

## 6. Real Estate (RE)

**Path:** `html/war-rooms/re-war/re-war-room.html` → `re-strategist.html` → `re-exec-portal.html`
*(Real Estate and Mortgage share one operating chain in this build — see §7 for the Mortgage-specific screens.)*

### War Room
- **↗ ESCALATE → STRATEGIST** — `escalateToStrategist()`.
- **Quick-fire presets** — `quickFire('...')` — cross-node synthesis, highest-risk deal, compliance sweep (TRID/HMDA/Fair Housing/FinCEN), REO disposition, market intel — each a fully-scoped prompt, not a generic button.
- **Engine buttons** (01–04): Acquisition, Finance, Transaction, Mortgage Ops — each its own `quickFire(...)` call.

### Strategist — `re-strategist.html`
- **↗ ESCALATE → EXEC PORTAL** — `escalateToExec()` (appears twice: toolbar and results panel).
- **↓ EXPORT** / **↓ EXPORT (.TXT)** — `exportReport()`.
- **30-day action plan** preset — `quickStrat('...')`.

### Exec Portal — `re-exec-portal.html`
- Sidebar: **RE Strategist** — `goto('/html/war-rooms/re-war/re-strategist.html')`.
- **Export Full Session / Export Board Report** — `exportSession()` / `exportBoard()`.
- **⚡ GENERATE BRIEF** / **🔴 DEAL RESCUE** — `generateBrief()` / `generateBrief('rescue')`.
- **⚡ AI-GENERATE ACTION ITEMS** — `generateActions()`.
- **⚡ REFRESH PIPELINE ANALYSIS** — `generatePipeline()`.
- **⚡ GENERATE BOARD REPORT** — `generateBoard()`.

**Note:** RE's exec portal is the one screen in this set with **no** `exportClientPackage()` wiring — it uses `exportSession()` / `exportBoard()` instead. Don't promise "Export Client Package" on this specific screen; use "Export Board Report."

**Talk points:**
- "🔴 DEAL RESCUE is worth calling out by name — same generator as the standard brief, but scoped specifically to a deal that's about to fall apart, with an amber visual treatment so it reads as urgent in the sidebar."

---

## 7. Mortgage

**Path:** `html/war-rooms/mortgage/mortgage-war-room.html` → `mortgage-strategist.html` → `mortgage-executive-portal.html`

### War Room
- **LOAD SAMPLE DATA / RESET SAVED DATA** (`#btnLoadSample`, `#btnResetData`) — event-listener bound, not inline onclick.
- **RUN AI ANALYSIS** (`#btnRunAnalysis`) — `runAnalysis()`.
- **RELAY TO STRATEGIST →** (`#btnRelay`) — `relayToStrategist()`.

### Strategist
- **Export** (`#printBtn`) — `window.print()` (this vertical uses print-to-PDF rather than a custom export function).
- **Executive View →** — plain `<a href="mortgage-executive-portal.html">`, no relay-write on click.

### Executive Portal
- **Export** (`#printBtn`) — `window.print()`.
- **↳ EXPORT CLIENT PACKAGE** (`#tsmk-delivery-btn`) — `exportClientPackage()`.
- **✓ ACKNOWLEDGE** — `recordExecAction('acknowledged', ...)`.
- **↑ ESCALATE** — `recordExecAction('escalated', ...)` — notifies the closing manager per the toast copy.

**Talk points:**
- "Mortgage is the template the Schools vertical was built from — notice the pattern: sessionStorage *and* localStorage both get written on relay, so the strategist picks it up whether it's the same tab or a new one."
- "ACKNOWLEDGE and ESCALATE are both logged actions, not just UI state — they write to the relay/audit trail with a specific message string, visible if you check the event log."

---

## 8. Schools

**Path:** `html/war-rooms/schools-command/schools-command.html` → `schools-strategist.html` → `schools-executive-portal.html`

### War Room — `schools-command.html`
- **🧠 Strategist →** (`#tsm-chain-strat`) — link to `schools-strategist.html`.
- **🤖 Run AI Analysis** (`#schBtnRunAnalysis`) — `schRunAnalysis()`, which:
  1. Runs the engine (`engine.runAnalysis()`).
  2. Writes the relay payload to **both** `sessionStorage` and `localStorage` under `TSM_SCHOOLS_RELAY` (`schWriteRelay`).
  3. Fires a `TSM_RELAY_EVENT` custom event for same-tab listeners (since the native `storage` event only fires cross-tab).
  4. Creates a Mission Core record (`schCreateMissionFromRelay()`).
  5. **Fails gracefully:** if the AI call itself errors, KPI/financial data still relays so downstream screens don't go dark.
- **Prompt library** (`loadPrompt(...)`) — pre-scoped compliance prompts: subrecipient monitoring, single audit / SEFA, grant closeout, ESSER allowable use, MOE, 501(c)(3) / Form 990, bond arbitrage (IRC §148), excess benefit transactions (IRC §4958), ADA/504, SOX 302/906, cybersecurity/CISA K-12.

### Strategist
- **Export** (`#printBtn`) — `window.print()`.
- **Executive View →** — plain link to `schools-executive-portal.html`.
- **← Command Center** — plain link back to `schools-command.html`.

### Executive Portal
- **Export** (`#printBtn`) — `window.print()`.
- **⬇ EXPORT CLIENT PACKAGE** (`#tsmk-delivery-btn`) — `exportClientPackage()`.
- **✓ ACKNOWLEDGE** — `recordExecutiveAction('ACKNOWLEDGED', ...)`.
- **↑ ESCALATE** — `recordExecutiveAction('ESCALATED', ...)` — copy references notifying the program officer.

**Talk points:**
- "This is a K-12/school-district compliance desk — the prompt library alone covers federal grants, tax-exempt status, bond compliance, and cybersecurity. That breadth is the pitch: one operator screen, eleven distinct regulatory domains."
- "Run AI Analysis is the one button on this whole platform that's documented to fail *safely* — if the model call errors, the KPI relay still fires so the strategist and exec screens don't show stale or blank data."

---

## Cross-Vertical Patterns Worth Naming in a Demo

1. **Escalation is state, not just navigation.** Most "Escalate" buttons (`escalateToStrategist`, `escalateToExec`, `writeExecRelay`, `schWriteRelay`) write a payload to storage *before* moving screens — the receiving screen reads real data, it isn't just a link.
2. **Two relay mechanisms coexist.** Legacy verticals (Legal, Construction, FinOps, Insurance) use dedicated JS functions per action. Newer ones (Mortgage, Schools) standardized on a shared relay pattern: `sessionStorage` + `localStorage` + a custom `TSM_RELAY_EVENT` for same-tab updates.
3. **`exportClientPackage()` is the common exec-portal export**, present on HC, Construction, FinOps, Insurance, Legal, Mortgage, and Schools. **Real Estate is the one exception** — it uses `exportSession()` / `exportBoard()` instead. Don't promise "Export Client Package" language on the RE exec portal.
4. **ACKNOWLEDGE / ESCALATE with logged messages** (Mortgage, Schools) is the most audit-trail-forward pattern — worth showing to a compliance-sensitive buyer.
5. **Legal is the only three-tier chain** (case strategist → chief strategist → executive) — call this out explicitly since every other vertical is a flat three-screen chain.

---

*Verified against live source in `tsm-rcm` repo. All onClick/event-listener bindings above were confirmed by direct grep against the HTML files, not inferred from naming conventions.*
