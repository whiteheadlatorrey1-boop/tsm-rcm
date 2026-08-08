# RCM OS — Cross-Module Exceptions
### Demo Talk Track

Companion script for `rcm-os-cross-module-exceptions-demo.pptx`. Each section maps to a slide. Bracketed lines are stage directions — what to click, not what to say.

---

## Slide 1 — Title

**Say:** "RCM OS just got a new signal it didn't have last week — one place that shows every open exception across Compliance, Vendor, and Logistics, ranked, without anyone having to go looking for it."

[No action — title slide.]

---

## Slide 2 — The Problem

**Say:** "Today, if you want to know what's on fire across the finance org, you've got three separate rooms to check. Compliance Desk has its Priority Alerts. Vendor Situation Room has its own incidents. Logistics has its own. Each one's honest about what it's tracking — but nothing rolls them up. The CFO looking at RCM OS's Executive tab sees none of it."

**Pause here.** This is the "before" — let it land before showing the fix.

---

## Slide 3 — How It Connects

**Say:** "Here's the fix, and it's smaller than it looks. All three rooms already write into a shared memory layer in the browser called TSMMemory — Vendor and Logistics were already doing this, Compliance wasn't, so that's the one piece we added. RCM OS now reads from that same layer on its own Executive tab. No new relay domain, no new mission vertical — this rides entirely on infrastructure that was already built for other verticals."

**Emphasize:** "This isn't a new system bolted on. It's three rooms and one dashboard finally talking through a door that was already there."

---

## Slide 4 — Live Demo (switch to the actual app here)

**Say:** "Let me show you, not just tell you."

[**Step 1** — Open `compliance.html` in a fresh tab.]
**Say:** "Priority Alerts fire the moment this page loads — SOX endpoint failure, OIG exclusion screening, KYC/AML degradation, the HIPAA BAA gap. Those aren't just painted on screen anymore — they're registering as real anomaly records the instant this page opens."

[**Step 2** — Open Vendor Situation Room, then Logistics Situation Room, run one scenario in each.]
**Say:** "Same pattern in Vendor and Logistics — they were already wired to do this, we just made sure the exceptions land in the same bucket Compliance uses."

[**Step 3** — Navigate to `tsm-rcm-os.html`, click the Executive tab.]
**Say:** "Now watch — Executive tab, and there's a new block: Cross-Module Exceptions. Everything we just triggered, ranked CRITICAL down to LOW. No relay, no document upload, no manual entry. It's just reading what's already sitting in the browser."

[**Step 4** — Point at the CRITICAL item in the list.]
**Say:** "And this one — the SOX endpoint failure — already has a mission open in Mission Core. Nobody clicked a button for that. It happened because the severity crossed the line."

---

## Slide 5 — Mission Automation

**Say:** "This is the part I want to make sure lands: CRITICAL doesn't wait for someone to notice it. The moment an anomaly comes in at that severity, RCM OS opens a mission using the same Mission Core every other vertical already runs on — Healthcare, BPO, Legal, Honeywell. Nothing new to learn if you've seen any of those."

**Say (idempotency point):** "And it won't spam you. The mission id is tied to the anomaly itself, so if you refresh this tab ten times, you get one mission, updated — not ten missions."

---

## Slide 6 — What This Is, and Isn't

**Say:** "I want to be straight about where this actually stands, because a demo that oversells itself isn't useful to anyone in this room."

**Left side (IS):** "This is real. Real anomaly records with an id, a severity, a source, a timestamp. It's live-ranked, no manual refresh logic. CRITICAL genuinely opens a mission. And it cost us almost nothing in new infrastructure."

**Right side (ISN'T yet):** "What it isn't yet: this data lives in the browser's local storage right now, not a server database. That means it's per-machine — a fresh browser or a different laptop won't see these same exceptions until it's visited those three pages itself. There's also no resolution workflow yet; closing the underlying issue in Compliance doesn't clear the anomaly here automatically. And today this is scoped to FinOps — it doesn't cover every vertical."

**Tone note:** say this plainly, not apologetically. It's a known, deliberate scope — not a bug.

---

## Slide 7 — What's Next

**Say:** "Three places this goes from here. First, a resolution workflow, so an exception can be closed from right here in the Executive tab instead of only from its source room. Second, moving this off browser storage onto something server-synced, so it's not tied to one machine. And third — this exact pattern, three sources writing into TSMMemory and one dashboard rolling them up, extends to any other vertical the moment its situation rooms register anomalies the same way. Healthcare, Legal, Construction — same wiring, same payoff."

**Close:** "This is live right now on both `main` and the feature branch. Happy to open the actual app and click through it again if anyone wants to drive."

---

## Anticipated Questions

**"Is this actually running, or is this a mockup?"**
It's running. Every screen you'd see in a live click-through is the real `compliance.html`, the real `tsm-rcm-os.html` Executive tab — nothing here is staged data.

**"Why browser storage and not a database?"**
Because that's what the two existing source rooms (Vendor, Logistics) were already built on — TSMMemory predates this feature. We extended the existing pattern rather than introducing a second data layer. Moving it server-side is real work, and it's explicitly on the "not yet" list, not something we're pretending is already done.

**"What happens if Compliance flags something that later gets fixed?"**
Right now, nothing automatically — the anomaly stays open in memory until the underlying detection logic in that source room says otherwise. That's the resolution-workflow gap called out on the "isn't yet" slide.

**"Does this create duplicate missions if I keep refreshing?"**
No — mission id is derived from the anomaly id, so re-rendering updates the existing mission rather than creating a new one.
