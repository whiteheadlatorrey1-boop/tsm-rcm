#!/usr/bin/env python3
"""
Real root cause of the bottom-right clipping on bpo-executive-portal.html:
two bars both claim bottom:0 --

  .action-bar     -- position:sticky;  bottom:0;  height:52px  (no z-index)
  #tsm-chain-bar  -- position:fixed;   bottom:0;  height:32px  z-index:9999

The fixed chain bar (z-index 9999) paints on top of the sticky action
bar's bottom 32px, clipping its right-aligned "MARK EXECUTED" button --
that's the artifact showing up in the bottom-right corner.

Fix: stick .action-bar 32px above the viewport bottom (bottom:32px)
so it sits flush above the chain bar instead of underneath it. The
earlier .gov-panel padding-bottom fix stays -- it's harmless and still
gives clearance above the action bar itself -- this is the piece that
was still missing.

Run from the repo root (contains html/war-rooms/bpo/bpo-executive-portal.html):
    python3 apply_fix_execportal_actionbar_overlap.py
"""
import pathlib

TARGET = pathlib.Path("html/war-rooms/bpo/bpo-executive-portal.html")

OLD = ".action-bar{height:52px;background:#020810;border-top:2px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:10px;position:sticky;bottom:0;}"
NEW = ".action-bar{height:52px;background:#020810;border-top:2px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:10px;position:sticky;bottom:32px;z-index:500;}"

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
    print("  .action-bar now sticks at bottom:32px (clears the fixed #tsm-chain-bar) with z-index:500")

if __name__ == "__main__":
    main()