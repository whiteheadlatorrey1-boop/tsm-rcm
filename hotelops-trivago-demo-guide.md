# HotelOps Demo Walkthrough — trivago Call Guide

**Goal of this call:** prove HotelOps is real and running (not a concept deck), then earn a second conversation about partnership or acquisition. Don't try to close anything on this call — close the *next* call.

---

## Before you dial in

- [ ] Server running, sample data loaded (Hilton Scottsdale dataset)
- [ ] Three tabs open and pre-loaded, in this order: **War Room → Strategist → Executive Portal**
- [ ] Confirm the numbers will render: RevPAR **$149.69**, Occupancy **85.6%**, **5** open tickets
- [ ] Deck and sensitivity model ready to *send after*, not to share-screen during — this call is about the product, not the pitch
- [ ] Know your own two-sentence answer to "why are you talking to us and not Booking/Expedia" (their scale is the reason — trivago's advertiser base skews independent/small-chain, exactly who feels this pain hardest)

---

## Opening (2 minutes)

Don't open with slides. Open with the gap:

> "trivago gets a hotel the booking. Once that guest checks in, trivago has no visibility into what happens next — tickets, incidents, occupancy tracking, revenue reporting. That's the gap HotelOps fills, and I want to just show you what it looks like rather than talk about it."

Then go straight to screen share.

---

## Live walkthrough (12–15 minutes)

### 1. War Room first — make it tangible
This is the floor of a hotel's day, live. Show the open incident/ticket list before touching anything else — it's the most concrete, least abstract thing you can show a stranger in minute one.

- Point out an open ticket, click into it
- Walk the lifecycle out loud as you click: **Create → Assign → QA → Deliver → Close**
- Show the audit trail on that ticket — who touched it, when, what changed
- One line to land: *"Every ticket here is a real object with a full audit trail — this isn't a spreadsheet with a UI on top."*

### 2. Strategist — this is where it stops looking like a dashboard
- Trigger a capability sweep or pull up a cached one
- Show it returning an actual recommendation tied to a specific mission's fields (not a generic tip)
- One line to land: *"It's not just surfacing data — it's telling a manager what to do next."*

### 3. Executive Portal — the numbers a GM or owner actually cares about
- Show RevPAR, ADR, Occupancy, GOP, NPS in one view
- Say the numbers out loud as they render: *"RevPAR $149.69, occupancy 85.6%, five tickets currently open"*
- **Then land the credibility point:** *"Those numbers aren't computed in the browser — we moved that math server-side and re-verified it against the same sample data. Same output, every time, auditable. That matters if this is ever running across real advertiser hotels instead of a demo."*

---

## If they ask (have these ready, don't script them rigidly)

- **"Why not build this ourselves?"** → You could — but it's 12+ months of a roadmap you'd have to prioritize over your core search product. This is already built and running.
- **"What's the data model / does this integrate with our systems?"** → Be honest about current state: it runs on a shared Mission runtime that's already proven across other verticals (construction, legal, healthcare); integration specifics are a real-diligence conversation, not a demo-day answer. Don't overclaim readiness you haven't verified.
- **"Is this just internal tooling with a new coat of paint?"** → No — walk them back to the audit trail and the server-side compute point if this comes up; those are the two proof points that answer it.
- **"What do you actually want from us?"** → This is your cue to open the door, not pitch: *"We think there's a partnership path and an acquisition path — I'd rather hear which one you'd want to explore before I assume."*

---

## Closing the call (2–3 minutes)

Don't present the deck live. Say:

> "I'll send over a short deck that lays out both paths we've thought through — a Business Studio-style partnership and an outright acquisition — plus a model you can drop your own numbers into. No pressure on which direction, I just didn't want to guess for you."

Then ask directly for the next step:

> "Would it make sense to get [relevant person on their side] in the room for a follow-up, or is there someone else internally we should be looping in?"

**Send within 24 hours while the demo is fresh:** the pitch deck (`hotelops-trivago-pitch.pptx`) and the sensitivity model (`hotelops-trivago-deal-model.xlsx`).

---

## The one thing to protect

Don't let this call become a negotiation. Its only job is: *prove it's real, learn who the right internal stakeholder is, get the follow-up.* Every other goal is for the next conversation.
