# HotelOps × trivago — Partnership Call Script
**Goal: prove it's real, land the Business Studio fit, get the follow-up meeting with the right stakeholder. This call is built to close a partnership conversation — not an acquisition. Don't let it drift into deal-structure talk; that's the next call.**

---

## Before you dial in

- [ ] Server running, sample data loaded (Hilton Scottsdale dataset)
- [ ] **Force-clear browser storage first** — don't rely on DevTools "Clear site data" alone, it can miss relay keys. Open DevTools Console on any HotelOps page and run:
  ```
  localStorage.clear(); sessionStorage.clear();
  ```
  Reload and confirm you see "NO DATA RECEIVED" before the call — guarantees a clean live run.
- [ ] Three tabs open, in this order: **War Room → Strategist → Executive Portal**
- [ ] Confirm numbers render: RevPAR **$149.69**, ADR **$174.82**, Occupancy **85.6%**, GOP margin **31.4%**, NPS **62**, **5** open maintenance tickets
- [ ] Deck and Business Studio one-pager ready to *send after*, not share-screen during
- [ ] Know your two-sentence answer to "why trivago and not Booking/Expedia" — their advertiser base skews independent/small-chain, exactly who feels this pain hardest and exactly who Business Studio already serves

---

## Opening (2 minutes) — set up the gap, don't pitch yet

Don't open with slides. Open with the gap:

> "trivago gets a hotel the booking. Once that guest checks in, trivago has no visibility into what happens next — tickets, incidents, occupancy, revenue health. That's the gap HotelOps fills. I want to show you, not tell you."

Go straight to screen share — the War Room tab, already loaded.

---

## PART 1 — War Room: make it tangible (4-5 minutes)

**Narration as you click — say this while you're doing it, not before:**

> "This is the floor of a hotel's day, live. Before I touch anything, look at what's already sitting here."

**Navigation:**
1. Point at the KPI bar across the top — RevPAR, ADR, Occupancy, GOP margin, NPS, open tickets — without clicking anything yet.
2. Click **"Load Sample Data"** (`#btnLoadSample`) if not already loaded.
3. Scroll to the incident list. **Click into INC-11** — "Guest injury — pool deck slip."

### 🌟 WOW MOMENT #1 — the leading-indicator hook
This is the single most important moment of the call. Land it here, not later:

> "See this note? 'Unresolved safety incidents in shared areas are a documented driver of 1-2 star review clusters within 72 hours.' Your Guest Rating App inside Business Studio would tell you about this hotel's rating dropping — probably three weeks from now, after the review posts. HotelOps is telling you *right now*, while there's still time to fix it before the guest ever leaves a review. Same signal, three weeks earlier."

Pause here. Let it land. Don't rush into the next section.

4. Click **"Run Analysis"** (`#btnAnalyze`) — wait for the AI output to populate.
5. Narrate: *"It's not just flagging incidents — it's reasoning over them and telling a manager what to prioritize."*
6. Click **"Relay to Strategist"** (`#btnRelay`) — narrate: *"Every handoff here is hashed and auditable — this isn't a spreadsheet with a UI on top."*

---

## PART 2 — Strategist: reasoning, not just surfacing (3-4 minutes)

**Navigation:** Switch to the pre-loaded Strategist tab (or click through if you didn't pre-load it).

**Narration:**
> "This is where it stops looking like a dashboard and starts looking like a second set of hands."

Point at the **AI Operations Analysis** panel — the highest-severity SLA-breached tickets, the OTA overcharge exposure, the compliance deadline — all with specific recommended next actions, not generic tips.

### 🌟 WOW MOMENT #2 — the OTA overcharge catch
Point specifically at the OTA overcharge line:

> "OTA-3001, Expedia — contracted rate 15%, actually charged 18.5%. That's a $147 overcharge on one booking, caught automatically, with the dispute language already drafted. Run that pattern across a hotel's full booking volume for a quarter and this alone can pay for the platform."

Point at the **Business Impact Delta** panel (no action vs. with action) — narrate the dollar swing out loud.

---

## PART 3 — Executive Portal: the numbers a GM or owner actually watches (3-4 minutes)

**Navigation:** Switch to Executive Portal tab.

**Narration:**
> "Same data, now framed for whoever owns the P&L."

Say the numbers out loud as they render: *"RevPAR $149.69, occupancy 85.6%, GOP margin 31.4%."*

### 🌟 WOW MOMENT #3 — server-side, auditable, not a browser trick
> "These aren't computed in the browser. We moved that math server-side and re-verified it against the same sample data — same output, every time, auditable. That matters the moment this touches real advertiser hotels instead of a demo."

---

## PART 4 — The Business Studio fit (this is the pitch, land it clearly) (4-5 minutes)

Stay on the Executive Portal screen for this — don't switch away, keep it as the visual anchor.

**Open this section with the reframe:**

> "I looked at what Business Studio already does for your independent hoteliers — Rate Connect, the Guest Rating App, performance analytics. Every one of those is pricing or reputation-focused, and always *after the fact*. None of them see what's happening inside the property between checkin and checkout. That's the layer HotelOps adds — and it slots in as a new tier, not a replacement for anything you've built."

**Walk through 2 of these live — don't read all of them, pick the two that land best with whoever's in the room:**

- **Guest Rating App → HotelOps Incident Tracking** (you already proved this in Wow Moment #1 — just callback to it: *"That's the pool-deck incident I showed you a minute ago."*)
- **Rate Connect → HotelOps RevPAR/Occupancy/GOP** — *"Rate Connect gets the right rate in front of a traveler. It has no idea if the hotel behind that rate is actually running well. This is the operational half of that picture."*
- **PRO package upsell model → HotelOps as a new premium tier** — *"You already have a proven free-to-PRO upsell motion. This could slot into that exact same commercial pattern — a new tier inside Business Studio, not a separate product with a separate sales team."*

### 🌟 WOW MOMENT #4 — the stated-risk callback
This is the strongest close-the-loop line in the whole call. Deliver it deliberately, not rushed:

> "You've told your own investors that dependence on a small number of large advertisers is a real risk to your revenue. You've also been actively rebalancing your marketplace toward more independent hotels — Book & Go grew 609% since 2023 specifically by going deeper into that segment. Independent hotels are exactly the operators who can't afford enterprise ops software and are hardest to keep as healthy, reliable advertisers. HotelOps is infrastructure for the exact advertiser base you're already trying to grow."

**Immediately follow with the honesty guardrail — don't skip this, it's what makes the pitch credible instead of oversold:**

> "To be clear — none of this is integrated today. No live connection between HotelOps and Business Studio exists yet. This is a product-fit case, not a claim it's already wired together. How it would actually surface inside Business Studio's UI is real work for the next conversation."

---

## If they ask (don't script rigidly, just have the shape ready)

- **"Why not build this ourselves?"** → You could — but it's 12+ months of roadmap you'd have to prioritize over your core search product. This is already built and running.
- **"Does this integrate with our systems?"** → Be honest: it runs on a shared platform already proven across other verticals; integration specifics are real diligence, not a demo-day answer.
- **"Is this just internal tooling with a new coat of paint?"** → Walk back to the server-side compute point and the audit trail — those are your two proof points.
- **"What do you actually want from us?"** → *"A Business Studio partnership path — offering HotelOps as a new tier or add-on to your existing advertisers, starting with a pilot on a subset of independent hotels. I'd rather hear if that's the right shape for you than assume it."*

**If acquisition comes up unprompted:** don't shut it down, but don't chase it either — *"That's a bigger conversation than today's call is built for. Let's see if the partnership fit is real first — that's a faster, lower-risk way for both of us to learn if this is worth going further on."* Keep steering back to partnership; that's the deal this call is built to close.

---

## Closing (2-3 minutes)

> "I'll send over a short deck that lays out the Business Studio partnership fit in more detail, plus a pilot structure you could run with a small set of independent hotels first — low commitment, real signal on whether this moves advertiser retention or spend stability. No pressure on shape, I didn't want to guess for you."

Ask directly:

> "Would it make sense to get [relevant person on their side — likely someone on Business Studio product or advertiser success] in the room for a follow-up?"

**Send within 24 hours:** the Business Studio partnership one-pager and the pilot structure outline.

---

## The one thing to protect

This call's only job: *prove it's real, land the Business Studio fit, learn who the right internal stakeholder is, get the follow-up.* If the conversation drifts toward deal terms, valuation, or acquisition structure — gently redirect. That's not this call's job, and trying to do it here risks looking like you're overreaching before you've even proven the product fit.
