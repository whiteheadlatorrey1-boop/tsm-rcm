# TSM-Consultz — Sales Deck Templates (Per Industry)

One template structure, repeated per vertical with swapped screenshots and industry-specific pain points. Image paths reference `./media/` from the generated media kit.

---

## Universal structure (applies to every vertical below)

1. **Title slide** — [Industry] + TSM-Consultz
2. **The pain point** — industry-specific problem framing (your copy, not screenshot-driven)
3. **War Room walkthrough** — primary screenshot
4. **Strategist AI in action** — shows the AI recommendation/analysis layer
5. **Executive Dashboard** — the outcome/reporting view decision-makers actually care about
6. **CTA** — next step (demo, trial, pilot proposal)

---

## Healthcare

- Audience: hospital systems, revenue cycle management teams
- Pain points to lead with: denial management, revenue cycle friction, claims backlog
- Slide 3: `media/healthcare/war-room.png`
- Slide 4: `media/healthcare/strategist.png`
- Slide 5: `media/healthcare/executive-dashboard.png`

## FinOps

- Audience: finance operations, controllers, FP&A teams
- Pain points to lead with: closing cycle delays, exception handling, audit trail gaps
- Slide 3: `media/finops/war-room.png`
- Slide 4: `media/finops/strategist.png`
- Slide 5: `media/finops/executive-dashboard.png`

## Insurance

- Audience: claims operations, underwriting leadership
- Pain points to lead with: claims triage speed, fraud/exception flagging, compliance reporting burden
- Slide 3: `media/insurance/war-room.png`
- Slide 4: `media/insurance/strategist.png`
- Slide 5: `media/insurance/executive-dashboard.png`

## Construction

- Audience: project controls, PMO, general contractors
- Pain points to lead with: RFIs, change order tracking, project risk visibility
- Slide 3: `media/construction/project-controls.png`
- Slide 4: `media/construction/strategist.png`
- Slide 5: `media/construction/executive-dashboard.png`

## Legal

- Audience: legal ops, general counsel offices
- Pain points to lead with: matter management, document review bottlenecks, escalation tracking
- Slide 3: `media/legal/war-room.png`
- Slide 4: `media/legal/strategist.png`
- Slide 5: `media/legal/executive-dashboard.png`

## Real Estate

- Audience: portfolio managers, real estate operations
- Pain points to lead with: transaction pipeline visibility, escalation handling, portfolio-level reporting
- Slide 3: `media/real-estate/war-room.png`
- Slide 4: `media/real-estate/strategist.png`
- Slide 5: `media/real-estate/executive-dashboard.png`

## BPO

- Audience: outsourcing/service delivery operations leadership
- Pain points to lead with: SLA breach risk, client escalation handling, capacity/workflow visibility
- Slide 3: `media/bpo/war-room.png`
- Slide 4: **currently unavailable** — `bpo-strategist-v2.html` has a known renderer crash (see project notes). Either skip this slide for now, or use a placeholder/mockup until it's fixed and the screenshot can be regenerated.
- Slide 5: `media/bpo/executive-dashboard.png`

---

## Staffing / other verticals mentioned in your original notes

Your platform notes reference a staffing readiness command center and other modules (mortgage underwriting, etc.) that aren't part of the current 7-vertical media kit run. If these are sales-relevant, they'd need their own entries added to `generate-media-kit.js`'s chain list and a rerun before a deck can be built for them — happy to add that once you confirm which additional verticals are active enough to screenshot.

## Before finalizing
- Same review pass as the other docs: check for placeholder data, debug overlays, consistent framing across screenshots.
- Since these are audience-specific, consider having 1-2 lines of specific ROI/outcome language per industry ready before your first real sales conversation — the deck structure is ready, the persuasive copy is the part only you (or someone close to each vertical's buyer) can write well.
