#!/usr/bin/env python3
"""
apply_fix_bpo_war_room_links.py

Fixes broken nav links pointing to /html/war-rooms/bpo/*.html
(a path that doesn't exist) so they point to the real location
/html/bpo/*.html.

Files patched:
  - html/tsm-doc-search-multi.html
  - html/war-rooms/war-room-prep.html

Usage:
  python3 apply_fix_bpo_war_room_links.py [--repo-root .]
"""
import argparse
import sys
from pathlib import Path

OLD = "/html/war-rooms/bpo/"
NEW = "/html/bpo/"

FILES = [
    "html/tsm-doc-search-multi.html",
    "html/war-rooms/war-room-prep.html",
]


def patch_file(path: Path) -> int:
    assert path.exists(), f"Missing expected file: {path}"
    text = path.read_text(encoding="utf-8")

    before_count = text.count(OLD)
    assert before_count > 0, f"No occurrences of '{OLD}' found in {path} — nothing to patch (already fixed, or path changed)."

    patched = text.replace(OLD, NEW)

    after_old = patched.count(OLD)
    assert after_old == 0, f"Replacement incomplete in {path}: {after_old} occurrences of '{OLD}' remain."

    after_new = patched.count(NEW)
    assert after_new >= before_count, f"Sanity check failed in {path}: expected at least {before_count} occurrences of '{NEW}', found {after_new}."

    path.write_text(patched, encoding="utf-8")
    return before_count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".", help="Path to repo root (default: current directory)")
    args = parser.parse_args()

    root = Path(args.repo_root).resolve()
    assert root.exists(), f"Repo root does not exist: {root}"

    total = 0
    for rel in FILES:
        path = root / rel
        n = patch_file(path)
        print(f"[OK] {rel}: replaced {n} occurrence(s) of '{OLD}' -> '{NEW}'")
        total += n

    print(f"\nDone. {total} total replacement(s) across {len(FILES)} file(s).")
    print("Next steps:")
    print("  1. Confirm no HTML parse regressions (grep for stray occurrences if needed)")
    print("  2. git diff to review")
    print("  3. git add + commit + push per usual workflow")


if __name__ == "__main__":
    main()