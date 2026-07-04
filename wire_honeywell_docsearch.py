#!/usr/bin/env python3
"""
wire_honeywell_docsearch.py

Wires the three Honeywell industrial war-room tools into
html/tsm-doc-search-multi.html the same way every other vertical is wired:

  1. Adds WAR_ROOM_ROUTES entries for plant-incident.html, supplier-shutdown.html,
     and cyber-incident.html (relay + autoKey pairs, matching the existing pattern).
  2. Adds a doc-search INTAKE listener to each of the three tool files, matching
     the pattern already used by finops-war-room.html and friends:
       - reads the relay/autoKey payload the hub writes on launch
       - populates #docInput with relay.docText
       - shows a dismissible banner
       - clears the relay keys
       - auto-fires fireAllEngines() if tsm_auto_mode === 'on'

Run from the repo root (expects html/tsm-doc-search-multi.html, html/plant-incident.html,
html/supplier-shutdown.html, html/cyber-incident.html to exist relative to cwd, OR pass
--root to point at the repo root explicitly).

Aborts with zero changes to ANY file if any anchor isn't found exactly once in its
target file. Writes .bak backups before touching anything.

Usage:
    python3 wire_honeywell_docsearch.py [--root /path/to/repo]
"""
import argparse
import shutil
import sys
from pathlib import Path

# ── File 1: html/tsm-doc-search-multi.html ──────────────────────────────────
HUB_OLD = """  'digital-twin':  { label:'Digital Twin War Room', url:'/html/war-rooms/digital-twin/digital-twin.html', relay:'tsm_digitaltwin_docsearch_relay',autoKey:'TSM_DIGITALTWIN_WAR_RELAY' },
};"""

HUB_NEW = """  'digital-twin':  { label:'Digital Twin War Room', url:'/html/war-rooms/digital-twin/digital-twin.html', relay:'tsm_digitaltwin_docsearch_relay',autoKey:'TSM_DIGITALTWIN_WAR_RELAY' },
  'hw-plant-war-room':    { label:'Honeywell Plant Incident War Room',      url:'/html/plant-incident.html',      relay:'tsm_hw_plant_docsearch_relay',    autoKey:'TSM_HW_PLANT_WAR_RELAY' },
  'hw-plant':             { label:'Honeywell Plant Incident War Room',      url:'/html/plant-incident.html',      relay:'tsm_hw_plant_docsearch_relay',    autoKey:'TSM_HW_PLANT_WAR_RELAY' },
  'hw-supplier-war-room': { label:'Honeywell Supplier Shutdown War Room',   url:'/html/supplier-shutdown.html',   relay:'tsm_hw_supplier_docsearch_relay', autoKey:'TSM_HW_SUPPLIER_WAR_RELAY' },
  'hw-supplier':          { label:'Honeywell Supplier Shutdown War Room',   url:'/html/supplier-shutdown.html',   relay:'tsm_hw_supplier_docsearch_relay', autoKey:'TSM_HW_SUPPLIER_WAR_RELAY' },
  'hw-cyber-war-room':    { label:'Honeywell Cyber Incident War Room',      url:'/html/cyber-incident.html',      relay:'tsm_hw_cyber_docsearch_relay',    autoKey:'TSM_HW_CYBER_WAR_RELAY' },
  'hw-cyber':             { label:'Honeywell Cyber Incident War Room',      url:'/html/cyber-incident.html',      relay:'tsm_hw_cyber_docsearch_relay',    autoKey:'TSM_HW_CYBER_WAR_RELAY' },
};"""

# ── Intake block template (INCIDENT-SPECIFIC values filled in per file) ─────
INTAKE_TEMPLATE = """const STRATEGIST_URL = '/html/war-rooms/honeywell-strategist.html';

// ── DOC-SEARCH INTAKE RELAY ──────────────────────────────────────────────────
// Populates #docInput from a doc routed here via tsm-doc-search-multi.html's
// WAR_ROOM_ROUTES['{route_key}'] entry. Mirrors the intake pattern used by
// finops-war-room.html and the other verticals.
const DOCSEARCH_RELAY_KEY = '{relay_key}';
const DOCSEARCH_AUTO_KEY  = '{auto_key}';
(function(){{
  try {{
    const raw = localStorage.getItem(DOCSEARCH_RELAY_KEY) || localStorage.getItem(DOCSEARCH_AUTO_KEY);
    if (!raw) return;
    const relay = JSON.parse(raw);
    if (!relay.docText) return;
    localStorage.removeItem(DOCSEARCH_RELAY_KEY);
    localStorage.removeItem(DOCSEARCH_AUTO_KEY);
    setTimeout(() => {{
      const el = document.getElementById('docInput');
      if (el) {{ el.value = relay.docText; el.dispatchEvent(new Event('input')); }}
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:rgba(0,180,100,.12);border-bottom:1px solid rgba(0,180,100,.3);padding:7px 20px;font-family:monospace;font-size:10px;color:#00d4aa;letter-spacing:1px;display:flex;justify-content:space-between';
      banner.innerHTML = `<span>⚡ DOC RELAY — ${{relay.docType||'DOCUMENT'}} · ${{relay.fileName||''}} · paste area loaded</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:#00d4aa;cursor:pointer">✕</button>`;
      document.body.prepend(banner);
      if (localStorage.getItem('tsm_auto_mode') === 'on') {{
        setTimeout(() => {{ if (typeof fireAllEngines === 'function') fireAllEngines(); }}, 800);
      }}
    }}, 300);
  }} catch(e) {{ console.warn('Doc search relay error:', e); }}
}})();
"""

TOOLS = [
    {
        "path": "html/plant-incident.html",
        "route_key": "hw-plant-war-room",
        "relay_key": "tsm_hw_plant_docsearch_relay",
        "auto_key": "TSM_HW_PLANT_WAR_RELAY",
    },
    {
        "path": "html/supplier-shutdown.html",
        "route_key": "hw-supplier-war-room",
        "relay_key": "tsm_hw_supplier_docsearch_relay",
        "auto_key": "TSM_HW_SUPPLIER_WAR_RELAY",
    },
    {
        "path": "html/cyber-incident.html",
        "route_key": "hw-cyber-war-room",
        "relay_key": "tsm_hw_cyber_docsearch_relay",
        "auto_key": "TSM_HW_CYBER_WAR_RELAY",
    },
]

OLD_ANCHOR = "const STRATEGIST_URL = '/html/war-rooms/honeywell-strategist.html';\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Repo root (default: current directory)")
    args = ap.parse_args()

    root = Path(args.root)
    hub_path = root / "html" / "tsm-doc-search-multi.html"

    files_to_patch = [hub_path] + [root / t["path"] for t in TOOLS]
    problems = []

    for p in files_to_patch:
        if not p.exists():
            problems.append(f"  - {p} not found")

    if not problems:
        hub_text = hub_path.read_text(encoding="utf-8")
        count = hub_text.count(HUB_OLD)
        if count != 1:
            problems.append(f"  - hub WAR_ROOM_ROUTES anchor: expected 1 match, found {count}")

        for t in TOOLS:
            tool_path = root / t["path"]
            tool_text = tool_path.read_text(encoding="utf-8")
            count = tool_text.count(OLD_ANCHOR)
            if count != 1:
                problems.append(f"  - {t['path']} STRATEGIST_URL anchor: expected 1 match, found {count}")

    if problems:
        print("ABORTING — no changes made to any file. The following didn't match as expected:")
        print("\n".join(problems))
        print("\nPaste the current file contents so the patch can be adjusted.")
        sys.exit(1)

    # ── Patch the hub ──
    backup = hub_path.with_suffix(hub_path.suffix + ".bak")
    shutil.copy2(hub_path, backup)
    print(f"Backup written to {backup}")
    hub_text = hub_path.read_text(encoding="utf-8")
    hub_text = hub_text.replace(HUB_OLD, HUB_NEW, 1)
    hub_path.write_text(hub_text, encoding="utf-8")
    print(f"Patched {hub_path}: added 6 WAR_ROOM_ROUTES entries (3 tools x 2 key aliases each)")

    # ── Patch each tool ──
    for t in TOOLS:
        tool_path = root / t["path"]
        backup = tool_path.with_suffix(tool_path.suffix + ".bak")
        shutil.copy2(tool_path, backup)
        print(f"Backup written to {backup}")

        tool_text = tool_path.read_text(encoding="utf-8")
        replacement = INTAKE_TEMPLATE.format(
            route_key=t["route_key"], relay_key=t["relay_key"], auto_key=t["auto_key"]
        )
        tool_text = tool_text.replace(OLD_ANCHOR, replacement, 1)
        tool_path.write_text(tool_text, encoding="utf-8")
        print(f"Patched {tool_path}: added doc-search intake relay listener")

    print("\nDone. Next steps:")
    print("  node -c <file>   # HTML files won't parse as JS directly; see script-tag-check below instead")
    print("  git diff")
    print("\nTo validate the embedded <script> blocks are still syntactically valid JS,")
    print("use the companion checker: python3 check_html_script_syntax.py <file.html>")


if __name__ == "__main__":
    main()