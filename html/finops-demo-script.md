# TSM FinOps Demo — War Room → Strategist → Executive → Sentinel Center

**Duration:** ~10–12 minutes
**Chain:** `finops-war-room.html` → `finops-main-strategist.html` → `finops-executive-portal.html` → `sentinel-center.html`
**Setup note:** Do a dry run first — this pushes real data through the relay chain (`TSM_FINOPS_STRATEGIST_RELAY`), so run once beforehand so the audience-facing run has clean live numbers instead of a cold start.

---

## Cold open (before clicking anything)

**Say:**
> "Most finance tools give you a static dashboard. What I'm going to show you is a live chain — one document goes in at the bottom, and it automatically escalates through four systems: a working analyst's desk, an AI strategist, an executive decision portal, and a cross-vertical risk sentinel that watches the whole business. Nothing here is copy-pasted between screens — it's one relay, four views."

---

## Part 1 — War Room (the analyst's desk)

**Open:** `finops-war-room.html`

**Say:**
> "This is where the raw work happens. An analyst drops in a document — AP aging, a bank rec, an ERA batch, whatever — and instead of manually working exceptions, six engines tear through it at once."

**Click-by-click:**
1. In the left sidebar under **DOCUMENT TYPE**, click **ERA Batch** (or whichever matches your sample).
2. Under **PASTE DOCUMENT TEXT**, click the **ERA Batch** sample chip to auto-load a realistic document — *or* paste your own.
3. Point at **AI ENGINE STATUS** — call out `● SERVER CONNECTED · PROXY ACTIVE`.
   > "This isn't a mockup response — it's a live model call."
4. Click **⚡ FIRE ALL 6 ENGINES**.

**While it runs, say:**
> "Six engines are working this in parallel — duplicate payment detection, aging risk, compliance exposure, vendor flags, GL variance, and recovery potential. This is the same triage a senior AP analyst would do by hand, compressed into seconds."

5. Once results populate, scroll the output and narrate 2–3 concrete flags it surfaced (e.g. a vendor exception, a risk score, a dollar exposure figure) — **use whatever the engine actually returned**, don't pre-script fake numbers here since the sample data will vary.
6. Click **⚡ ESCALATE TO STRATEGIST →**

**Say while it navigates:**
> "That escalate button isn't just a link — it hands the entire analysis to the Strategist as structured data. Nothing gets re-typed."

---

## Part 2 — Strategist (the synthesis layer)

**Lands on:** `finops-main-strategist.html` — *TSM · FinOps Main Strategist · Controller Action Plan*

**Say:**
> "This is the synthesis layer. It doesn't just summarize — it reasons across the War Room output and produces a Controller Action Plan a CFO could actually act on."

**Click-by-click:**
1. Point at the relay source chips (**War Room / Exec Portal / Manual**) — confirm **War Room** is active, and read the live status line: *"Pulling from: War Room — [document type] relay active."*
   > "It knows exactly where this data came from — full lineage, not a black box."
2. Point at the **Live Node Data Feed** panel — narrate 2–3 live rows as they stream (WR/EX/ST/CP tags).
3. Point at the **Risk Snapshot** panel on the left — call out **Financial exposure**, **AP aging risk**, and **CFO memo required**.
4. Click **▶ Generate Strategist Report**.

**While it generates, say:**
> "It's building an Executive Summary, a risk narrative, and specific next actions — not a generic template, this is grounded in the actual document that came through the War Room."

5. Once the report renders, scroll to the **relay push banner**: *"⚡ Report Generated — Relayed to Sentinel Center automatically · also ready for War Room or Executive Portal."*
   > "Notice it already says 'relayed to Sentinel automatically' — I haven't clicked anything to send this to the risk board yet. That already happened the instant the report finished generating. I'll go look at that in a minute."
6. Click **→ Push to Executive Portal** (or **→ Relay to Executive Portal**, depending on which button is visible in this build).

---

## Part 3 — Executive Portal (the decision layer)

**Lands on:** `finops-executive-portal.html` — *FinOps Executive Portal*

**Say:**
> "This is the view built for someone who doesn't have time to read the Strategist's full write-up. It's decisions, not detail."

**Click-by-click:**
1. Point at the top ticker — **EXPOSURE / RISK SCORE / EXCEPTIONS / COMPLIANCE / CFO ITEMS / RECOVERY** — scrolling live.
2. Point at **DECISIONS REQUIRED · EXECUTIVE AUTHORIZATION** — read the three rows: **AUTHORIZE**, **ESCALATE**, **REVIEW**.
   > "This is the whole point of the chain — six engines and an AI strategist collapse down into three concrete decisions someone with signing authority can act on today."
3. Point at the **PORTFOLIO KPIs** row — **TOTAL EXPOSURE, RISK SCORE, EXCEPTIONS, COMPLIANCE, RECOVERY POTENTIAL, CFO ITEMS** — call out whichever populated with real numbers from your run.
4. Point at the **STRATEGIST RELAY · AI SYNTHESIS** panel — confirm the relay dot is live and **"No relay received"** has changed to an actual timestamped relay title.
   > "That panel was empty a minute ago. It's not polling on a timer — it updated the instant the Strategist pushed."

---

## Part 4 — Sentinel Center (the enterprise risk board)

**Open:** `sentinel-center.html` — *TSM Sentinel Strategist Center*
*(Get here either via the Strategist's **◉ Open Sentinel Center** link, or navigate directly — it already has the data either way.)*

**Say:**
> "Here's the part most demos skip. Everything you just watched happen in FinOps — Sentinel already knows about it. This is the cross-vertical view: every business unit's Strategist writes anomalies here automatically, with no manual export."

**Click-by-click:**
1. Point at the top-right **VERTICALS REPORTING** counter and the live clock.
2. Point at the top KPI row — **Enterprise Exposure**, **Verticals At Risk**, **Top Cross-Vertical Threat**.
3. Scroll to **Cross-Vertical Causality Board**.
   > "This is the differentiator. It's not just 'FinOps has a problem' — it's showing risk pressure flowing *between* verticals. A vendor issue in FinOps can show up here as elevated exposure in Legal or Procurement, automatically."
4. Scroll to **Strategist Standings** — find the FinOps row and click it to expand.
   > "This expands to show every anomaly that specific Strategist has surfaced — same data you just watched get generated, now sitting in the enterprise-wide board."
5. Click into one anomaly to open **BNCA Impact Analysis**.
   > "This is a projection of what happens across the *rest* of the business if this one thing gets cleared — not just 'here's a problem,' but 'here's the ripple effect of fixing it.'"

---

## Close

**Say:**
> "So to recap the chain: one document, dropped in the War Room. Six engines triage it. The Strategist synthesizes it into a Controller Action Plan and automatically relays it two places at once — the Executive Portal for decision-making, and Sentinel for enterprise-wide risk visibility. No copy-paste, no manual export, no stale dashboard. That's the whole platform in one document's lifecycle."

**If asked "does this work for other business units?":**
> "Yes — this exact chain (War Room → Strategist → Executive) exists per-vertical: Healthcare, Legal, Insurance, Real Estate, BPO, and others all follow the same pattern and all report into this same Sentinel Center."

---

## Fallback / troubleshooting talk points

- **If the AI engine call is slow or fails:** *"This is a live model call, not canned output — let me re-fire it,"* then click **⚡ FIRE ALL 6 ENGINES** / **⚡ FIRE ALL 4 ENGINES** again. Don't apologize at length; treat it as a normal live-demo moment.
- **If Sentinel shows sample data instead of your live push:** point at the banner — *"Verticals switch to LIVE automatically once their Strategist writes to the relay — let's confirm FinOps shows LIVE"* — and check the FinOps row's status badge.
- **If numbers look emptier than expected on Executive Portal:** the alert bar literally tells you why — *"EXECUTIVE PORTAL ACTIVE — AWAITING STRATEGIST RELAY — RUN WAR ROOM ANALYSIS FIRST"* — use that as a teaching moment about the relay dependency rather than treating it as a bug.
