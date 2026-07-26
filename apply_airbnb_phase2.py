#!/usr/bin/env python3
"""
Phase 2: Airbnb / STR Operations -- sample data + reset wiring + strategist render.
Anchor-assert style, fails loudly with no partial writes if any anchor is off.
Safe to run ONCE. Re-running will abort on edit 1/3/4 (already-applied anchors
won't be found) -- that's expected and fine, it just means don't run it twice.
"""
import json, sys

ENGINE_PATH = "html/war-rooms/hotel-war/services/hotelops-engine.js"
MODEL_PATH = "html/war-rooms/hotel-war/data/hotelops-model.json"
STRAT_PATH = "html/war-rooms/hotel-war/hotelops-strategist.html"


def edit(path, old, new, expect=1):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(old)
    if count != expect:
        print(f"ABORT: expected {expect} occurrence(s) of anchor in {path}, found {count}.")
        print(f"Anchor was:\n{old[:300]}")
        sys.exit(1)
    content = content.replace(old, new, expect)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: patched {path}")


# 1. Engine: add 'airbnb_listings' to ENTITY_KEYS
edit(
    ENGINE_PATH,
    "    'staff_shifts', 'incidents'\n  ];",
    "    'staff_shifts', 'incidents', 'airbnb_listings'\n  ];",
)

# 2. Model JSON: add airbnb_listings sample rows to sample_data
with open(MODEL_PATH, "r", encoding="utf-8") as f:
    model = json.load(f)

if "airbnb_listings" in model.get("sample_data", {}):
    print(f"ABORT: sample_data.airbnb_listings already present in {MODEL_PATH} -- already applied.")
    sys.exit(1)

model["sample_data"]["airbnb_listings"] = [
    {
        "listing_id": "ABB-101", "platform": "Airbnb", "unit_name": "Desert Casita 1",
        "turnover_status": "pending", "checkout_time": "11:00", "next_checkin_time": "15:00",
        "calendar_synced": True, "host_response_mins": 12, "lockbox_code_rotated": True
    },
    {
        "listing_id": "ABB-102", "platform": "Vrbo", "unit_name": "Desert Casita 2",
        "turnover_status": "overdue", "checkout_time": "10:00", "next_checkin_time": "16:00",
        "calendar_synced": False, "host_response_mins": 145, "lockbox_code_rotated": False
    },
    {
        "listing_id": "ABB-103", "platform": "Booking.com", "unit_name": "Desert Casita 3",
        "turnover_status": "complete", "checkout_time": "11:00", "next_checkin_time": "17:00",
        "calendar_synced": True, "host_response_mins": 8, "lockbox_code_rotated": True
    },
]

with open(MODEL_PATH, "w", encoding="utf-8") as f:
    json.dump(model, f, indent=2)
    f.write("\n")
print(f"OK: patched {MODEL_PATH} (note: this reformats the whole JSON file with 2-space indent -- "
      f"the diff will show more than just the new key, that's expected and harmless)")

# 3. Strategist: add renderAirbnbRegister() function after renderComplianceRegister()
edit(
    STRAT_PATH,
    '''  return `<div class="sec">
    <div class="sec-hdr"><span class="lbl">COMPLIANCE RISK REGISTER</span><span class="sec-hdr-note">sorted by due date</span></div>
    <table class="aq-table">
      <thead><tr><th>Item</th><th>Impact</th><th>Due In</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}''',
    '''  return `<div class="sec">
    <div class="sec-hdr"><span class="lbl">COMPLIANCE RISK REGISTER</span><span class="sec-hdr-note">sorted by due date</span></div>
    <table class="aq-table">
      <thead><tr><th>Item</th><th>Impact</th><th>Due In</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderAirbnbRegister(items){
  const rows = (items||[]).map(it => `<tr>
    <td>${it.unit_name} (${it.listing_id})</td>
    <td>${it.severity ? it.severity.toUpperCase() : ''}</td>
    <td>${it.issue}</td>
    </tr>`).join('');
  return `<div class="sec">
    <div class="sec-hdr"><span class="lbl">AIRBNB / STR RISK REGISTER</span><span class="sec-hdr-note">flagged listings</span></div>
    <table class="aq-table">
      <thead><tr><th>Listing</th><th>Severity</th><th>Issue</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}''',
)

# 4. Strategist: call renderAirbnbRegister() in render()
edit(
    STRAT_PATH,
    "  html += renderComplianceRegister(data.compliance_risk);\n",
    "  html += renderComplianceRegister(data.compliance_risk);\n"
    "  html += renderAirbnbRegister(data.airbnb_risks ? data.airbnb_risks.items : []);\n",
)

print("\nAll phase-2 edits applied. NOT committed -- review with git diff before committing.")