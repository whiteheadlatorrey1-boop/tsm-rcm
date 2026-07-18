#!/usr/bin/env python3
"""
Unify the two chaos tracks.

Previously the top-of-page "AI Chaos Engine — Inject Incident" panel
(api.js's POST /incidents/generate) created Service Desk tickets directly
via incident-engine.js, completely bypassing the AD/M365/Network/Device
digital twins. That meant SLA Summary, AI Risk Scoring, Technician
Performance, and Historical Analytics — which all read from the twins —
stayed at zero no matter how many tickets that panel generated.

This patch:
  1. Registers VMware into the chaos engine's twin map (it already had a
     manual per-panel fault-inject button, but was never part of
     triggerRandom()/triggerOnce('vmware') — a separate small pre-existing
     gap, closed here since it's directly adjacent).
  2. Exports a triggerModuleFault(moduleName) helper from twins-router.js
     that applies a real twin fault + records it in Technician Performance,
     without also creating a second service-desk ticket (incident-engine
     already creates one with richer site/dept data than the twins' own
     bridge would).
  3. Wires api.js's /incidents/generate to best-effort call that helper
     when the clicked category maps to an existing twin (Dell Laptop,
     Desktop, Printer -> device; Network -> network; Active Directory -> ad;
     Microsoft 365 -> m365; VMware -> vmware).
  4. Leaves VPN and SCADA as ticket-only, since no twin models those systems
     yet — documented in the How To guide rather than silently guessed at.

Idempotent: checks for its own markers before patching any file.
"""

ROUTER_PATH = "server/enterprise-lab/twins-router.js"
API_PATH = "server/enterprise-lab/api.js"
HTML_PATH = "html/enterprise-command-center.html"

MARKER = "triggerModuleFault"


# ---------------------------------------------------------------------------
# 1 & 2. twins-router.js — register vmware with chaos engine, export the helper
# ---------------------------------------------------------------------------

def patch_router():
    with open(ROUTER_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    if MARKER in src:
        print(f"[skip] {ROUTER_PATH} already patched")
        return

    # 1. Register vmware with the chaos engine's twin map.
    old_chaos_ctor = (
        "const chaosEngine = new ChaosEngine({\n"
        "  ad: { twin: adTwin, faultTypes: AD_FAULTS },\n"
        "  m365: { twin: m365Twin, faultTypes: M365_FAULTS },\n"
        "  network: { twin: networkTwin, faultTypes: NETWORK_FAULTS },\n"
        "  device: { twin: deviceTwin, faultTypes: DEVICE_FAULTS },\n"
        "  vendor: { twin: vendorOpsTwin, faultTypes: VENDOR_FAULTS },\n"
        "});"
    )
    assert src.count(old_chaos_ctor) == 1, "ChaosEngine constructor block not found or not unique"
    new_chaos_ctor = old_chaos_ctor.replace(
        "  vendor: { twin: vendorOpsTwin, faultTypes: VENDOR_FAULTS },\n});",
        "  vendor: { twin: vendorOpsTwin, faultTypes: VENDOR_FAULTS },\n"
        "  vmware: { twin: vmwareTwin, faultTypes: VMWARE_FAULTS },\n});",
    )
    src = src.replace(old_chaos_ctor, new_chaos_ctor, 1)

    # 2. Export triggerModuleFault() for api.js to call. Insert right before
    #    module.exports, and attach it as a property on the exported router
    #    (routers are functions, so this is a normal, safe pattern here).
    export_anchor = "module.exports = router;"
    assert src.count(export_anchor) == 1, f"expected exactly one '{export_anchor}'"

    helper_block = '''
// Applies a real fault to the named twin and records it against Technician
// Performance, without creating a second Service Desk ticket — callers that
// already created their own ticket (e.g. api.js's /incidents/generate) want
// the twin/SLA/analytics side effects only, not a duplicate mission entry.
function triggerModuleFault(moduleName) {
  const result = chaosEngine.triggerOnce(moduleName);
  technicianMetrics.recordIncident(result);
  return result;
}

'''

    src = src.replace(
        export_anchor,
        helper_block.strip("\n") + "\n\n" + export_anchor + "\nmodule.exports.triggerModuleFault = triggerModuleFault;\n",
        1,
    )

    with open(ROUTER_PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"[ok] patched {ROUTER_PATH}")


# ---------------------------------------------------------------------------
# 3. api.js — map categories to twin modules, call the helper best-effort
# ---------------------------------------------------------------------------

API_REQUIRE = "const twinsRouter = require('./twins-router');\n"

CATEGORY_MAP_BLOCK = '''
// Categories that have a matching digital twin get a real twin fault applied
// (feeding SLA/AI Risk/Technician/Historical Analytics) in addition to the
// ticket this route already creates below. VPN and SCADA are intentionally
// left unmapped — no twin models those systems yet.
const CATEGORY_TO_MODULE = {
  'Dell Laptop': 'device',
  'Desktop': 'device',
  'Printer': 'device',
  'Network': 'network',
  'Active Directory': 'ad',
  'Microsoft 365': 'm365',
  'VMware': 'vmware',
};

'''


def patch_api():
    with open(API_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    if MARKER in src:
        print(f"[skip] {API_PATH} already patched")
        return

    # Add the require
    old_require = "const { engine, CATEGORIES } = require('./incident-engine');\n"
    assert src.count(old_require) == 1, "incident-engine require line not found or not unique"
    src = src.replace(old_require, old_require + API_REQUIRE, 1)

    # Add the category map, right before the /incidents/generate route
    route_anchor = (
        "// Manually inject an incident (Chaos Engine button).\n"
        "router.post('/incidents/generate', (req, res) => {\n"
        "  const { category, priority, issue } = req.body || {};\n"
        "  const mission = engine.createIncident({ category, priority, issue });\n"
        "  res.json({ ok: true, mission });\n"
        "});\n"
    )
    assert src.count(route_anchor) == 1, "/incidents/generate route not found or not unique"

    new_route = (
        "// Manually inject an incident (Chaos Engine button). Best-effort also\n"
        "// applies a matching digital-twin fault so SLA/AI Risk/Technician/\n"
        "// Historical Analytics reflect it, not just the Service Desk Wall.\n"
        "router.post('/incidents/generate', (req, res) => {\n"
        "  const { category, priority, issue } = req.body || {};\n"
        "  const mission = engine.createIncident({ category, priority, issue });\n"
        "\n"
        "  const moduleName = CATEGORY_TO_MODULE[mission.category];\n"
        "  if (moduleName) {\n"
        "    try {\n"
        "      twinsRouter.triggerModuleFault(moduleName);\n"
        "    } catch (err) {\n"
        "      // Best-effort: e.g. no valid target currently exists for any fault\n"
        "      // type on this twin. The ticket above was already created\n"
        "      // successfully, so don't fail the request over this.\n"
        "    }\n"
        "  }\n"
        "\n"
        "  res.json({ ok: true, mission });\n"
        "});\n"
    )

    src = src.replace(route_anchor, CATEGORY_MAP_BLOCK.strip("\n") + "\n\n" + new_route, 1)

    with open(API_PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"[ok] patched {API_PATH}")


# ---------------------------------------------------------------------------
# 4. HTML — update the How To guide to reflect the unified behavior
# ---------------------------------------------------------------------------

def patch_html():
    with open(HTML_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    if "VPN and SCADA" in src:
        print(f"[skip] {HTML_PATH} already patched")
        return

    old_howto = (
        '      <div class="howto-section">\n'
        '        <h4>AI Chaos Engine</h4>\n'
        '        <p>Click any category button under "AI Chaos Engine — Inject Incident" to generate a new simulated ticket in that category. It lands immediately on the Service Desk Wall and Mission Queue.</p>\n'
        '      </div>\n'
    )
    assert src.count(old_howto) == 1, "AI Chaos Engine how-to section not found or not unique"

    new_howto = (
        '      <div class="howto-section">\n'
        '        <h4>AI Chaos Engine</h4>\n'
        '        <p>Click any category button under "AI Chaos Engine — Inject Incident" to generate a new simulated ticket in that category. It lands immediately on the Service Desk Wall and Mission Queue. For categories with a matching digital twin (Dell Laptop, Desktop, Printer, Network, Active Directory, Microsoft 365, VMware), a real fault is also applied to that twin, so SLA Summary, AI Risk Scoring, Technician Performance, and Historical Analytics update too. VPN and SCADA tickets are ticket-only for now — no twin models those systems yet.</p>\n'
        '      </div>\n'
    )

    src = src.replace(old_howto, new_howto, 1)

    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"[ok] patched {HTML_PATH}")


if __name__ == "__main__":
    patch_router()
    patch_api()
    patch_html()
    print("Done.")