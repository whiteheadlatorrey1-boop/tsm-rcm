#!/usr/bin/env python3
"""
Apply script: Airbnb / STR Operations tab for HotelOps.
Adds engine data model + risk method + relay payload wiring,
sidebar nav entry, tab panel registration, and new tab file.
Safe to re-run: each edit asserts its anchor exists exactly once
before modifying, and aborts with no changes if not found.
"""
import re, sys

ROOT = "html/war-rooms/hotel-war"

def edit(path, old, new, expect=1):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(old)
    if count != expect:
        print(f"ABORT: expected {expect} occurrence(s) of anchor in {path}, found {count}.")
        print(f"Anchor was:\n{old[:200]}")
        sys.exit(1)
    content = content.replace(old, new, expect)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: patched {path}")

# 1. Engine: buildRelayPayload -- add airbnb_risks summary field
edit(
    f"{ROOT}/services/hotelops-engine.js",
    "        open_incidents: this.getOpenIncidents(),\n",
    "        open_incidents: this.getOpenIncidents(),\n"
    "        airbnb_risks: this.getAirbnbRisks(),\n",
)

# 2. Engine: buildRelayPayload records -- add airbnb_listings raw records
edit(
    f"{ROOT}/services/hotelops-engine.js",
    "          incidents: this.data.incidents\n        },",
    "          incidents: this.data.incidents,\n"
    "          airbnb_listings: this.data.airbnb_listings\n        },",
)

# 3. Engine: add getAirbnbRisks() method before getPortfolio()
edit(
    f"{ROOT}/services/hotelops-engine.js",
    "    /* ---------- Portfolio (Executive Portal, multi-property) ----------",
    """    getAirbnbRisks() {
      const listings = this.data.airbnb_listings || [];
      const items = [];
      listings.forEach(l => {
        if (l.turnover_status === 'overdue') {
          items.push({ listing_id: l.listing_id, unit_name: l.unit_name, issue: 'Turnover overdue before next check-in', severity: 'high' });
        }
        if (!l.calendar_synced) {
          items.push({ listing_id: l.listing_id, unit_name: l.unit_name, issue: `${l.platform} calendar not synced \\u2014 double-booking risk`, severity: 'high' });
        }
        if (!l.lockbox_code_rotated) {
          items.push({ listing_id: l.listing_id, unit_name: l.unit_name, issue: 'Lockbox/access code not rotated since last guest', severity: 'medium' });
        }
        if (l.host_response_mins > 60) {
          items.push({ listing_id: l.listing_id, unit_name: l.unit_name, issue: `Host response time ${l.host_response_mins}min (SLA: 60min)`, severity: 'medium' });
        }
      });
      return { items, total_listings: listings.length, at_risk: items.length };
    }

    /* ---------- Portfolio (Executive Portal, multi-property) ----------""",
)

# 4. War room: sidebar nav entry
edit(
    f"{ROOT}/hotelops-war-room.html",
    '    <div class="module">Document Intake</div>\n',
    '    <div class="module">Document Intake</div>\n'
    '    <div class="sb-lbl">SHORT-TERM RENTAL</div>\n'
    '    <div class="module">Airbnb / STR Operations</div>\n',
)

# 5. War room: load the new tab script
edit(
    f"{ROOT}/hotelops-war-room.html",
    '  <script src="hotelops-tabs.js"></script>\n',
    '  <script src="hotelops-airbnb-tab.js"></script>\n'
    '  <script src="hotelops-tabs.js"></script>\n',
)

# 6. hotelops-tabs.js: panel shell registration
edit(
    f"{ROOT}/hotelops-tabs.js",
    "      } else if (slug === 'ota-intelligence') {",
    """      } else if (slug === 'airbnb-str-operations') {
        panel.innerHTML =
          '<div class="panel"><div class="panel-hdr">AIRBNB / STR OPERATIONS</div>' +
          '<div class="panel-body" id="panel-airbnb-str-operations-body" style="padding:0;">Loading&hellip;</div></div>';
      } else if (slug === 'ota-intelligence') {""",
)

# 7. hotelops-tabs.js: click-handler render trigger
edit(
    f"{ROOT}/hotelops-tabs.js",
    "        if (slug === 'ota-intelligence' && typeof renderOtaTab === 'function') {",
    """        if (slug === 'airbnb-str-operations' && typeof renderAirbnbTab === 'function') {
          renderAirbnbTab();
        }
        if (slug === 'ota-intelligence' && typeof renderOtaTab === 'function') {""",
)

# 8. New tab file: hotelops-airbnb-tab.js
airbnb_tab_js = """function renderAirbnbTab() {
  const panel = document.getElementById('panel-airbnb-str-operations-body');
  if (!panel || !engine) return;
  const risk = engine.getAirbnbRisks();
  const summaryHtml = `
    <div style="padding:12px;font-family:var(--mono);font-size:.6rem;line-height:1.8;">
      Listings tracked: <span style="color:var(--white)">${risk.total_listings}</span><br>
      Listings at risk: <span style="color:${risk.at_risk ? 'var(--red)' : 'var(--white)'}">${risk.at_risk}</span>
    </div>
  `;
  const itemsHtml = risk.items.length ? risk.items.map(it => `
    <div class="mission-item">
      <span class="mtag ${it.severity}">${it.severity.toUpperCase()}</span>
      <span class="mtitle">${it.unit_name} (${it.listing_id})</span>
      <span class="mmeta">${it.issue}</span>
    </div>
  `).join('') : '<div class="mission-item"><span class="mmeta">No STR issues detected.</span></div>';
  panel.innerHTML = `
    <div class="panel-hdr" style="padding:8px 12px 0;">STR RISK SUMMARY</div>
    ${summaryHtml}
    <div class="panel-hdr" style="padding:12px 12px 0;">FLAGGED LISTINGS</div>
    ${itemsHtml}
  `;
}
"""
with open(f"{ROOT}/hotelops-airbnb-tab.js", "w", encoding="utf-8") as f:
    f.write(airbnb_tab_js)
print(f"OK: created {ROOT}/hotelops-airbnb-tab.js")

print("\nAll edits applied. NOT committed -- review with git diff before committing.")
print("Still TODO manually (not covered by this script):")
print("  1. Add airbnb_listings sample-data array + reset/clear wiring")
print("     inside loadSampleData()/clearStorage() in hotelops-engine.js")
print("     (this script didn't touch those -- their exact structure wasn't confirmed).")
print("  2. Confirm hotelops-strategist.html actually surfaces airbnb_risks /")
print("     records.airbnb_listings in its report view (may render generically,")
print("     may need an explicit new section).")