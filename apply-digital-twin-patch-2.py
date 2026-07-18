#!/usr/bin/env python3
"""
Patch 2 for html/war-rooms/digital-twin/digital-twin.html

Replaces the block installed by patch 1 (countBySeverity through
`const SIGNALS = VERTICAL_SIGNAL_CONFIG.map(buildLiveSignal);`) with an
extended version that folds BPO into the config array via a custom
evaluate() override, and fixes the wrong INTEGRATION storage key.

Also deletes the now-dead getBpoLiveSignal() function entirely.

Run from repo root:
  python3 apply-digital-twin-patch-2.py
"""

import re
import sys
import shutil
from pathlib import Path

TWIN_FILE = Path("html/war-rooms/digital-twin/digital-twin.html")

NEW_BLOCK = Path("digital-twin-patch-2-bpo-and-fixes.js").read_text().strip("\n")


def main():
    if not TWIN_FILE.exists():
        print(f"FAIL: {TWIN_FILE} not found. Run from repo root.")
        sys.exit(1)

    src = TWIN_FILE.read_text()

    if "evaluateBpo" in src:
        print("FAIL: file already looks like patch 2 was applied "
              "(found evaluateBpo). Aborting to avoid double-patching.")
        sys.exit(1)

    if "VERTICAL_SIGNAL_CONFIG" not in src:
        print("FAIL: patch 1 doesn't look applied yet (no "
              "VERTICAL_SIGNAL_CONFIG found). Run apply-digital-twin-patch.py "
              "first.")
        sys.exit(1)

    # 1. Remove the old getBpoLiveSignal() function entirely -- it's dead
    #    code once BPO moves into the config array.
    bpo_fn_pattern = re.compile(
        r"\s*// ── LIVE BPO SIGNAL:.*?\n\s*function getBpoLiveSignal\(\)\{.*?\n\s*\}\n",
        re.DOTALL
    )
    if not bpo_fn_pattern.search(src):
        print("FAIL: could not locate getBpoLiveSignal() to remove. "
              "Apply digital-twin-patch-2-bpo-and-fixes.js manually.")
        sys.exit(1)
    src = bpo_fn_pattern.sub("\n", src, count=1)

    # 2. Replace the patch-1 block (countBySeverity ... SIGNALS = ...map...)
    #    with the new extended block.
    block_pattern = re.compile(
        r"  // ── Shared severity tally.*?const SIGNALS = VERTICAL_SIGNAL_CONFIG\.map\(buildLiveSignal\);\n",
        re.DOTALL
    )
    if not block_pattern.search(src):
        print("FAIL: could not locate patch-1 block to replace. "
              "Apply digital-twin-patch-2-bpo-and-fixes.js manually.")
        sys.exit(1)
    src = block_pattern.sub(NEW_BLOCK + "\n", src, count=1)

    backup_path = TWIN_FILE.with_suffix(".html.bak2")
    shutil.copy2(TWIN_FILE, backup_path)
    TWIN_FILE.write_text(src)

    print(f"OK: patched {TWIN_FILE}")
    print(f"OK: original backed up to {backup_path}")
    print("\nNext: git diff, verify, rm the .bak2 file, add, commit.")


if __name__ == "__main__":
    main()