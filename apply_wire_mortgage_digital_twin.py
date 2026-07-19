#!/usr/bin/env python3
"""
Wires MORTGAGE into the enterprise Digital Twin's live signal feed.

Confirmed against the real cloned repo (DevShon1976/TSM-Consultz, main):
- VERTICAL_SIGNAL_CONFIG (digital-twin.html) has 7 entries, no MORTGAGE.
- mortgage-war-room.html writes TSM.relay.write('MORTGAGE', payload) where
  payload = mortgage-engine.js's buildRelayPayload(): has `timestamp`
  (Date.now(), works as tsField) but NO `explain[]` array -- same situation
  as BPO, so it needs a custom evaluate() fn, not the default countBySeverity.
- Real fields available: payload.kpis = {open_loan_files, loans_over_sla,
  ctc_ready, pipeline_value, open_conditions, open_exceptions}.
- relay.core.js's RELAY_REGISTRY already has MORTGAGE: "TSM_MORTGAGE_RELAY"
  (correct, pre-existing) -- but digital-twin.html's local RELAY_STORAGE_KEYS
  fallback map (used only if window.TSM.relay isn't loaded) is missing it,
  so it's added too for defense-in-depth / consistency with the other 7.

Idempotent: safe to re-run.
"""
import re, sys

PATH = "html/war-rooms/digital-twin/digital-twin.html"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

orig = src

# 1) Add evaluateMortgage() function, right after evaluateBpo's closing brace.
EVAL_BPO_END = """      else c.low++;
    });
    return c;
  }
"""

EVAL_MORTGAGE = """      else c.low++;
    });
    return c;
  }

  // ── Mortgage's custom evaluator. mortgage-engine.js's buildRelayPayload()
  // has no `explain` array either; instead it carries kpis.{loans_over_sla,
  // open_exceptions, open_conditions} from computeKpis(). Exceptions are
  // compliance-stage items (regulatory risk) so they're weighted high;
  // SLA-breached loans are med; open conditions (routine underwriting
  // items still outstanding) are low. Same {high,med,low} contract as
  // countBySeverity() / evaluateBpo().
  function evaluateMortgage(raw) {
    const k = raw.kpis || {};
    return {
      high: k.open_exceptions || 0,
      med: k.loans_over_sla || 0,
      low: k.open_conditions || 0
    };
  }
"""

if "function evaluateMortgage(raw)" in src:
    print("evaluateMortgage already present -- skipping insert")
else:
    assert EVAL_BPO_END in src, "evaluateBpo() body not found in expected shape -- aborting"
    src = src.replace(EVAL_BPO_END, EVAL_MORTGAGE, 1)

# 2) Add MORTGAGE to RELAY_STORAGE_KEYS fallback map.
if "MORTGAGE: 'TSM_MORTGAGE_RELAY'" in src:
    print("RELAY_STORAGE_KEYS.MORTGAGE already present -- skipping insert")
else:
    STORAGE_KEYS_LINE = "    INTEGRATION: 'TSM_INTEGRATION_HUB_RELAY' // fixed: was 'TSM_INTEGRATION_RELAY'\n  };"
    assert STORAGE_KEYS_LINE in src, "RELAY_STORAGE_KEYS closing not found in expected shape -- aborting"
    STORAGE_KEYS_NEW = "    INTEGRATION: 'TSM_INTEGRATION_HUB_RELAY', // fixed: was 'TSM_INTEGRATION_RELAY'\n    MORTGAGE: 'TSM_MORTGAGE_RELAY' // matches relay.core.js RELAY_REGISTRY\n  };"
    src = src.replace(STORAGE_KEYS_LINE, STORAGE_KEYS_NEW, 1)

# 3) Add MORTGAGE entry to VERTICAL_SIGNAL_CONFIG array.
if "key: 'MORTGAGE'" in src:
    print("VERTICAL_SIGNAL_CONFIG MORTGAGE entry already present -- skipping insert")
else:
    CONFIG_END = "{ key: 'INTEGRATION', label: 'INTEGRATION', tsField: 'timestamp',   okText: 'Integration Hub: systems and queues nominal' }\n  ];"
    assert CONFIG_END in src, "VERTICAL_SIGNAL_CONFIG closing not found in expected shape -- aborting"
    CONFIG_NEW = ("{ key: 'INTEGRATION', label: 'INTEGRATION', tsField: 'timestamp',   okText: 'Integration Hub: systems and queues nominal' },\n"
                  "    { key: 'MORTGAGE',    label: 'MORTGAGE',    tsField: 'timestamp',   okText: 'Mortgage: pipeline healthy \u2014 no exceptions or SLA breaches', evaluate: evaluateMortgage }\n"
                  "  ];")
    src = src.replace(CONFIG_END, CONFIG_NEW, 1)

if src == orig:
    print(f"{PATH}: no changes needed (already applied).")
else:
    with open(PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print("Patched", PATH)

# ── Two unrelated pre-existing nav bugs surfaced by demo-certify.sh's
# check-navigation step during this session's verification run (not
# regressions from the Mortgage/digital-twin change above, but fixed in
# the same pass at Latorrey's direction before committing).

# Bug 2: war-room-prep.html links to /html/bpo/bpo-*.html (10 occurrences),
# which has never existed in this checkout. The real, live location
# (confirmed via check-pages/check-navigation PASS results elsewhere in
# this file, and via `ls html/war-rooms/bpo/`) is /html/war-rooms/bpo/.
PATH2 = "html/war-rooms/war-room-prep.html"
with open(PATH2, "r", encoding="utf-8") as f:
    src2 = f.read()
orig2 = src2

BAD_BPO = "/html/bpo/bpo-"
GOOD_BPO = "/html/war-rooms/bpo/bpo-"
count = src2.count(BAD_BPO)
if count == 0:
    print(f"{PATH2}: no '{BAD_BPO}' occurrences found -- already fixed or shape changed, skipping")
else:
    src2 = src2.replace(BAD_BPO, GOOD_BPO)
    print(f"{PATH2}: replaced {count} occurrence(s) of '{BAD_BPO}' -> '{GOOD_BPO}'")

if src2 != orig2:
    with open(PATH2, "w", encoding="utf-8") as f:
        f.write(src2)
    print("Patched", PATH2)

# Bug 3: music-command/cadence-builder.html's "Dashboard" back-link uses
# "../index.html" (subdirectory-relative), but cadence-builder.html sits
# in the SAME directory as index.html (confirmed via `ls html/music-command/`
# and comparing against sibling analytics.html, which correctly uses
# "index.html"). The subdirectory pages (e.g. release/release-center.html)
# correctly use "../index.html" -- that pattern doesn't apply here.
PATH3 = "html/music-command/cadence-builder.html"
with open(PATH3, "r", encoding="utf-8") as f:
    src3 = f.read()
orig3 = src3

BAD_LINK = 'class="back" href="../index.html"'
GOOD_LINK = 'class="back" href="index.html"'
if GOOD_LINK in src3:
    print(f"{PATH3}: already fixed, skipping")
elif BAD_LINK not in src3:
    print(f"{PATH3}: expected back-link string not found -- shape may have changed, skipping (manual check needed)")
else:
    src3 = src3.replace(BAD_LINK, GOOD_LINK, 1)
    with open(PATH3, "w", encoding="utf-8") as f:
        f.write(src3)
    print("Patched", PATH3)