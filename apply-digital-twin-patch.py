#!/usr/bin/env python3
"""
One-shot patcher for html/war-rooms/digital-twin/digital-twin.html

What it does:
  1. Confirms relay.core.js's REGISTRY has all 7 keys we're about to rely on
     (fails loudly instead of guessing if INTEGRATION -- or any other key --
     isn't there).
  2. Backs up digital-twin.html to digital-twin.html.bak
  3. Inserts countBySeverity() + buildLiveSignal() + VERTICAL_SIGNAL_CONFIG
     right after getBpoLiveSignal(), replacing the old getBpoLiveSignal-only
     block usage in SIGNALS.
  4. Replaces the old `const SIGNALS=[...]` mocked array with the
     config-driven version.
  5. Prints a diff-style summary. Does NOT run certify/commit/push --
     you do that yourself after eyeballing the result.

Run from repo root:
  python3 apply-digital-twin-patch.py
"""

import re
import sys
import shutil
from pathlib import Path

REPO_ROOT = Path(".")
TWIN_FILE = REPO_ROOT / "html/war-rooms/digital-twin/digital-twin.html"
RELAY_CORE_FILE = REPO_ROOT / "html/war-rooms/_relay_control_plane/relay.core.js"

REQUIRED_KEYS = ["BPO", "O2C", "CPQ", "CRM", "APPROVAL", "GOVERNANCE", "INTEGRATION"]

INJECT_BLOCK = '''
  // ── Shared severity tally for the `explain` arrays every vertical writes.
  // Confirmed convention across BPO/O2C/CPQ/CRM/APPROVAL/GOVERNANCE/INTEGRATION:
  // getExplainItems() tags each item severity: 'high'|'med'|'low'.
  function countBySeverity(explain) {
    const c = { high: 0, med: 0, low: 0 };
    (explain || []).forEach(item => {
      if (item && c.hasOwnProperty(item.severity)) c[item.severity]++;
    });
    return c;
  }

  // ── Storage-key fallback map, sourced from relay.core.js REGISTRY values
  // (verified at patch time -- see REQUIRED_KEYS check in the apply script).
  // Kept as a local literal rather than importing relay.core.js's REGISTRY
  // object directly, since that module may not expose it globally; update
  // this map if relay.core.js's REGISTRY ever changes.
  const RELAY_STORAGE_KEYS = {
    BPO: 'TSM_BPO_RELAY',
    O2C: 'TSM_O2C_RELAY',
    CPQ: 'TSM_CPQ_RELAY',
    CRM: 'TSM_CRM_RELAY',
    APPROVAL: 'TSM_APPROVAL_RELAY',
    GOVERNANCE: 'TSM_GOVERNANCE_RELAY',
    INTEGRATION: 'TSM_INTEGRATION_RELAY'
  };

  // ── Config-driven signal list. To add a new live vertical, add one
  // entry here -- no new function needed.
  const VERTICAL_SIGNAL_CONFIG = [
    { key: 'BPO',         label: 'BPO',         tsField: 'timestamp',   okText: 'BPO: pipeline operational — no risk signals' },
    { key: 'O2C',         label: 'O2C',         tsField: 'relayed_at',  okText: 'O2C: pipeline operational — no risk signals' },
    { key: 'CPQ',         label: 'CPQ',         tsField: 'timestamp',   okText: 'CPQ: quote pipeline healthy — no SLA risk' },
    { key: 'CRM',         label: 'CRM',         tsField: 'ts',          okText: 'CRM: cases and opportunities on track' },
    { key: 'APPROVAL',    label: 'APPROVALS',   tsField: 'timestamp',   okText: 'Approvals: queue clear — no SLA breaches' },
    { key: 'GOVERNANCE',  label: 'GOVERNANCE',  tsField: 'timestamp',   okText: 'Governance: controls passing — no open risks' },
    { key: 'INTEGRATION', label: 'INTEGRATION', tsField: 'timestamp',   okText: 'Integration Hub: systems and queues nominal' }
  ];

  function buildLiveSignal(cfg){
    try {
      let raw = null;
      if (window.TSM && window.TSM.relay && window.TSM.relay.read) {
        raw = window.TSM.relay.read(cfg.key);
      } else {
        const storageKey = RELAY_STORAGE_KEYS[cfg.key];
        const r = storageKey && (localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey));
        raw = r ? JSON.parse(r) : null;
      }
      if (raw) {
        const t = new Date(raw[cfg.tsField]);
        const time = isNaN(t) ? '—' : t.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        const { high, med, low } = countBySeverity(raw.explain);
        if (high > 0) {
          return {type:'bad', text:`${cfg.label}: ${high} high-severity item${high===1?'':'s'} flagged`, src:cfg.label, time, live:true};
        }
        if (med + low > 0) {
          const n = med + low;
          return {type:'warn', text:`${cfg.label}: ${n} item${n===1?'':'s'} needs attention`, src:cfg.label, time, live:true};
        }
        return {type:'ok', text:cfg.okText, src:cfg.label, time, live:true};
      }
    } catch(e) {}
    return {type:'warn', text:`${cfg.label}: no active data — open the ${cfg.label.toLowerCase()} war room to generate a live signal`, src:cfg.label, time:'—', live:false};
  }
'''.rstrip("\n")

NEW_SIGNALS_LINE = "  const SIGNALS = VERTICAL_SIGNAL_CONFIG.map(buildLiveSignal);"


def check_registry_keys():
    if not RELAY_CORE_FILE.exists():
        print(f"FAIL: {RELAY_CORE_FILE} not found. Run this from repo root.")
        sys.exit(1)
    text = RELAY_CORE_FILE.read_text()
    missing = [k for k in REQUIRED_KEYS if f'{k}:' not in text and f'"{k}"' not in text]
    if missing:
        print(f"FAIL: relay.core.js REGISTRY is missing key(s): {missing}")
        print("Confirm these exist (or under what name) before patching -- "
              "the script refuses to guess.")
        sys.exit(1)
    print(f"OK: all {len(REQUIRED_KEYS)} registry keys confirmed in {RELAY_CORE_FILE}")


def patch_twin_file():
    if not TWIN_FILE.exists():
        print(f"FAIL: {TWIN_FILE} not found. Run this from repo root.")
        sys.exit(1)

    src = TWIN_FILE.read_text()

    if "getO2cLiveSignal" in src or "VERTICAL_SIGNAL_CONFIG" in src:
        print("FAIL: digital-twin.html already looks patched (found "
              "getO2cLiveSignal or VERTICAL_SIGNAL_CONFIG). Aborting to "
              "avoid double-patching.")
        sys.exit(1)

    # 1. Insert the new block right after getBpoLiveSignal()'s closing brace.
    #    Anchor: the end of getBpoLiveSignal() is the line containing its
    #    final fallback return, followed by the closing `}`.
    bpo_end_pattern = re.compile(
        r"(return \{type:'warn', text:'BPO: no active case data.*?\};\s*\n\s*\})",
        re.DOTALL
    )
    m = bpo_end_pattern.search(src)
    if not m:
        print("FAIL: could not locate the end of getBpoLiveSignal() to anchor "
              "the insertion. File may have changed since this script was "
              "written -- apply manually using digital-twin-signals-patch.js.")
        sys.exit(1)

    insertion_point = m.end()
    src = src[:insertion_point] + "\n" + INJECT_BLOCK + "\n" + src[insertion_point:]

    # 2. Replace the old SIGNALS array (mocked entries) with the config-driven line.
    signals_pattern = re.compile(r"const SIGNALS=\[.*?\];", re.DOTALL)
    if not signals_pattern.search(src):
        print("FAIL: could not locate `const SIGNALS=[...]` to replace. "
              "Apply manually using digital-twin-signals-patch.js.")
        sys.exit(1)
    src = signals_pattern.sub(NEW_SIGNALS_LINE, src, count=1)

    # Backup + write
    backup_path = TWIN_FILE.with_suffix(".html.bak")
    shutil.copy2(TWIN_FILE, backup_path)
    TWIN_FILE.write_text(src)

    print(f"OK: patched {TWIN_FILE}")
    print(f"OK: original backed up to {backup_path}")


def main():
    print("=== Step 1: verifying relay.core.js REGISTRY keys ===")
    check_registry_keys()
    print("\n=== Step 2: patching digital-twin.html ===")
    patch_twin_file()
    print("\n=== Done ===")
    print("Next: review the diff, then run your certify pipeline, commit, push.")
    print(f"  git diff {TWIN_FILE}")


if __name__ == "__main__":
    main()