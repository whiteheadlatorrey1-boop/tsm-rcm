#!/usr/bin/env python3
"""
Generates one narrative data JSON per vertical for the TSM demo presentations.
Each entry maps directly onto a step in demo/<vertical>-demo.json (same shot id),
adding a sales talk track, a "wow" flag, and a short on-screen caption.

Run: python3 build_data.py
Output: demo/presentations/data/<vertical>.json

NOTE: This file is the SOURCE for data/*.json. If you hand-edit a data/*.json
file directly, this script will overwrite your edits next time it runs — either
edit here and rerun, or edit data/*.json directly and skip rerunning this file.
"""
import json, os

OUT_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUT_DIR, exist_ok=True)

VERTICALS = {}

def V(key, folder, title, tagline, pain, steps, cta):
    VERTICALS[key] = {
        "vertical": key,
        "folder": folder,
        "title": title,
        "tagline": tagline,
        "painPoint": pain,
        "steps": steps,
        "cta": cta,
    }

def S(shot, caption, talk, wow=False):
    return {"shot": shot, "caption": caption, "talk": talk, "wow": wow}

# ─────────────────────────────────────────────────────────────────────────
# BPO
# ─────────────────────────────────────────────────────────────────────────
V("bpo", "bpo",
  "BPO Service Delivery — Command Center",
  "From inbound ticket to executive brief, with zero manual re-entry.",
  "Supervisors triage cases by hand, and nothing rolls up to leadership until someone writes a status report.",
  [
    S("001-war-room-demo-load", "The BPO War Room",
      "This is the War Room — every inbound case lands here the instant it's created. No queue, no waiting for a human to open the ticket."),
    S("002-engine-auto-fired", "Engines auto-fire on intake",
      "Watch the engine count. The moment this case hit the queue, multiple specialist engines fired automatically, in parallel. Nobody clicked \u2018analyze.\u2019 This already happened before your operator even looked at it.",
      wow=True),
    S("003-route-to-strategist", "One-click routing",
      "One click routes the case to the strategist layer. The system already knows this needs escalation \u2014 it isn't guessing, it's reasoning from what the engines found."),
    S("004-strategist-load", "Strategist workspace",
      "This is where case complexity gets synthesized into something a decision-maker can actually act on."),
    S("005-generate-strategy-brief", "Auto-generated strategy brief",
      "This used to take a senior analyst twenty to thirty minutes of digging through history. Watch the reasoning box build a full strategy brief in seconds \u2014 and it shows the *why*, not just the *what*.",
      wow=True),
    S("006-escalate-to-exec", "Escalate to executive",
      "One click escalates straight to the executive portal. Same case, same context, zero re-entry, zero copy-paste."),
    S("007-exec-portal-kpis", "Live executive KPIs",
      "Leadership sees exposure and throughput live \u2014 nobody has to ask a supervisor for a status update."),
    S("008-exec-explainability", "Full explainability",
      "And this is what actually closes deals with skeptical buyers: every number on this dashboard traces back to the reasoning that produced it. Nothing here is a black box.",
      wow=True),
  ],
  "TSM turns a BPO's triage backlog into a same-second decision chain \u2014 with an audit trail leadership can defend."
)

# ─────────────────────────────────────────────────────────────────────────
# Construction (anomaly)
# ─────────────────────────────────────────────────────────────────────────
def con_steps(sample_label, sample_desc, wow_synth_label):
    return [
        S("001-war-room-load", "The Construction War Room",
          "GCs live in spreadsheets, change orders, and gut feel. This is the alternative."),
        S("002-load-demo-anomaly" if sample_label == "anomaly" else "002-load-cashflow-sample",
          f"Loading a live {sample_desc}",
          f"We're loading a real {sample_desc} \u2014 the kind that normally doesn't surface until three weeks into the monthly close, when it's already too late to act on."),
        S("003-fire-engines", "Every engine fires at once",
          "One click, and every specialist engine \u2014 cost, schedule, compliance, risk \u2014 analyzes this simultaneously. Watch the KPI counters populate in real time.",
          wow=True),
        S("004-engines-complete", "Engines report back",
          "All engines have reported. This is what would take a project controls team the better part of a day, done before you've finished your coffee."),
        S("004b-disable-auto-mode", "", "(Demo note: pausing auto-escalation here so we can walk the chain step by step.)"),
        S("005-escalate-to-strategist", "Escalate to strategist",
          "Escalating to the Strategist \u2014 same finding, now getting synthesized into an actual recommendation."),
        S("006-strategist-load", "Strategist workspace",
          "The strategist view pulls together everything every engine found, in one place."),
        S("006b-open-expansion-tab", "Portfolio-wide exposure",
          "This tab shows this isn't just about one job \u2014 it's how this exact pattern shows up across every active project in the portfolio."),
        S("007-run-bnca-synthesis", f"{wow_synth_label} \u2014 Best Next Course of Action",
          "This is the synthesis step. The system isn't just flagging a problem \u2014 it's recommending what to do about it, ranked by financial impact.",
          wow=True),
        S("008-explainability", "Reasoning chain, fully exposed",
          "And here's the reasoning behind that recommendation \u2014 every assumption laid out, nothing hidden."),
        S("009-escalate-to-exec", "Escalate to executive",
          "Escalating to the executive portal \u2014 the case moves up the chain with zero manual handoff, zero re-typing."),
        S("010-exec-portal-kpis", "The number the CFO actually wants",
          "This is total exposure across the whole portfolio, live \u2014 not a number you find out about at month-end close.",
          wow=True),
        S("011-exec-explainability", "Executive-level explainability",
          "And again, full explainability at the top of the chain. Nothing here is a black box the finance team has to take on faith."),
    ]

V("construction", "construction",
  "Construction \u2014 Risk & Anomaly Command",
  "Catch the cost and schedule anomaly three weeks before it hits the P&L.",
  "By the time a cost overrun shows up in the monthly close, it's already unrecoverable.",
  con_steps("anomaly", "cost/schedule anomaly", "BNCA Synthesis"),
  "TSM catches the anomaly the week it happens \u2014 not the month it becomes a write-off."
)

V("construction-finance", "construction-finance",
  "Construction \u2014 Cash Flow & Liquidity Command",
  "See a liquidity crunch coming before it becomes a missed payroll or a stalled draw.",
  "Cash flow problems on a job site are usually a surprise \u2014 discovered only once the crunch has already arrived.",
  con_steps("cashflow", "cash flow scenario", "Cash Flow Synthesis"),
  "TSM turns cash flow risk from a surprise into a forecast you can act on weeks ahead."
)

# ─────────────────────────────────────────────────────────────────────────
# Honeywell-style incident verticals (cyber, plant, supplier) share a shape
# ─────────────────────────────────────────────────────────────────────────
def incident_steps(domain_word, engines_desc, approve_context):
    return [
        S("001-war-room-load", "Incident command, live",
          f"This is {domain_word} incident response the way it should work: the moment a threat is confirmed, the clock is already running against you."),
        S("002-load-sample-incident", "Loading a real incident",
          "We're loading a realistic incident \u2014 the kind that normally triggers an all-hands war room call and a scramble for a status update."),
        S("003-run-6-engine-analysis", "Six engines, one click",
          f"Six specialist engines \u2014 {engines_desc} \u2014 analyze this simultaneously. What normally takes a team an hour of frantic message threads happens here in seconds.",
          wow=True),
        S("004-escalate-to-strategist", "Escalate with full context",
          "Escalating to the strategist \u2014 it doesn't start from zero, it inherits everything the engines already found."),
        S("005-escalate-to-executive", "Executive approval, one click",
          f"One click and this is now on the executive's desk with an approve action ready \u2014 {approve_context}.",
          wow=True),
        S("006-closing", "The close",
          "This is the pitch: response measured in seconds, not hours \u2014 and a fully documented decision trail for the board and regulators afterward.",
          wow=True),
    ]

V("cyber-incident", "cyber-incident",
  "Cyber Incident Command",
  "Contain, brief, and escalate a live incident before the news cycle beats you to it.",
  "Cyber incidents get worse the longer it takes to get an accurate picture in front of the people who can authorize a response.",
  incident_steps("cyber", "containment, forensics, compliance, comms, business impact, remediation", "no waiting on a 2am summary email"),
  "TSM compresses incident response from hours of Slack threads to a documented decision in minutes."
)

V("plant-incident", "plant-incident",
  "Plant / OT Incident Command",
  "Turn a safety or operational incident into a documented, escalated decision in minutes, not shifts.",
  "Plant incidents live in radio calls and paper logs until someone finally writes it up \u2014 hours after the fact.",
  incident_steps("plant safety", "safety, containment, root cause, compliance, production impact, remediation", "no waiting for the shift report to get written up"),
  "TSM gives plant leadership a defensible, timestamped decision trail while the incident is still unfolding."
)

V("supplier-shutdown", "supplier-shutdown",
  "Supplier Shutdown / Disruption Command",
  "See the downstream impact of a supplier shutdown before it becomes a missed customer commitment.",
  "A supplier shutdown is usually discovered when a shipment doesn't show up \u2014 not when there's still time to react.",
  incident_steps("supply-chain disruption", "supplier risk, inventory impact, alternate sourcing, contract exposure, customer impact, remediation", "so procurement isn't the last to know"),
  "TSM turns a supplier shutdown from a fire drill into a pre-briefed executive decision."
)

# ─────────────────────────────────────────────────────────────────────────
# FinOps
# ─────────────────────────────────────────────────────────────────────────
V("finops", "finops",
  "FinOps War Room \u2014 AP/AR Command",
  "Catch the coding error, duplicate payment, or fraud pattern before the check clears.",
  "AP/AR anomalies sit in a review queue for days, and by the time someone looks, the payment has already gone out.",
  [
    S("001-war-room-load", "The FinOps War Room",
      "This is where AP/AR documents land the instant they're received \u2014 not three days later in someone's inbox."),
    S("002-load-sample-doc", "Loading a live AP document",
      "We're loading a real invoice \u2014 the kind that would normally sit waiting for a human to eyeball it."),
    S("003-fire-engines", "Engines scan simultaneously",
      "One click, and every engine \u2014 coding accuracy, duplicate-payment risk, fraud pattern, GL misclassification \u2014 scans this document at once.",
      wow=True),
    S("004-engines-complete", "Escalation bar lights up",
      "The system already knows this needs a human decision \u2014 and it's already done the prep work for that decision."),
    S("005-escalate-to-strategist", "Escalate to strategist", "One click sends this to the strategist, with full context attached."),
    S("006-strategist-load", "Strategist workspace", "This is where the finding turns into an actual recommendation."),
    S("007-run-strategist", "Strategist synthesis",
      "Watch the strategist build a recommendation with the reasoning attached \u2014 not just a flag, a decision you can act on.",
      wow=True),
    S("008-relay-banner", "Live relay, no copy-paste",
      "The case is now live on the relay control plane \u2014 no email chain, no re-keying data between systems."),
    S("009-push-to-exec", "Push to executive", "One click pushes this straight to the executive portal."),
    S("010-exec-portal-kpis", "Dollar exposure, live",
      "This is total dollar exposure across the portfolio, updated live \u2014 the number a controller actually needs.",
      wow=True),
    S("011-exec-relay-content", "Full context inherited",
      "And the executive isn't starting from a blank page \u2014 every engine finding and every reasoning step is right here."),
  ],
  "TSM catches the coding error or fraud pattern before the payment clears \u2014 not in next month's audit."
)

# ─────────────────────────────────────────────────────────────────────────
# Healthcare RCM
# ─────────────────────────────────────────────────────────────────────────
V("healthcare", "healthcare",
  "Healthcare RCM \u2014 Denial Management",
  "Turn a claim denial into a filed appeal in minutes, not a week of chart-chasing.",
  "Denial write-offs pile up because appeals take a coder half a day of digging through the chart to assemble.",
  [
    S("001-strategist-load", "The RCM Strategist",
      "This is the strategist view for denial management \u2014 where a denied claim gets triaged for appeal-worthiness."),
    S("002-denial-tab", "Denial detail",
      "This is the denial itself \u2014 the payer's reason code, the dollar amount, and the timeline pressure."),
    S("003-back-to-exec", "Back to the strategist run", "Returning to the run panel to fire the analysis."),
    S("004-run-strategist", "Run the strategist",
      "One click runs the full denial analysis \u2014 payer pattern recognition, appeal-success likelihood, and root-cause classification.",
      wow=True),
    S("005-explainability", "Reasoning, fully shown",
      "Here's the reasoning chain behind that recommendation \u2014 exactly what a compliance officer needs to sign off on an appeal."),
    S("006-escalate-to-exec", "Escalate to executive portal", "One click escalates the case with full denial context attached."),
    S("007-exec-portal-kpis", "Executive KPIs, live",
      "Denial exposure and recovery rate, live \u2014 not a spreadsheet someone updates once a week."),
    S("008-escalation-modal", "Escalation detail opens", "Drilling into this specific case from the executive view."),
    S("009-denial-pack-tab", "The denial pack", "This is the tab that generates the actual appeal packet."),
    S("010-denial-pack-output", "Auto-generated appeal packet",
      "One click and the appeal packet writes itself \u2014 citations, chart references, and payer-specific argument, ready to submit. This is the step that used to eat half a coder's day.",
      wow=True),
    S("011-closing-kpis", "Back to the numbers",
      "And the recovery-rate KPI updates the moment that appeal goes out \u2014 leadership sees the impact in real time."),
  ],
  "TSM turns a half-day appeal-writing task into a two-minute, defensible appeal packet."
)

# ─────────────────────────────────────────────────────────────────────────
# HotelOps / Concierge
# ─────────────────────────────────────────────────────────────────────────
V("hotelops", "hotelops",
  "Concierge Command \u2014 Hotel Operations",
  "Every guest-impacting issue triaged, escalated, and resolved before it becomes a review.",
  "Guest issues get logged in a notebook at the front desk and forgotten the moment the shift changes.",
  [
    S("001-war-room-load", "The Concierge War Room",
      "This is hotel operations command \u2014 every guest-impacting issue lands here the moment it's reported."),
    S("002-load-sample-data", "Loading live operational data",
      "We're loading a real snapshot of active issues across the property \u2014 maintenance, guest complaints, staffing gaps."),
    S("003-mission-queue", "The mission queue",
      "This is the prioritized queue \u2014 ranked by guest impact, not by who complained loudest."),
    S("004-run-analysis", "AI analysis, one click",
      "One click and the AI analyzes the queue for root causes and recommended actions \u2014 the kind of triage a GM would normally do by walking the property.",
      wow=True),
    S("005-relay-to-strategist", "Relay to strategist", "One click relays this to the strategist \u2014 no re-typing the situation."),
    S("006-strategist-view", "Strategist view", "The strategist synthesizes the operational picture into a management brief."),
    S("007-exec-portal-view", "Executive portal",
      "And it's already on the ownership group's dashboard \u2014 before a single guest review gets posted.",
      wow=True),
    S("008-closing", "The close", "This is how you protect a review score \u2014 by catching the issue before the guest has to complain twice."),
  ],
  "TSM catches the guest-impacting issue before it becomes a one-star review."
)

# ─────────────────────────────────────────────────────────────────────────
# Insurance
# ─────────────────────────────────────────────────────────────────────────
V("insurance", "insurance",
  "Insurance War Room \u2014 Claims & SIU",
  "Flag the fraud pattern or reserve exposure the moment the claim is filed, not at settlement.",
  "Claims fraud and reserve exposure usually surface only in a post-mortem, long after the check has been cut.",
  [
    S("001-war-room-load", "The Insurance War Room",
      "This is where claims land the instant they're filed \u2014 not after they've sat in an adjuster's queue for days."),
    S("002-load-sample-claims", "Loading live claims data",
      "We're loading real claim documents \u2014 the kind that would normally wait for manual review."),
    S("003-fire-engines", "Every engine fires at once",
      "One click, and every specialist engine \u2014 fraud pattern, reserve adequacy, coverage verification, litigation risk \u2014 analyzes this claim simultaneously.",
      wow=True),
    S("004-engines-complete", "Escalation triggered automatically",
      "The system already knows this claim needs a human decision, and has the analysis ready."),
    S("005-escalate-to-strategist", "Escalate to strategist", "One click sends this to the claims strategist with full findings attached."),
    S("006-strategist-load", "Strategist workspace", "Ready to run the full strategist chain on this claim."),
    S("007-run-strategist-chain", "Full reasoning chain",
      "Watch the strategist build out the reasoning \u2014 this is what an SIU investigator would spend hours reconstructing by hand.",
      wow=True),
    S("007b-strategist-complete", "Ready to escalate", "Analysis complete \u2014 ready for executive escalation."),
    S("008-escalate-to-exec", "Escalate to executive", "One click, zero re-entry, straight to the executive portal."),
    S("009-exec-portal-kpis", "Reserve exposure, live",
      "Total reserve exposure across the book, live \u2014 the number a CFO actually needs to see.",
      wow=True),
    S("010-exec-explainability", "Full explainability",
      "And every number here traces back to the reasoning that produced it \u2014 defensible in front of regulators and reinsurers alike."),
  ],
  "TSM flags the fraud pattern at intake \u2014 not in a post-settlement audit."
)

# ─────────────────────────────────────────────────────────────────────────
# Legal
# ─────────────────────────────────────────────────────────────────────────
V("legal", "legal",
  "Legal War Room \u2014 Matter Intake & Escalation",
  "Turn a new complaint into a fully-briefed case strategy before opposing counsel even responds.",
  "New matters sit on an associate's desk for days before anyone above them even knows the exposure.",
  [
    S("001-war-room-load", "The Legal War Room",
      "This is where a new matter lands the moment it's filed \u2014 not after it's been sitting in an associate's inbox."),
    S("002-load-sample-matter", "Loading a live complaint",
      "We're loading a real complaint \u2014 the kind that would normally wait for someone to read it end to end before anything happens."),
    S("003-fire-all-engines", "Every engine fires at once",
      "One click, and every specialist engine \u2014 exposure analysis, precedent research, statute-of-limitations check, jurisdiction risk \u2014 fires simultaneously.",
      wow=True),
    S("004-engine-outputs", "Every finding, side by side",
      "All five engine outputs, laid out together \u2014 this is what a first-year associate would spend a full day assembling."),
    S("004b-disable-auto-mode", "", "(Demo note: pausing auto-escalation so we can walk the chain manually.)"),
    S("005-escalate-to-case-strategist", "Escalate to case strategist",
      "One click escalates to the case strategist \u2014 full findings attached, nothing re-typed."),
    S("006-case-strategist-load", "Case strategist workspace",
      "The strategist synthesizes every engine finding into an actual litigation strategy."),
    S("007-escalate-to-chief-strategist", "Escalate to chief strategist",
      "One click, straight to the partner-level view \u2014 with full reasoning intact.",
      wow=True),
    S("008-exec-portal-kpis", "Portfolio exposure, live",
      "Total litigation exposure across every open matter, live \u2014 not a number the managing partner has to ask for.",
      wow=True),
  ],
  "TSM gets a fully-reasoned litigation strategy in front of a partner the same day the complaint is filed."
)

# ─────────────────────────────────────────────────────────────────────────
# Mortgage
# ─────────────────────────────────────────────────────────────────────────
V("mortgage", "mortgage",
  "Mortgage War Room \u2014 Loan Exception Command",
  "Catch the underwriting exception before it becomes a stalled closing.",
  "Loan exceptions get discovered late \u2014 usually right before a closing date that now has to move.",
  [
    S("001-war-room-load", "The Mortgage War Room",
      "This is where loan exceptions land the moment they're flagged \u2014 not three days before closing."),
    S("002-load-sample-data", "Loading a live loan file",
      "We're loading a real loan file with an active exception \u2014 the kind that usually surfaces in a frantic closing-day phone call."),
    S("003-run-ai-analysis", "AI analysis, one click",
      "One click and the AI analyzes the exception \u2014 compliance risk, investor guideline conflict, and a recommended resolution path.",
      wow=True),
    S("004-relay-to-strategist", "Relay to strategist", "One click relays this to the strategist \u2014 no re-keying loan data."),
    S("005-strategist-load", "Strategist workspace", "The strategist view synthesizes the exception into a resolution recommendation."),
    S("006-strategist-ai-summary", "AI summary",
      "This is the summary a processing manager would normally have to build by hand from three different systems.",
      wow=True),
    S("007-executive-view", "Executive escalation", "One click, straight to the executive portal \u2014 zero re-entry."),
    S("008-exec-portal-kpis", "Pipeline risk, live",
      "Total pipeline-at-risk, live \u2014 the number that actually determines whether this month's closings hit target."),
  ],
  "TSM catches the exception the day it's created \u2014 not the day before the closing that has to move."
)

# ─────────────────────────────────────────────────────────────────────────
# NOC / L1 Copilot
# ─────────────────────────────────────────────────────────────────────────
V("noc", "noc",
  "NOC Command Center \u2014 L1 Copilot",
  "Turn a noisy alert queue into a triaged, prioritized response \u2014 without adding headcount.",
  "L1 analysts drown in alert noise, and the real incident gets found by luck, not process.",
  [
    S("001-war-room-load", "The NOC War Room",
      "This is L1 triage the way it should work \u2014 every alert lands here, ranked, not just logged."),
    S("002-load-sample-data", "Loading a live alert set",
      "We're loading a real alert batch \u2014 the kind of noisy queue that normally buries the one alert that actually matters."),
    S("003-run-ai-analysis", "AI triage, one click",
      "One click and the AI analyzes the full batch \u2014 correlating alerts, ranking severity, and surfacing the signal in the noise.",
      wow=True),
    S("004-relay-to-strategist", "Relay to strategist", "One click relays the triaged findings to the strategist \u2014 no manual hand-off."),
    S("005-escalate-to-executive", "Escalate to executive",
      "One click and this is already on the executive dashboard, with the financial-impact card populated.",
      wow=True),
    S("006-executive-kpis", "Executive KPIs, live",
      "This is what an NOC director actually wants: signal, not noise, with dollar impact attached."),
  ],
  "TSM turns L1 alert fatigue into ranked, actionable signal \u2014 without adding a single headcount."
)

# ─────────────────────────────────────────────────────────────────────────
# Property Revenue / Accounting
# ─────────────────────────────────────────────────────────────────────────
V("property-revenue", "property-revenue",
  "Property Accounting \u2014 Revenue Cycle Close",
  "Run the month-end close analysis in minutes, with the exception queue already built.",
  "Month-end close for a property portfolio usually means days of manual reconciliation before anyone finds the exceptions.",
  [
    S("001-page-load", "Revenue cycle close, live",
      "This is the property accounting revenue cycle dashboard \u2014 built for the close, not a generic ledger view."),
    S("002-run-close-analysis", "Run the close, one click",
      "One click runs the full close analysis across the portfolio \u2014 what normally takes a team days of manual reconciliation.",
      wow=True),
    S("003-exception-queue", "Exceptions, already found",
      "And the exception queue is already built \u2014 every variance that needs a human decision, ranked and ready.",
      wow=True),
    S("004-escalate-to-strategist", "Escalate to strategist",
      "One click sends the flagged exceptions to the strategist \u2014 nothing re-typed, nothing re-explained."),
    S("005-closing", "The close",
      "This is how a close goes from a week of scrambling to a same-day sign-off."),
  ],
  "TSM turns a week-long portfolio close into a same-day, exception-first review."
)

# ─────────────────────────────────────────────────────────────────────────
# RCM-OS (cadence engine)
# ─────────────────────────────────────────────────────────────────────────
V("rcm-os", "rcm-os",
  "RCM-OS \u2014 The Operating Cadence Engine",
  "One dashboard for the daily, weekly, month-end, and executive rhythm of revenue cycle management.",
  "Every RCM team runs a different cadence in a different spreadsheet \u2014 nothing rolls up, and nothing is consistent.",
  [
    S("001-daily-load", "The daily cadence",
      "This is the daily view \u2014 what every RCM analyst should see the moment they log in, not a blank inbox."),
    S("002-weekly-cadence", "Weekly cadence",
      "Switching to weekly \u2014 same platform, same data, just a different operating rhythm. No second system to log into."),
    S("003-monthend-cadence", "Month-end checklist",
      "This is the month-end cadence \u2014 a live checklist, not a static spreadsheet someone has to remember to update.",
      wow=True),
    S("004-framework-cadence", "Framework view",
      "This is the framework view \u2014 how the whole operating model fits together, for the people who need the big picture."),
    S("005-executive-cadence", "Executive cadence",
      "And this is the same data, reframed for an executive audience \u2014 no separate report to build."),
    S("006-flow-chain", "The flow chain",
      "This is the flow chain \u2014 you can see exactly how a data point moves from daily intake all the way to the executive view."),
    S("007-sla-indicators", "SLA indicators, live",
      "SLA status, live, color-coded \u2014 nobody has to ask \u2018are we on track\u2019 in a status meeting again.",
      wow=True),
    S("008-closing-executive", "Back to executive",
      "One platform, four cadences, zero spreadsheets \u2014 that's the pitch."),
  ],
  "TSM replaces four different team spreadsheets with one operating cadence everyone actually uses."
)

# ─────────────────────────────────────────────────────────────────────────
# Real Estate
# ─────────────────────────────────────────────────────────────────────────
V("realestate", "realestate",
  "Real Estate War Room \u2014 Compliance & Pipeline",
  "Run a full compliance sweep across the portfolio in one click, then escalate straight to the pipeline brief.",
  "Compliance sweeps across a real estate portfolio are usually a quarterly fire drill, not a standing capability.",
  [
    S("001-war-room-load", "The Real Estate War Room",
      "This is portfolio command \u2014 compliance, pipeline, and exposure, all in one place."),
    S("002-quick-fire-compliance", "One-click compliance sweep",
      "One click runs a full compliance sweep across the portfolio \u2014 no quarterly fire drill, just an on-demand capability.",
      wow=True),
    S("003-feed-output", "Findings, live in the feed",
      "Findings stream into the feed live \u2014 you can watch the sweep work in real time."),
    S("003b-disable-auto-mode", "", "(Demo note: pausing auto-escalation so we can walk the chain manually.)"),
    S("004-escalate-to-strategist", "Escalate to strategist", "One click escalates the findings to the strategist \u2014 nothing re-typed."),
    S("005-strategist-load", "Strategist workspace", "Ready to run the full portfolio brief."),
    S("006-run-full-brief", "Run the full brief",
      "One click and the strategist builds a full portfolio brief \u2014 what an analyst would spend a day assembling from six systems.",
      wow=True),
    S("007-brief-metrics", "Pipeline metrics, synthesized",
      "Pipeline health, synthesized right alongside the compliance findings \u2014 one picture, not two disconnected reports."),
    S("008-escalate-to-exec", "Escalate to executive", "One click, straight to the executive portal."),
    S("009-exec-portal-kpis", "Pipeline exposure, live",
      "Portfolio-wide pipeline and compliance exposure, live \u2014 the number leadership actually asks for in every quarterly review.",
      wow=True),
    S("010-exec-explainability", "Full explainability",
      "And every finding traces back to its reasoning \u2014 defensible in front of investors and auditors alike."),
  ],
  "TSM turns a quarterly compliance fire drill into an on-demand, one-click capability."
)

# ─────────────────────────────────────────────────────────────────────────
# Schools
# ─────────────────────────────────────────────────────────────────────────
V("schools", "schools",
  "Schools Command \u2014 Grant Compliance & Funding",
  "Catch the SLA breach or compliance exception before it puts federal funding at risk.",
  "Grant compliance exceptions surface during an audit \u2014 long after the funding decision that depended on them.",
  [
    S("001-command-load", "The Schools Command Center",
      "This is the district's command center \u2014 financial, academic, HR, and grants, all in one place, not six logins."),
    S("002-open-ai-tab", "AI Analysis, on demand",
      "This is the AI Analysis engine \u2014 a district administrator can paste any document and get a compliance read in seconds."),
    S("003-load-prompt-from-library", "28 pre-built compliance prompts",
      "The prompt library has 28 pre-built compliance questions, covering everything from 2 CFR 200 cost audits to FERPA \u2014 nobody has to know the right question to ask."),
    S("004-run-ai-analysis", "AI analysis, one click",
      "One click and the AI runs the full compliance analysis \u2014 what would normally take a business office days of cross-referencing federal guidance.",
      wow=True),
    S("005-relayed-to-strategist", "Relayed to strategist",
      "One click relays this straight to the strategist \u2014 no re-typing the finding."),
    S("006-strategist-load", "Strategist workspace", "The strategist view synthesizes the finding into district-wide context."),
    S("007-strategist-ai-summary", "AI summary, synthesized",
      "This is the summary a superintendent's office would normally wait a week for.",
      wow=True),
    S("008-executive-view", "Executive escalation", "One click, straight to the executive portal."),
    S("009-exec-portal-kpis", "Funding exposure, live",
      "Grant and funding exposure across the district, live \u2014 the number that actually matters before a federal audit.",
      wow=True),
  ],
  "TSM catches the compliance exception before the auditor does \u2014 not during the audit."
)

# ─────────────────────────────────────────────────────────────────────────
# write everything out
# ─────────────────────────────────────────────────────────────────────────
for key, data in VERTICALS.items():
    path = os.path.join(OUT_DIR, f"{key}.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"wrote {path}  ({len(data['steps'])} steps)")

print(f"\n{len(VERTICALS)} verticals written to {OUT_DIR}")
