#!/usr/bin/env python3
"""
Adds a new How-To section for the Cross-Module Exceptions feature added to
RCM OS's Executive tab (reads TSMMemory anomalies from Compliance, Vendor
Situation Room, and Logistics Situation Room; opens a mission on CRITICAL).

Three insertions:
  1. TOC entry, right after "Data Intake: Showcase → RCM OS"
  2. Cross-reference bullet added to the Executive tab step-desc in the
     existing Data Intake card
  3. A new #exceptions card, right after the #relay card, matching the
     existing card/step/callout markup style

Run from repo root:
    python3 apply_howto_exceptions_section.py
"""
import pathlib
import sys

TARGET = pathlib.Path("html/finops-suite/tsm-rcm-os-howto.html")

# ── Anchor 1: TOC ────────────────────────────────────────────────────────
OLD_1 = """      <a class="toc-link" href="#relay">Data Intake: Showcase → RCM OS</a>
      <a class="toc-link" href="#assistant">The AI Assistant</a>
"""
NEW_1 = """      <a class="toc-link" href="#relay">Data Intake: Showcase → RCM OS</a>
      <a class="toc-link" href="#exceptions">Cross-Module Exceptions</a>
      <a class="toc-link" href="#assistant">The AI Assistant</a>
"""

# ── Anchor 2: cross-reference in the Executive tab step ─────────────────
OLD_2 = """            <div class="step-title">Switch to the Executive tab to see it rolled up</div>
            <div class="step-desc">The Controller Action Plan and CFO Executive Intelligence blocks populate automatically once a document has been relayed. From there, <strong>↓ Export Executive Report</strong> compiles the cadence completion stats, open-exception count, Controller Action Plan, and CFO brief into one downloadable report — the closest thing RCM OS has today to a real one-click export.</div>
            <div class="step-tool">Executive Tab</div>"""

NEW_2 = """            <div class="step-title">Switch to the Executive tab to see it rolled up</div>
            <div class="step-desc">The Controller Action Plan and CFO Executive Intelligence blocks populate automatically once a document has been relayed. From there, <strong>↓ Export Executive Report</strong> compiles the cadence completion stats, open-exception count, Controller Action Plan, and CFO brief into one downloadable report — the closest thing RCM OS has today to a real one-click export. The Executive tab also has a separate, always-on <strong>Cross-Module Exceptions</strong> block that doesn't depend on a relay at all — see <a href="#exceptions">Cross-Module Exceptions</a>.</div>
            <div class="step-tool">Executive Tab</div>"""

# ── Anchor 3: the new card, inserted right after the #relay card closes ─
OLD_3 = """      <div class="callout">
        <strong>Nothing relayed yet?</strong> The Executive tab and Document Intake card stay in an honest empty state ("No document has been relayed from FinOps Doc Showcase yet") rather than showing fabricated placeholder data.
      </div>
    </div>

    <!-- AI ASSISTANT -->
    <div class="card" id="assistant">"""

NEW_3 = """      <div class="callout">
        <strong>Nothing relayed yet?</strong> The Executive tab and Document Intake card stay in an honest empty state ("No document has been relayed from FinOps Doc Showcase yet") rather than showing fabricated placeholder data.
      </div>
    </div>

    <!-- CROSS-MODULE EXCEPTIONS -->
    <div class="card" id="exceptions">
      <div class="card-eyebrow">Always-On, Not Relay-Dependent</div>
      <h2>Cross-Module Exceptions</h2>
      <p class="lede">Separate from the Doc Showcase relay above, the Executive tab also carries a live feed of open exceptions pulled directly from three other war rooms — no document hand-off required, and no manual entry.</p>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-body">
            <div class="step-title">Where the exceptions come from</div>
            <div class="step-desc">Three source modules register anomalies into the shared memory layer (TSMMemory) as they detect them:</div>
            <table class="module-table" style="margin-top:10px;">
              <thead><tr><th>Source</th><th>What it registers</th></tr></thead>
              <tbody>
                <tr><td class="mname-cell">Compliance Desk (compliance.html)</td><td class="mfile-cell" style="--mc:var(--risk);">The Priority Alerts panel (SOX, KYC/AML, OIG/CMS, HIPAA) plus any AI-detected risk from an AI Triage run</td></tr>
                <tr><td class="mname-cell">Vendor Situation Room</td><td class="mfile-cell" style="--mc:var(--gold);">Detected vendor/AP incidents</td></tr>
                <tr><td class="mname-cell">Logistics Situation Room</td><td class="mfile-cell" style="--mc:var(--good);">Detected logistics/fulfillment incidents</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-body">
            <div class="step-title">Open the Executive tab to see them ranked</div>
            <div class="step-desc">The <strong>Cross-Module Exceptions</strong> block lists every still-open exception, ranked CRITICAL → HIGH → MEDIUM → LOW. This runs every time the Executive tab renders — it doesn't need a document relayed first.</div>
            <div class="step-tool">Executive Tab</div>
          </div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-body">
            <div class="step-title">CRITICAL items open a mission automatically</div>
            <div class="step-desc">Anything ranked CRITICAL creates an entry in the shared Mission Core (same mission runtime the other verticals use), tagged to the FinOps vertical. Re-opening the Executive tab doesn't create duplicates — the mission id is tied to the exception, so it just updates the existing one.</div>
          </div>
        </div>
      </div>
      <div class="callout">
        <strong>Client-side, per-browser:</strong> the memory layer this reads from lives in the browser's local storage, not a server database. Anomalies only show up here if that same browser has actually visited the Compliance, Vendor, or Logistics page at least once. A different machine or a cleared browser cache won't see the same exceptions until it visits those pages too.
      </div>
    </div>

    <!-- AI ASSISTANT -->
    <div class="card" id="assistant">"""

def main():
    if not TARGET.exists():
        print(f"ERROR: {TARGET} not found. Run this from the repo root.")
        sys.exit(1)

    text = TARGET.read_text()

    assert text.count(OLD_1) == 1, "Anchor 1 (TOC) not found or not unique"
    assert text.count(OLD_2) == 1, "Anchor 2 (Executive tab step) not found or not unique"
    assert text.count(OLD_3) == 1, "Anchor 3 (card boundary) not found or not unique"

    text = text.replace(OLD_1, NEW_1)
    text = text.replace(OLD_2, NEW_2)
    text = text.replace(OLD_3, NEW_3)

    TARGET.write_text(text)
    print(f"Patched {TARGET} (3 insertions)")

if __name__ == "__main__":
    main()
