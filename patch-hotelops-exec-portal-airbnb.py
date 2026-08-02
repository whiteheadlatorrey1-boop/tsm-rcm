#!/usr/bin/env python3
"""
Patch: add Airbnb/STR risk rendering to hotelops-executive-portal.html.

Context (confirmed by manual inspection, not guessed):
  - engine.buildRelayPayload() already includes `airbnb_risks: this.getAirbnbRisks()`
    (hotelops-engine.js line ~468), so the data ALREADY arrives at this portal
    via relay. It's just never read.
  - getAirbnbRisks() returns { items, total_listings, at_risk }, where each
    item has { listing_id, unit_name, issue, severity }.
  - The portal already has a `.risk-item` / `.sec` markup pattern used by
    renderRiskRegister() -- this patch reuses that exact pattern for
    visual consistency rather than inventing new markup.

Two anchors, both required to match exactly once:
  1. Insert a new renderAirbnbRisks() function right before renderPortfolio().
  2. Insert a call to it in render(), right after the existing
     renderRiskRegister() call and before renderPortfolio().

No guessing: if either anchor isn't found exactly once, this SKIPS and
reports why, rather than patching partially or in the wrong place.
"""

import os

TARGET = "html/war-rooms/hotel-war/hotelops-executive-portal.html"

FUNC_ANCHOR = "function renderPortfolio(portfolio){"

NEW_FUNCTION = '''function renderAirbnbRisks(airbnbRisks){
  const items = (airbnbRisks && airbnbRisks.items) || [];
  if(!items.length){
    return `<div class="sec"><div class="sec-hdr"><span class="lbl">AIRBNB / STR RISK REGISTER</span></div><div class="no-items">No flagged listings right now.</div></div>`;
  }
  const rows = items.map((it, idx) => {
    const isHigh = it.severity === 'high';
    const action = isHigh
      ? 'Escalate to property manager today \\u2014 guest-impact or double-booking risk.'
      : 'Schedule a fix within 48h \\u2014 within normal STR ops cadence.';
    return `
    <div class="risk-item">
      <div class="risk-rank">${idx+1}</div>
      <div class="risk-body">
        <div class="risk-title">${isHigh ? '<b>' + escapeHtml(it.unit_name || it.listing_id) + '</b>' : escapeHtml(it.unit_name || it.listing_id)} &mdash; ${escapeHtml(it.issue)}</div>
        <div class="risk-action">${escapeHtml(action)}</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="sec">
    <div class="sec-hdr"><span class="lbl">AIRBNB / STR RISK REGISTER</span><span class="sec-hdr-note">${airbnbRisks.at_risk} of ${airbnbRisks.total_listings} listings flagged</span></div>
    ${rows}
  </div>`;
}

'''

CALL_ANCHOR = "  html += renderRiskRegister(data.maintenance_breaches, data.compliance_risk);\n  html += renderPortfolio(data.portfolio);"

NEW_CALL = "  html += renderRiskRegister(data.maintenance_breaches, data.compliance_risk);\n  html += renderAirbnbRisks(data.airbnb_risks);\n  html += renderPortfolio(data.portfolio);"


def main():
    if not os.path.exists(TARGET):
        print(f"[SKIPPED] {TARGET}: file not found")
        return

    with open(TARGET, "r", encoding="utf-8") as f:
        html = f.read()

    func_count = html.count(FUNC_ANCHOR)
    call_count = html.count(CALL_ANCHOR)

    if func_count != 1:
        print(f"[SKIPPED] function anchor found {func_count} time(s), expected 1 -- refusing to guess.")
        return
    if call_count != 1:
        print(f"[SKIPPED] call-site anchor found {call_count} time(s), expected 1 -- refusing to guess.")
        return

    html = html.replace(FUNC_ANCHOR, NEW_FUNCTION + FUNC_ANCHOR, 1)
    html = html.replace(CALL_ANCHOR, NEW_CALL, 1)

    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"[PATCHED] {TARGET}: added renderAirbnbRisks() function + wired call in render()")
    print("NOT committed. Run `git diff` on this file before trusting it.")


if __name__ == "__main__":
    main()