#!/usr/bin/env python3
"""
Assert-guarded wiring patch for construction-hub.html.
Adds a real nav entry (app-card grid, ss-app sticky nav, flow-node-link)
pointing at the new property-accounting-revenue-cycle.html page.

Run from repo root:  python3 apply-property-accounting-hub-wiring.py
"""
import pathlib

path = pathlib.Path("html/construction-suite/construction-hub.html")
s = path.read_text()

anchor1 = '<a class="flow-node-link" href="/construction-suite/document-showcase.html">OPEN DOCS ↗</a>'
insert1 = '\n          <a class="flow-node-link" href="/construction-suite/property-accounting-revenue-cycle.html">OPEN PROPERTY ACCT ↗</a>'
assert s.count(anchor1) == 1, f"anchor1 not found exactly once (found {s.count(anchor1)})"
assert insert1.strip() not in s, "insert1 already present — wiring already applied?"
s = s.replace(anchor1, anchor1 + insert1, 1)

anchor2 = '''      </a>

      <!-- Construction Hub (this page) -->
      <div class="app-card" style="--cc:var(--muted);cursor:default;">
        <div class="app-num">09 · SUITE HUB</div>'''
insert2 = '''      </a>

      <!-- Property Accounting & Revenue Cycle -->
      <a class="app-card" href="/construction-suite/property-accounting-revenue-cycle.html" style="--cc:var(--amber)">
        <div class="app-num">10 · PROPERTY ACCOUNTING</div>
        <div class="app-name">Property Accounting &amp; Revenue Cycle</div>
        <div class="app-role">MONTH-END CLOSE · AP/AR · AIA PAY APPS</div>
        <div class="app-desc">Month-end property close, AP/AR exception queue, and an AIA pay-application revenue cycle (draft → certify → bill → collect), relayed into the same strategist/exec-portal chain as the rest of the suite.</div>
        <div class="app-features">
          <div class="app-feat">Budget vs. actual variance with GL/escrow exception queue</div>
          <div class="app-feat">Revenue cycle: draft pay app → certification → AR → collections/retainage</div>
          <div class="app-feat">Merge-writes into TSM_CONSTRUCTION_STRATEGIST_RELAY — exec portal already reads it</div>
          <div class="app-feat">Feeds the Construction TSMExceptions queue for the first time (sector: construction)</div>
        </div>
        <div class="app-footer">
          <span class="app-open">OPEN APP ↗</span>
          <span class="app-status">LIVE</span>
        </div>
      </a>

      <!-- Construction Hub (this page) -->
      <div class="app-card" style="--cc:var(--muted);cursor:default;">
        <div class="app-num">09 · SUITE HUB</div>'''
assert s.count(anchor2) == 1, f"anchor2 not found exactly once (found {s.count(anchor2)})"
s = s.replace(anchor2, insert2, 1)

anchor3 = '<a href="/construction-suite/document-showcase.html" class="ss-app"><span class="ss-dot" style="background:var(--cyan2)"></span>DOCS</a>'
insert3 = '\n    <a href="/construction-suite/property-accounting-revenue-cycle.html" class="ss-app"><span class="ss-dot" style="background:var(--amber)"></span>PROPERTY ACCT</a>'
assert s.count(anchor3) == 1, f"anchor3 not found exactly once (found {s.count(anchor3)})"
s = s.replace(anchor3, anchor3 + insert3, 1)

path.write_text(s)
print("OK — construction-hub.html wired to property-accounting-revenue-cycle.html")
