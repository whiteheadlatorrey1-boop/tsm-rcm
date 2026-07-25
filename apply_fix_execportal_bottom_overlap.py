#!/usr/bin/env python3
"""
Fixes the bottom-right overlap on bpo-executive-portal.html: the fixed
#tsm-chain-bar (32px, position:fixed;bottom:0) has zero body clearance
below it, so the last real content block -- .gov-panel (Governance +
WIP Measures, including the CROSS-UPLOAD MEMORY badge) -- sits directly
underneath it and gets visually clipped/overlapped at the bottom edge.

Fix: give .gov-panel enough bottom padding to clear the fixed bar.

Run from the repo root (contains html/war-rooms/bpo/bpo-executive-portal.html):
    python3 apply_fix_execportal_bottom_overlap.py
"""
import pathlib

TARGET = pathlib.Path("html/war-rooms/bpo/bpo-executive-portal.html")

OLD = ".gov-panel{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:18px 20px;margin:0 0 16px;}"
NEW = ".gov-panel{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:18px 20px;margin:0 0 16px;padding-bottom:56px;}"

def main():
    assert TARGET.exists(), f"Not found: {TARGET} (run this from the repo root)"
    text = TARGET.read_text()

    count = text.count(OLD)
    assert count == 1, f"Expected exactly 1 match, found {count} -- aborting, file may have changed"

    text = text.replace(OLD, NEW)
    TARGET.write_text(text)

    final = TARGET.read_text()
    assert final.count(NEW) == 1
    assert OLD not in final

    print(f"OK: patched {TARGET}")
    print("  .gov-panel now has 56px bottom padding, clearing the fixed 32px #tsm-chain-bar")

if __name__ == "__main__":
    main()