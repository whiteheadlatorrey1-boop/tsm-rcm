#!/usr/bin/env python3
"""
Wire real TSM_STRAT_CONFIRMED_construction / TSM_EXEC_CONFIRMED_construction
writes into Construction's ALREADY-WORKING strategist->exec handoff, and
delete the dead Convention B/C functions that were never called.

Scope: Construction only (proof vertical). Repeat pattern per-vertical after
this is verified live, same as the Mission Core rollout.

Run from repo root: python3 apply_wire_exec_confirm_construction.py
"""
import re

REPO = "."

def patch_file(path, replacements, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new, desc in replacements:
        count = content.count(old)
        assert count == 1, f"[{label}] expected exactly 1 match for {desc!r}, found {count}"
        content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[{label}] OK — {len(replacements)} patch(es) applied to {path}")


# ─────────────────────────────────────────────────────────────────────────
# 1. STRATEGIST: write TSM_STRAT_CONFIRMED_construction inside the already-
#    working storeStrategistRelay(), right after its existing real writes.
#    Delete the dead tsmWriteScopedStrat() function (never called anywhere).
# ─────────────────────────────────────────────────────────────────────────
strategist_path = f"{REPO}/html/construction-suite/construction-strategist.html"

strategist_replacements = [
    (
        "    sessionStorage.setItem('TSM_CONSTRUCTION_STRATEGIST_RELAY', JSON.stringify(payload));\n"
        "    localStorage.setItem('tsm_construction_strategist_output', JSON.stringify(payload));\n"
        "  } catch(e) { console.warn('Store error:', e); }",

        "    sessionStorage.setItem('TSM_CONSTRUCTION_STRATEGIST_RELAY', JSON.stringify(payload));\n"
        "    localStorage.setItem('tsm_construction_strategist_output', JSON.stringify(payload));\n"
        "    // Real strategist-confirmed signal (Convention A shape) — read by\n"
        "    // tsm-demo-runner.js AUTO-RUN and core/tsm-enforcer.js health audit.\n"
        "    localStorage.setItem('TSM_STRAT_CONFIRMED_construction', JSON.stringify({\n"
        "      vertical: 'construction',\n"
        "      timestamp: Date.now()\n"
        "    }));\n"
        "  } catch(e) { console.warn('Store error:', e); }",

        "storeStrategistRelay's real storage writes (Convention A insertion point)",
    ),
]

# Dead function to remove — defined at ~line 1466 in the original, never
# called anywhere in the repo (confirmed via repo-wide grep before writing
# this script).
dead_strat_fn = (
    "function tsmWriteScopedStrat(vertical, missionId){\n"
    "  localStorage.setItem(\"TSM_STRAT_CONFIRMED_construction-suite_\" + vertical, JSON.stringify({\n"
    "    vertical,\n"
    "    missionId,\n"
    "    timestamp: Date.now()\n"
    "  }));\n"
    "}"
)

with open(strategist_path, "r", encoding="utf-8") as f:
    _content = f.read()
_dead_count = _content.count(dead_strat_fn)
assert _dead_count == 1, f"expected exactly 1 dead tsmWriteScopedStrat block, found {_dead_count}"

patch_file(strategist_path, strategist_replacements, "STRATEGIST")

with open(strategist_path, "r", encoding="utf-8") as f:
    _content = f.read()
_content = _content.replace(
    dead_strat_fn,
    "// tsmWriteScopedStrat() removed — dead code, never called anywhere in the\n"
    "// repo (Convention C). Real STRAT_CONFIRMED write now lives inline in\n"
    "// storeStrategistRelay() above.",
    1,
)
with open(strategist_path, "w", encoding="utf-8") as f:
    f.write(_content)
print("[STRATEGIST] OK — dead tsmWriteScopedStrat() removed")


# ─────────────────────────────────────────────────────────────────────────
# 2. EXEC PORTAL: give the real AUTHORIZE button an id + working click
#    handler that writes TSM_EXEC_CONFIRMED_construction. Reuses the
#    existing (previously dead) EXECUTIVE_APPROVED bus wiring for free by
#    adding data-action="approve", since that listener already exists and
#    already has a real consumer (tsm-event-bus.js audit log) — it was just
#    never attached to anything. Delete the dead tsmWriteScopedExec().
# ─────────────────────────────────────────────────────────────────────────
exec_path = f"{REPO}/html/construction-suite/construction-executive-portal.html"

exec_replacements = [
    (
        '      <button class="decision-action">AUTHORIZE</button>',
        '      <button class="decision-action" id="d1-authorize-btn" '
        'data-action="approve" onclick="tsmConfirmExec()">AUTHORIZE</button>',
        "static AUTHORIZE button (the only decision-row button with no onclick)",
    ),
]

dead_exec_fn = (
    "function tsmWriteScopedExec(vertical, missionId){\n"
    "  localStorage.setItem(\"TSM_EXEC_CONFIRMED_construction-suite_\" + vertical, JSON.stringify({\n"
    "    vertical,\n"
    "    missionId,\n"
    "    timestamp: Date.now()\n"
    "  }));\n"
    "}"
)

with open(exec_path, "r", encoding="utf-8") as f:
    _content = f.read()
_dead_count = _content.count(dead_exec_fn)
assert _dead_count == 1, f"expected exactly 1 dead tsmWriteScopedExec block, found {_dead_count}"

patch_file(exec_path, exec_replacements, "EXEC PORTAL")

with open(exec_path, "r", encoding="utf-8") as f:
    _content = f.read()
_content = _content.replace(
    dead_exec_fn,
    "function tsmConfirmExec(){\n"
    "  // Real EXEC_CONFIRMED write (Convention A shape) — read by\n"
    "  // tsm-demo-runner.js AUTO-RUN and core/tsm-enforcer.js health audit.\n"
    "  // Previously this button had no click handler at all; nothing ever\n"
    "  // set TSM_EXEC_CONFIRMED_* for any vertical through any code path.\n"
    "  localStorage.setItem(\"TSM_EXEC_CONFIRMED_construction\", JSON.stringify({\n"
    "    vertical: \"construction\",\n"
    "    timestamp: Date.now()\n"
    "  }));\n"
    "  var btn = document.getElementById(\"d1-authorize-btn\");\n"
    "  if (btn) { btn.textContent = \"AUTHORIZED \\u2713\"; btn.disabled = true; }\n"
    "}",
    1,
)
with open(exec_path, "w", encoding="utf-8") as f:
    f.write(_content)
print("[EXEC PORTAL] OK — dead tsmWriteScopedExec() replaced with working tsmConfirmExec()")

print("\nAll patches applied successfully.")