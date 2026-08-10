# TSM Construction Command — Finance & PM Executive Q&A

Grounded in the real WIP engine (`wip.md`, `construction-wip.html`) and the contract-to-cash pipeline (`config/o2c/construction.json`). Every answer below maps to a feature that actually exists in the repo — nothing here is aspirational.

---

## Close & WIP Cadence

**Q1: How is this different from the WIP schedule my controller already builds in Excel every month?**
The math is identical — cost-to-cost percent complete (`costs_to_date / total_estimated_costs`), earned revenue, and over/underbilling are the same formulas your controller uses. The difference is cadence: TSM recalculates WIP continuously as job-cost entries land, not once a month when someone has time to rebuild the spreadsheet. You get the same schedule your auditor expects, available on any given day instead of only at close.

**Q2: What exactly triggers an "at risk" flag on a job?**
Four explicit thresholds, not a vibe: cost-overrun risk fires when costs-to-date exceed 90% of estimated cost while percent-complete is still under 85%. Overbilled/underbilled thresholds fire past 10% of contract value in either direction. Low-margin fires when projected profit drops under 5% of contract amount. Every flag traces back to the job's own numbers — you can always see why it fired.

**Q3: Can I still close on my normal schedule, or does this force a new cadence?**
Your close cadence doesn't change. What changes is that by the time you sit down to close, the WIP schedule, overbilling exposure, and margin-risk jobs are already computed — close becomes a review-and-sign step instead of a build-the-schedule step.

---

## Contract-to-Cash & Billing

**Q4: Our contracts go through bid award, execution, change orders, progress billing, retainage, and collections — does the system actually track all of that, or just billing?**
All six stages are modeled as a pipeline, each with its own SLA. Three of them — change order approval, retainage hold, and collections — are marked as blocking stages, meaning a contract stuck there is flagged as stalled cash, not just a line on a status report.

**Q5: What happens when a change order sits unapproved for weeks?**
Once a contract exceeds the change-order-approval SLA (72 hours in the default config, tunable per client), it surfaces as a blocker: "$[value] stalled [X]h past its 'Change Order Approval' SLA," with the underlying rationale — which contract, which owner/GC, how long it's actually been sitting. That's a real computed number, not a status color.

**Q6: How does retainage get handled — is it just a percentage held on paper, or does the system track exposure?**
Retainage hold is one of the three blocking stages in the pipeline. It's tracked as its own metric (`retainage_holds`), so aggregate retainage exposure across your job portfolio is a number you can see, not something you have to go pull from each individual contract file.

---

## Job Costing & Profitability

**Q7: How does the system know a job is overbilled vs. underbilled?**
Overbilled = billings-to-date minus earned revenue, when that's positive — meaning you've billed more than you've actually earned, which shows up as a liability. Underbilled is the same calculation in reverse — an asset, meaning earned revenue is ahead of what's been billed. Both are computed off the same cost-to-cost percent-complete number your WIP schedule already uses.

**Q8: Can I see cost-to-complete and projected profit per job, or only after close?**
Both are live, computed continuously: cost-to-complete is total estimated cost minus costs-to-date; projected profit is contract amount minus total estimated cost. You're not waiting on a close cycle to know a job's trajectory.

**Q9: What does the AI actually add here versus a spreadsheet formula?**
The formulas (percent complete, earned revenue, over/underbilling, projected profit) are deterministic — same math a controller already trusts. Where the AI layer adds value is narrative and rollup: `runWIPAI`, `runNarrative`, and `runStrategistRollup` turn a portfolio of jobs into a plain-language summary — which jobs are driving exposure, which are healthy — so a PM or exec doesn't have to read forty job files to get the picture.

---

## Site & Document Handling

**Q10: We work off blueprints and site plans constantly — does this connect to that at all, or is it purely financial?**
Construction Command includes blueprint upload and processing (`processBp`/`renderBpContent`) alongside a site-mapping view (`launchMap`/`flyToSite`). It's built so the financial exception view and the physical job-site view live in the same tool, rather than in separate systems you have to cross-reference by hand.

**Q11: Is this replacing our accounting system (Sage, Procore, Foundation, etc.)?**
No — same positioning as the property-accounting side of this. Your system of record stays your system of record. TSM sits on top as the exception/intelligence layer: it reads what's already there, computes WIP and blocker status continuously, and surfaces what needs a human decision. No rip-and-replace.

---

## Risk & Adoption

**Q12: What if a job's data is incomplete — does the system just guess at percent complete?**
No — the math requires costs-to-date and total-estimated-costs to produce a real percent-complete figure. Incomplete inputs show up as missing data, not a fabricated number. The flags (cost-overrun, overbilled, underbilled, low-margin) only fire off real computed values.

**Q13: How much training does a project accountant or PM need?**
The core numbers — percent complete, over/underbilling, cost-to-complete — are the same ones your team already calculates by hand or in Excel. The learning curve is on where those numbers now live and how to read the blocker/exception view, not on new accounting concepts.

**Q14: What's the pilot look like — do we have to commit our whole job portfolio?**
Same model as the property-accounting pilot: start with a controlled slice — a handful of active jobs across a couple of change-order and retainage cycles — and let the WIP engine and pipeline tracking run against real job-cost data before deciding on a wider rollout.

---

*Closing line: the WIP schedule and job-cost math don't change — what changes is that you stop waiting until close to find out which jobs are quietly bleeding margin or sitting on stalled change orders.*
