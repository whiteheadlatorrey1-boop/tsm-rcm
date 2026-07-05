#!/usr/bin/env python3
"""
TSM-Consultz relay-chain fix script
====================================
Run this from the ROOT of your cloned repo (the folder that contains `html/`):

    python3 fix_relay_chain.py

It is safe to run multiple times — every fix checks whether it's already
applied before touching a file, so re-running after a partial manual fix
(or on a repo where some of this is already patched) won't break anything.

Fixes applied:
  1. Missing `</style>` closing tag in 4 dashboard/war-room entry pages.
     <style> is a raw-text element — without a closing tag, the browser
     swallows the ENTIRE rest of the document (including <body>) as CSS
     text, so nothing renders. This is the "black screen" bug.
       - html/war-rooms/digital-twin/digital-twin.html
       - html/war-rooms/integration-hub/integration-hub.html
       - html/war-rooms/governance/governance-war-room.html
       - html/war-rooms/mdm/mdm-war-room.html

  2. Malformed <script> closing tag in the same 4 files. The literal
     "</script>" inside a later <script src="..."> tag terminates the
     PRECEDING inline <script> block early, leaving a dangling fragment
     that's a JS syntax error — which silently kills the whole inline
     script (including button click handlers) even after fix #1.

  3. mdm-strategist.html reading a stale/non-canonical relay key
     (TSM_MDM_WAR_RELAY) instead of the canonical key the war room
     actually writes to (TSM_MDM_RELAY via TSM.relay.write("MDM", ...)).

  4. digital-twin.html's BPO "live signal" widget reading stale keys
     (TSM_BPO_STRAT_RELAY / TSM_BPO_WAR_RELAY) and parsing fields that
     don't exist in the current BPO relay payload shape. Rewritten to
     read the canonical TSM_BPO_RELAY key via TSM.relay.read('BPO') and
     reflect real risk_flags / sla_breaches counts.

After running, review the diff (`git diff`), commit, push, and redeploy
(`fly deploy`) — this script only edits files on disk, it does not run
git or fly for you.
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
HTML = ROOT / "html" / "war-rooms"

STYLE_SCRIPT_FILES = [
    HTML / "digital-twin" / "digital-twin.html",
    HTML / "integration-hub" / "integration-hub.html",
    HTML / "governance" / "governance-war-room.html",
    HTML / "mdm" / "mdm-war-room.html",
]

# exact tail markers immediately before the malformed script-closing pattern,
# per file (used to build the broken/fixed replacement pairs precisely)
SCRIPT_TAIL_MARKERS = {
    "digital-twin.html": "renderHealth(); renderDomains(); renderSignals(); renderForecasts();\n})();",
    "integration-hub.html": "loadFromEngine().catch(e=>console.error('[INTEGRATION]',e));\n  setInterval(()=>loadFromEngine().catch(()=>{}), 15000);\n})();",
    "governance-war-room.html": "renderKpis(); renderCompliance(); renderRisks(); renderAudit();\n})();",
    "mdm-war-room.html": "loadFromEngine().catch(e=>console.error('[MDM]',e));\n})();",
}

CHANGED = []
SKIPPED = []
WARNINGS = []


def fix_style_tag(text, name):
    if "</style>" in text:
        SKIPPED.append(f"{name}: </style> already present")
        return text, False
    new_text, n = re.subn(r"</head>", "</style>\n</head>", text, count=1)
    if n:
        CHANGED.append(f"{name}: added missing </style>")
        return new_text, True
    WARNINGS.append(f"{name}: no </head> found — could not fix style tag, check manually")
    return text, False


def fix_script_tag(text, name):
    marker = SCRIPT_TAIL_MARKERS.get(name)
    if not marker:
        return text, False
    broken = marker + '\n  <script src="/html/core/tsm-runtime.js"></script>\n</script></body></html>'
    fixed = marker + '\n</script>\n  <script src="/html/core/tsm-runtime.js"></script>\n</body></html>'
    if broken in text:
        text = text.replace(broken, fixed)
        CHANGED.append(f"{name}: closed malformed <script> tag")
        return text, True
    if fixed in text:
        SKIPPED.append(f"{name}: script tag already fixed")
        return text, False
    WARNINGS.append(f"{name}: expected script-tag pattern not found — check manually")
    return text, False


def fix_mdm_strategist():
    path = HTML / "mdm" / "mdm-strategist.html"
    name = "mdm-strategist.html"
    if not path.exists():
        WARNINGS.append(f"{name}: file not found at {path}")
        return
    text = path.read_text(encoding="utf-8")
    changed = False

    old_a = (
        "        const raw = sessionStorage.getItem('TSM_MDM_WAR_RELAY') || localStorage.getItem('TSM_MDM_WAR_RELAY')\n"
        "                 || sessionStorage.getItem('tsm_mdm_war_relay') || localStorage.getItem('tsm_mdm_war_relay');"
    )
    new_a = "        const raw = sessionStorage.getItem('TSM_MDM_RELAY') || localStorage.getItem('TSM_MDM_RELAY');"
    if old_a in text:
        text = text.replace(old_a, new_a)
        changed = True

    old_b = "    if(['TSM_MDM_WAR_RELAY','tsm_mdm_war_relay'].includes(e.key)) loadRelay();"
    new_b = "    if(e.key === 'TSM_MDM_RELAY') loadRelay();"
    if old_b in text:
        text = text.replace(old_b, new_b)
        changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
        CHANGED.append(f"{name}: now reads canonical TSM_MDM_RELAY key")
    else:
        SKIPPED.append(f"{name}: canonical key already in use (or pattern not found)")


OLD_BPO_FN = '''  // ── LIVE BPO SIGNAL: reads real relay data written by bpo-situation-room.html
  // and bpo-strategist-v2.html, instead of a hardcoded line. First real
  // (non-static) signal source in Digital Twin -- see phases.json Phase 10 note.
  function getBpoLiveSignal(){
    try {
      const stratRaw = localStorage.getItem('TSM_BPO_STRAT_RELAY');
      const warRaw = localStorage.getItem('TSM_BPO_WAR_RELAY');
      if (stratRaw) {
        const s = JSON.parse(stratRaw);
        const conf = s.recommendation?.confidence || '—';
        const sector = s.sector || 'BPO';
        const t = new Date(s.timestamp);
        const time = isNaN(t) ? '—' : t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        return {type:'ok', text:`BPO: ${sector} strategist brief generated — ${conf}% confidence`, src:'BPO', time, live:true};
      }
      if (warRaw) {
        const w = JSON.parse(warRaw);
        const sector = w.selectedSector || 'BPO';
        const t = new Date(w.timestamp);
        const time = isNaN(t) ? '—' : t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        return {type:'warn', text:`BPO: ${sector} case extracted, awaiting strategist review`, src:'BPO', time, live:true};
      }
    } catch(e) {}
    return {type:'warn', text:'BPO: no active case data — open bpo-situation-room.html to generate live signal', src:'BPO', time:'—', live:false};
  }'''

NEW_BPO_FN = '''  // ── LIVE BPO SIGNAL: reads real relay data written by bpo-war-room.html
  // via TSM.relay.write("BPO", ...) -> canonical key TSM_BPO_RELAY, instead
  // of a hardcoded line. First real (non-static) signal source in Digital
  // Twin -- see phases.json Phase 10 note.
  function getBpoLiveSignal(){
    try {
      let raw = null;
      if (window.TSM && window.TSM.relay && window.TSM.relay.read) {
        raw = window.TSM.relay.read('BPO');
      } else {
        const r = localStorage.getItem('TSM_BPO_RELAY') || sessionStorage.getItem('TSM_BPO_RELAY');
        raw = r ? JSON.parse(r) : null;
      }
      if (raw) {
        const b = raw;
        const t = new Date(b.relayed_at || b.timestamp);
        const time = isNaN(t) ? '—' : t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        const slaCount = (b.sla_breaches || []).length;
        const riskCount = (b.risk_flags || []).length;
        if (riskCount > 0) {
          return {type:'bad', text:`BPO: ${riskCount} risk signal${riskCount===1?'':'s'} flagged across engagements`, src:'BPO', time, live:true};
        }
        if (slaCount > 0) {
          return {type:'warn', text:`BPO: ${slaCount} SLA breach${slaCount===1?'':'es'} in pipeline`, src:'BPO', time, live:true};
        }
        return {type:'ok', text:'BPO: pipeline operational — no risk signals', src:'BPO', time, live:true};
      }
    } catch(e) {}
    return {type:'warn', text:'BPO: no active case data — open bpo-war-room.html to generate live signal', src:'BPO', time:'—', live:false};
  }'''


def fix_digital_twin_bpo_signal():
    path = HTML / "digital-twin" / "digital-twin.html"
    name = "digital-twin.html (BPO signal)"
    if not path.exists():
        WARNINGS.append(f"{name}: file not found at {path}")
        return
    text = path.read_text(encoding="utf-8")
    if OLD_BPO_FN in text:
        text = text.replace(OLD_BPO_FN, NEW_BPO_FN)
        path.write_text(text, encoding="utf-8")
        CHANGED.append(f"{name}: now reads canonical TSM_BPO_RELAY + current payload shape")
    elif NEW_BPO_FN in text:
        SKIPPED.append(f"{name}: BPO signal already fixed")
    else:
        WARNINGS.append(f"{name}: BPO signal function not found in expected form — check manually")


def main():
    if not HTML.exists():
        print(f"ERROR: expected to find {HTML} — run this script from the repo root "
              f"(the folder containing html/war-rooms/).")
        sys.exit(1)

    for path in STYLE_SCRIPT_FILES:
        name = path.name
        if not path.exists():
            WARNINGS.append(f"{name}: file not found at {path}")
            continue
        text = path.read_text(encoding="utf-8")
        text, c1 = fix_style_tag(text, name)
        text, c2 = fix_script_tag(text, name)
        if c1 or c2:
            path.write_text(text, encoding="utf-8")

    fix_mdm_strategist()
    fix_digital_twin_bpo_signal()

    print("\n=== FIXED ===")
    for line in CHANGED:
        print(" ", line)
    print("\n=== ALREADY OK / SKIPPED ===")
    for line in SKIPPED:
        print(" ", line)
    if WARNINGS:
        print("\n=== NEEDS MANUAL CHECK ===")
        for line in WARNINGS:
            print(" ", line)

    print(f"\n{len(CHANGED)} file(s) changed, {len(SKIPPED)} already fine, {len(WARNINGS)} need a look.")
    print("\nNext steps: git diff  →  git add -A  →  git commit  →  git push  →  fly deploy")


if __name__ == "__main__":
    main()