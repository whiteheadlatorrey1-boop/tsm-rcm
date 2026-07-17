#!/usr/bin/env python3
"""
Adds Honeywell Plant/Cyber/Supplier-Shutdown as 3 distinct live signals in
Digital Twin. Currently all 3 source pages write to the SAME relay key
(TSM_HONEYWELL_RELAY), so they silently overwrite each other -- this gives
each its own key, registers each in relay.core.js's RELAY_REGISTRY, and
adds 3 new rows to Digital Twin's VERTICAL_SIGNAL_CONFIG.

ASSUMPTION FLAGGED FOR REVIEW: supplier-shutdown's exposure-dollar
tiering thresholds ($500K=high, $100K=med) are NOT derived from the
source code -- there's no defined threshold there. These are reasonable
guesses; adjust HONEYWELL_SUPPLIER_HIGH_THRESHOLD /
HONEYWELL_SUPPLIER_MED_THRESHOLD below if you have real numbers in mind.

Run from repo root:
  python3 fix-honeywell-three-incidents.py
"""

import sys
import shutil
from pathlib import Path

FILES = {
    "plant": {
        "path": Path("html/plant-incident.html"),
        "old_key": "const RELAY_KEY = 'TSM_HONEYWELL_RELAY';",
        "new_key": "const RELAY_KEY = 'TSM_HONEYWELL_PLANT_RELAY';",
    },
    "cyber": {
        "path": Path("html/cyber-incident.html"),
        "old_key": "const RELAY_KEY = 'TSM_HONEYWELL_RELAY';",
        "new_key": "const RELAY_KEY = 'TSM_HONEYWELL_CYBER_RELAY';",
    },
    "supplier": {
        "path": Path("html/supplier-shutdown.html"),
        "old_key": "const RELAY_KEY = 'TSM_HONEYWELL_RELAY';",
        "new_key": "const RELAY_KEY = 'TSM_HONEYWELL_SUPPLIER_RELAY';",
    },
}

RELAY_CORE = Path("html/war-rooms/_relay_control_plane/relay.core.js")
REGISTRY_OLD_ANCHOR = '    HONEYWELL: "TSM_HONEYWELL_RELAY",'
REGISTRY_NEW_ANCHOR = (
    '    HONEYWELL_PLANT: "TSM_HONEYWELL_PLANT_RELAY",\n'
    '    HONEYWELL_CYBER: "TSM_HONEYWELL_CYBER_RELAY",\n'
    '    HONEYWELL_SUPPLIER: "TSM_HONEYWELL_SUPPLIER_RELAY",'
)

TWIN_FILE = Path("html/war-rooms/digital-twin/digital-twin.html")

TWIN_OLD_ANCHOR = "  const SIGNALS = VERTICAL_SIGNAL_CONFIG.map(buildLiveSignal);"
TWIN_NEW_BLOCK = '''  // ── Honeywell risk-score evaluator (plant + cyber share this shape):
  // kpis.risk.riskScore is a 0-100 number when AI parsing succeeds;
  // otherwise kpis.risk.raw holds a string fallback from regex parsing.
  function evaluateHoneywellRisk(raw) {
    const c = { high: 0, med: 0, low: 0 };
    const risk = raw.kpis && raw.kpis.risk;
    if (!risk) return c;
    let score = typeof risk.riskScore === 'number' ? risk.riskScore : null;
    if (score === null && risk.raw) score = parseInt(risk.raw, 10);
    if (score === null || isNaN(score)) return c;
    if (score >= 70) c.high = 1;
    else if (score >= 40) c.med = 1;
    else c.low = 1;
    return c;
  }

  // ── Honeywell supplier-shutdown exposure evaluator. Dollar thresholds
  // below are NOT derived from source -- no defined threshold exists in
  // supplier-shutdown.html. Adjust these two constants if you have real
  // business thresholds in mind.
  const HONEYWELL_SUPPLIER_HIGH_THRESHOLD = 500000;
  const HONEYWELL_SUPPLIER_MED_THRESHOLD = 100000;
  function evaluateHoneywellSupplier(raw) {
    const c = { high: 0, med: 0, low: 0 };
    const exposure = raw.kpis && raw.kpis.exposure;
    if (!exposure) return c;
    let amount = null;
    if (typeof exposure.totalExposureHigh === 'number') amount = exposure.totalExposureHigh;
    else if (typeof exposure.totalExposureLow === 'number') amount = exposure.totalExposureLow;
    else if (exposure.raw) {
      const m = String(exposure.raw).replace(/[^0-9.]/g, '');
      amount = m ? parseFloat(m) : null;
    }
    if (amount === null || isNaN(amount)) return c;
    if (amount >= HONEYWELL_SUPPLIER_HIGH_THRESHOLD) c.high = 1;
    else if (amount >= HONEYWELL_SUPPLIER_MED_THRESHOLD) c.med = 1;
    else c.low = 1;
    return c;
  }

  const SIGNALS = VERTICAL_SIGNAL_CONFIG.concat([
    { key: 'HONEYWELL_PLANT', label: 'HONEYWELL PLANT', tsField: 'timestamp',
      okText: 'Honeywell Plant: no active incident — risk within normal range',
      evaluate: evaluateHoneywellRisk },
    { key: 'HONEYWELL_CYBER', label: 'HONEYWELL CYBER', tsField: 'timestamp',
      okText: 'Honeywell Cyber: no active incident — risk within normal range',
      evaluate: evaluateHoneywellRisk },
    { key: 'HONEYWELL_SUPPLIER', label: 'HONEYWELL SUPPLIER', tsField: 'timestamp',
      okText: 'Honeywell Supplier: no active shutdown — exposure within normal range',
      evaluate: evaluateHoneywellSupplier },
  ]).map(buildLiveSignal);'''

TWIN_STORAGE_KEYS_OLD = "    INTEGRATION: 'TSM_INTEGRATION_HUB_RELAY' // fixed: was 'TSM_INTEGRATION_RELAY'\n  };"
TWIN_STORAGE_KEYS_NEW = (
    "    INTEGRATION: 'TSM_INTEGRATION_HUB_RELAY', // fixed: was 'TSM_INTEGRATION_RELAY'\n"
    "    HONEYWELL_PLANT: 'TSM_HONEYWELL_PLANT_RELAY',\n"
    "    HONEYWELL_CYBER: 'TSM_HONEYWELL_CYBER_RELAY',\n"
    "    HONEYWELL_SUPPLIER: 'TSM_HONEYWELL_SUPPLIER_RELAY'\n"
    "  };"
)


def fix_source_file(name, info):
    path = info["path"]
    if not path.exists():
        print(f"FAIL: {path} not found.")
        return False
    src = path.read_text()
    count = src.count(info["old_key"])
    if count != 1:
        print(f"FAIL: {name} -- anchor matched {count} times (expected 1) in {path}")
        return False
    backup = path.with_suffix(".html.bak")
    shutil.copy2(path, backup)
    src = src.replace(info["old_key"], info["new_key"], 1)
    path.write_text(src)
    print(f"OK: {name} -- {path} relay key updated, backup at {backup}")
    return True


def fix_relay_registry():
    if not RELAY_CORE.exists():
        print(f"FAIL: {RELAY_CORE} not found.")
        return False
    src = RELAY_CORE.read_text()
    count = src.count(REGISTRY_OLD_ANCHOR)
    if count != 1:
        print(f"FAIL: RELAY_REGISTRY anchor matched {count} times (expected 1)")
        return False
    backup = RELAY_CORE.with_suffix(".js.bak")
    shutil.copy2(RELAY_CORE, backup)
    src = src.replace(REGISTRY_OLD_ANCHOR, REGISTRY_NEW_ANCHOR, 1)
    RELAY_CORE.write_text(src)
    print(f"OK: relay.core.js RELAY_REGISTRY updated, backup at {backup}")
    return True


def fix_digital_twin():
    if not TWIN_FILE.exists():
        print(f"FAIL: {TWIN_FILE} not found.")
        return False
    src = TWIN_FILE.read_text()

    count_storage = src.count(TWIN_STORAGE_KEYS_OLD)
    count_signals = src.count(TWIN_OLD_ANCHOR)
    if count_storage != 1:
        print(f"FAIL: RELAY_STORAGE_KEYS anchor matched {count_storage} times (expected 1)")
        return False
    if count_signals != 1:
        print(f"FAIL: SIGNALS anchor matched {count_signals} times (expected 1)")
        return False

    backup = TWIN_FILE.with_suffix(".html.bak")
    shutil.copy2(TWIN_FILE, backup)

    src = src.replace(TWIN_STORAGE_KEYS_OLD, TWIN_STORAGE_KEYS_NEW, 1)
    src = src.replace(TWIN_OLD_ANCHOR, TWIN_NEW_BLOCK, 1)

    TWIN_FILE.write_text(src)
    print(f"OK: digital-twin.html updated (storage keys + 3 new signal rows), backup at {backup}")
    return True


def main():
    print("=== Step 1: renaming RELAY_KEY in 3 source files ===")
    ok = True
    for name, info in FILES.items():
        ok = fix_source_file(name, info) and ok
    if not ok:
        print("\nFAIL: one or more source-file fixes failed. Aborting before "
              "touching relay.core.js or digital-twin.html.")
        sys.exit(1)

    print("\n=== Step 2: adding 3 entries to relay.core.js RELAY_REGISTRY ===")
    if not fix_relay_registry():
        print("\nFAIL: registry fix failed. Source files were already changed -- "
              "you may want to git checkout them before retrying.")
        sys.exit(1)

    print("\n=== Step 3: adding 3 signal rows to digital-twin.html ===")
    if not fix_digital_twin():
        print("\nFAIL: Digital Twin fix failed. Earlier steps already applied -- "
              "review git diff carefully before deciding whether to revert.")
        sys.exit(1)

    print("\n=== Done ===")
    print("Next: verify each file (node --check on digital-twin.html's script,")
    print("load pages in browser), then git diff each file, then commit.")
    print("\nREMINDER: supplier exposure thresholds ($500K/$100K) are guesses,")
    print("not derived from source -- adjust in digital-twin.html if needed")
    print("before committing.")


if __name__ == "__main__":
    main()