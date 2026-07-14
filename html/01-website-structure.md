# TSM-Consultz — Website Structure

All image paths reference `./media/` from the generated media kit. Swap in final reviewed/polished screenshots before publishing — see the media kit review checklist at the bottom of this doc.

---

## Homepage

**Hero section**
- Headline: platform positioning statement (multi-vertical enterprise AI platform)
- Sub-headline: the War Room → Strategist → Executive Portal workflow, one sentence
- Hero visual: `media/healthcare/war-room.png` (or your strongest single vertical shot — Healthcare and Construction tend to read clearest to a first-time visitor)
- Primary CTA: "See it in action" → Solutions overview or Book a demo

**"How it works" strip** (3–4 panel scroll or grid)
1. Understand → `media/workflow/doc-search-entry.png`
2. Mission Created → *(needs a mission-queue-specific capture — not yet in kit; see gaps below)*
3. War Room Opens → `media/healthcare/war-room.png`
4. Strategist AI → `media/healthcare/strategist.png`
5. Executive Dashboard → `media/healthcare/executive-dashboard.png`

**Industries grid** (card per vertical, links to Solutions/[industry])
- Healthcare — `media/healthcare/war-room.png`
- FinOps — `media/finops/war-room.png`
- Insurance — `media/insurance/war-room.png`
- Construction — `media/construction/project-controls.png`
- Legal — `media/legal/war-room.png`
- Real Estate — `media/real-estate/war-room.png`
- BPO — `media/bpo/war-room.png`

**Platform capability strip** (for technical/enterprise buyers)
- Short mention of the SAP-phase layer (O2C, CRM, CPQ, MDM, Governance, etc.) with one representative screenshot, e.g. `media/enterprise/mdm/war-room.png`
- Links through to a dedicated "Platform" or "Architecture" page

---

## Solutions / [Industry] pages (one per vertical)

Template — repeat for each of the 7 verticals:

**Healthcare Solutions**
1. Hero image: `media/healthcare/war-room.png`
2. Problem framing copy (denial management, revenue cycle friction, etc.)
3. Mission Queue / War Room walkthrough — `media/healthcare/war-room.png`
4. Strategist AI screenshot — `media/healthcare/strategist.png`
5. Executive Dashboard screenshot — `media/healthcare/executive-dashboard.png`
6. CTA: "Talk to a Healthcare specialist" / demo request

Repeat structure for:
- FinOps (`media/finops/*`)
- Insurance (`media/insurance/*`)
- Construction (`media/construction/*` — note folder uses `project-controls.png` instead of `war-room.png`)
- Legal (`media/legal/*`)
- Real Estate (`media/real-estate/*`)
- BPO (`media/bpo/*` — **only war-room and executive-dashboard available**; strategist screenshot pending until the known renderer crash on `bpo-strategist-v2.html` is fixed)

---

## Platform / Architecture page

For technical evaluators and enterprise IT buyers — pulls from the `enterprise/` folder rather than industry verticals:
- O2C, CRM, CPQ, Catalog, Approval, MDM, Governance, Digital Twin, NOC, Integration Hub
- Each gets a small thumbnail + one-line capability description, e.g. `media/enterprise/mdm/war-room.png` → "Master Data Management: cross-mesh intelligence and relay-based governance"
- Good place to mention the relay architecture / BNCA concept without going too deep

---

## Resources / Documentation

Reuses screenshots from `media/workflow/` and per-vertical folders as user-guide illustrations:
- Logging in
- Creating a mission
- Reviewing AI recommendations (strategist screenshots)
- Completing a workflow
- Viewing executive metrics (executive-dashboard screenshots)

---

## Known gaps to fill before this structure is publish-ready

1. **Mission Queue standalone shot** — current kit captures war-room/strategist/executive triplets but nothing isolates just the mission queue panel. Worth a small addition to `generate-media-kit.js` if the war room UI has a distinct mission-queue view/state.
2. **BPO strategist** — missing until the renderer crash is fixed.
3. **Demo data pass** — confirm every captured screenshot shows realistic, polished data (not test/placeholder values) before anything goes live.
4. **NOC and Integration Hub** aren't industry-facing — they'll likely only appear on the Platform page, not the Industries grid. Confirm that's the intended positioning.
