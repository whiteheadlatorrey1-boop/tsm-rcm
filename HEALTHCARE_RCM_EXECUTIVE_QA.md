# TSM Healthcare RCM — Finance & Revenue Cycle Executive Q&A

Grounded in the real RCM engine (`healthcare.md`) and the denial war room (`html/healthcare/hc-denial-war-room.html`). Every metric referenced below is one the engine actually computes — nothing here is invented.

---

## Core Metrics & Targets

**Q1: What metrics does the system actually track, and are the targets realistic?**
Five, all industry-standard, not house numbers: clean claim rate (target >95%), denial rate by payer and reason code, days in AR by payer (target <40 days), net collection rate (net collections / net charges), and prior-authorization bottlenecks. These are the same benchmarks a revenue cycle director already reports to the CFO — the engine just computes them continuously instead of at month-end.

**Q2: Why segment denial rate and days-in-AR by payer instead of one blended number?**
A blended number hides which payer is actually the problem. If Payer A is denying at 3% and Payer B at 22%, a blended 8% denial rate tells you nothing actionable. Segmenting by payer and reason code is what lets your team direct follow-up effort at the actual source of the exposure instead of chasing an average.

**Q3: How is "days in AR" calculated, and does it match what our biller already reports?**
Same definition your team already uses — days in accounts receivable by payer. The engine doesn't redefine the metric; it computes it continuously off the same claims and payment data your billing staff works from, so the number should reconcile with what you're already tracking, just available without waiting on a manual pull.

---

## Denials & Exceptions

**Q4: What does the denial war room actually surface — a list of denied claims, or something more?**
It's built around denials and payer-level exception handling, not a flat denial list. The point is to group denials in a way that shows patterns — which payer, which reason code, which prior-auth step — so your team can act on the pattern instead of working denials one claim at a time.

**Q5: Prior authorization is our biggest bottleneck — does the system actually address that, or just flag it?**
Prior-auth bottlenecks are one of the five metrics the engine is built to always evaluate. It's a diagnostic layer — it identifies where prior auth is holding up claims — not a prior-auth submission tool itself. Same "system of record stays your system of record" positioning as the rest of TSM: it doesn't replace your prior-auth workflow, it tells you where that workflow is bleeding time.

**Q6: How does the engine decide what's a real denial issue vs. normal noise?**
The output structure includes explicit `flags` and `recommended_actions` fields tied to the actual computed metrics (clean claim rate, denial rate, days in AR, net collection rate) — so an item only surfaces as a flag when it's tied to a real number crossing a real threshold, not a subjective read.

---

## Output & Integration

**Q7: Is the output something my staff can act on directly, or just a dashboard number?**
The engine's output format includes `top_denial_reasons`, `payer_performance`, and `recommended_actions` alongside the raw metrics — structured specifically so a revenue cycle team gets a worklist, not just a KPI tile.

**Q8: Does this require us to change our claims/billing system?**
No. Same positioning across every TSM vertical: your claims and billing system stays the system of record. TSM reads what's there and computes the RCM metrics and denial patterns on top of it — it's an intelligence layer, not a replacement system.

**Q9: What data does the engine need to actually produce these numbers?**
Claims, denials, payer mix, and collections data — the same inputs your revenue cycle team already has on hand today for month-end reporting. Nothing new to collect; the difference is how often it gets computed.

---

## Adoption & Pilot

**Q10: How do we pilot this without disrupting live billing operations?**
Feed it a controlled slice of claims and denial data — one payer group or one service line over a recent period — and let it compute clean claim rate, denial rate, days in AR, and net collection rate against data you can independently verify, before deciding whether to widen scope. It's read/analyze, not a live write into your billing system, so there's no operational risk during a pilot.

**Q11: Who's the right internal owner for evaluating this — billing manager, revenue cycle director, or CFO?**
Same buying-committee shape as the other TSM verticals: the revenue cycle manager or director is the primary champion (they live in denial rates and days-in-AR daily), while the CFO/VP Finance is the economic buyer who cares about net collection rate and AR exposure in dollar terms.

---

*Closing line: the five metrics don't change — clean claim rate, denial rate by payer, days in AR, net collection rate, prior-auth bottlenecks are the same ones you already report. What changes is finding out about a payer's denial spike this week instead of at next month's close.*
