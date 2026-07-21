#!/usr/bin/env python3
"""
Wires TSMIncomingDocPanel (html/js/core/tsm-incoming-doc-panel.js) into the
13 war rooms registered in tsm-doc-search-multi.html's WAR_ROOM_ROUTES that
have no per-document processing pipeline to actually ingest a routed
document into (dashboards, master-data views, structured-JSON/table
intakes, simulations). Previously, documents routed here silently
vanished. Now they show a real "Incoming Document" panel with the
classification fields intake already extracted, with an acknowledge
action.

Run from repo root: python3 apply_add_incoming_doc_panel.py
"""

TARGETS = [
    ("html/reo-pro/mortgage/index.html", "tsm_mortgage_docsearch_relay"),
    ("html/schools-command/schools-command.html", "tsm_schools_docsearch_relay"),
    ("html/war-rooms/cpq/cpq-war-room.html", "tsm_cpq_docsearch_relay"),
    ("html/war-rooms/crm/crm-war-room.html", "tsm_crm_docsearch_relay"),
    ("html/war-rooms/approval/approval-war-room.html", "tsm_approval_docsearch_relay"),
    ("html/war-rooms/catalog/catalog-war-room.html", "tsm_catalog_docsearch_relay"),
    ("html/war-rooms/mdm/mdm-war-room.html", "tsm_mdm_docsearch_relay"),
    ("html/war-rooms/integration-hub/integration-hub.html", "tsm_integration_docsearch_relay"),
    ("html/war-rooms/governance/governance-war-room.html", "tsm_governance_docsearch_relay"),
    ("html/war-rooms/digital-twin/digital-twin.html", "tsm_digitaltwin_docsearch_relay"),
    ("html/l1-copilot/noc/noc-war-room.html", "tsm_noc_docsearch_relay"),
    ("html/war-rooms/o2c/o2c-war-room.html", "tsm_o2c_docsearch_relay"),
]

# Healthcare has a malformed duplicate </body></html> in the file (leftover
# from a prior edit) — handled separately with a more specific anchor so we
# land in the right spot (the true end of file, not the mid-file duplicate).
HEALTHCARE_PATH = "html/healthcare/hc-denial-war-room.html"
HEALTHCARE_RELAY_KEY = "tsm_hc_docsearch_relay"


def panel_snippet(relay_key):
    return (
        '<script src="/js/core/tsm-incoming-doc-panel.js"></script>\n'
        '<script>TSMIncomingDocPanel.init(\'' + relay_key + '\');</script>\n'
        '</body>'
    )


def patch_standard(path, relay_key):
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()
    orig = s

    count = s.count("</body>")
    assert count == 1, f"{path}: expected exactly 1 </body>, found {count}"

    s = s.replace("</body>", panel_snippet(relay_key), 1)
    assert s != orig
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"Patched {path} (relay={relay_key})")


def patch_healthcare():
    with open(HEALTHCARE_PATH, "r", encoding="utf-8") as f:
        s = f.read()
    orig = s

    anchor = '<!-- TSM KERNEL ENGINE -->\n<script src="/html/core/tsm-kernel.js"></script>\n</body>\n</html>'
    assert s.count(anchor) == 1, f"{HEALTHCARE_PATH}: expected 1 match for end-of-file anchor, found {s.count(anchor)}"

    replacement = (
        '<!-- TSM KERNEL ENGINE -->\n<script src="/html/core/tsm-kernel.js"></script>\n'
        '<script src="/js/core/tsm-incoming-doc-panel.js"></script>\n'
        f'<script>TSMIncomingDocPanel.init(\'{HEALTHCARE_RELAY_KEY}\');</script>\n'
        '</body>\n</html>'
    )
    s = s.replace(anchor, replacement)
    assert s != orig
    with open(HEALTHCARE_PATH, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"Patched {HEALTHCARE_PATH} (relay={HEALTHCARE_RELAY_KEY})")


if __name__ == "__main__":
    for path, relay_key in TARGETS:
        patch_standard(path, relay_key)
    patch_healthcare()
    print("Done. 13 files patched.")