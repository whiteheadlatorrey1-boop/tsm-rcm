#!/usr/bin/env python3
"""
Fix: replace the incorrect 'ai-widget.js' placeholder path (which does not
exist anywhere in the repo) with the real, already-working shared widget:
    /html/shared/js/tsm-assistant-widget.js

Confirmed real and in production use via:
    grep -rn "tsm-assistant-widget.js" --include="*.html" .
    -> html/war-rooms/hotel-war/hotelops-war-room.html:641

That file already includes it successfully on main, unrelated to anything
patched this session -- so this is a known-good path, not another guess.

Each of the 6 files gets its broken tag replaced with the real one, only
if the broken tag is found exactly once. Otherwise: skip and report.
"""

import os

REAL_WIDGET_TAG = '<script src="/html/shared/js/tsm-assistant-widget.js"></script>'

# vertical -> (file path, the exact broken tag currently in that file)
FIXES = {
    "Insurance": (
        "html/war-rooms/insure-war/insurance-war-room.html",
        '<script src="/js/ai-widget.js"></script>',
    ),
    "Legal": (
        "html/war-rooms/legal-war/legal-war-room.html",
        '<script src="/js/ai-widget.js"></script>',
    ),
    "Real Estate": (
        "html/war-rooms/re-war/re-war-room.html",
        '<script src="/js/ai-widget.js"></script>',
    ),
    "Construction": (
        "html/war-rooms/construct-war/construction-war-room.html",
        '<script src="/construction-suite/ai-widget.js"></script>',
    ),
    "Healthcare": (
        "html/war-rooms/health-war/hc-denial-war-room.html",
        '<script src="/html/healthcare/js/ai-widget.js"></script>',
    ),
    "BPO": (
        "html/war-rooms/bpo-war/bpo-war-room.html",
        '<script src="/js/ai-widget.js"></script>',
    ),
}


def fix_file(vertical, path, broken_tag):
    if not os.path.exists(path):
        return ("SKIPPED", f"{path}: file not found")

    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    count = html.count(broken_tag)
    if count == 0:
        return ("SKIPPED", f"{path}: broken tag not found -- may already be fixed or changed")
    if count > 1:
        return ("SKIPPED", f"{path}: broken tag found {count} times -- refusing to guess which")

    new_html = html.replace(broken_tag, REAL_WIDGET_TAG, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)

    return ("FIXED", f"{path}: replaced broken '{broken_tag}' with real widget path")


def main():
    print("=" * 70)
    print("FIXING BROKEN WIDGET PATHS (ai-widget.js -> tsm-assistant-widget.js)")
    print("=" * 70)
    results = []
    for vertical, (path, broken_tag) in FIXES.items():
        status, detail = fix_file(vertical, path, broken_tag)
        results.append((status, vertical, detail))
        print(f"[{status}] {vertical}: {detail}")

    fixed = sum(1 for s, _, _ in results if s == "FIXED")
    skipped = sum(1 for s, _, _ in results if s == "SKIPPED")
    print("=" * 70)
    print(f"{fixed} fixed, {skipped} skipped.")
    print("NOT committed. Run `git diff` on each file before trusting it.")


if __name__ == "__main__":
    main()