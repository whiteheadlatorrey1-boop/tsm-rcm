#!/usr/bin/env python3
"""
AI Widget Rollout - v3 (human-confirmed anchors)

Unlike v1/v2, this does NOT auto-detect anchors. Every anchor below was
confirmed by manual review of grep output for each file (see conversation
history / commit notes). The script's only remaining job is a safety
check: verify the anchor string appears EXACTLY ONCE in the file before
patching. If a file has changed since the anchor was confirmed (anchor
missing, or now appears more than once), it SKIPS rather than guessing.

BPO is intentionally excluded -- its autorun-engine.js is not adjacent to
tsm-runtime.js (three unexplained inline <script> blocks sit in between),
and that hasn't been reviewed yet. Do BPO manually / in a future round.

Nothing is committed by this script. Diff every PATCHED file before
trusting it:
    git diff -- <file>
"""

import os

WIDGET_FILENAME = "ai-widget.js"  # <-- confirm/adjust this before running

# Each entry: vertical name -> (file path, exact anchor tag text, widget dir)
# widget_dir is the directory the widget <script src="..."> should point at;
# adjust if the widget file lives somewhere else per vertical.
PATCH_PLAN = {
    "Insurance": (
        "html/war-rooms/insure-war/insurance-war-room.html",
        '<script src="/js/tsm-autorun-engine.js"></script>',
        "/js",
    ),
    "Legal": (
        "html/war-rooms/legal-war/legal-war-room.html",
        '<script src="/js/tsm-autorun-engine.js"></script>',
        "/js",
    ),
    "Real Estate": (
        "html/war-rooms/re-war/re-war-room.html",
        '<script src="/js/tsm-autorun-engine.js"></script>',
        "/js",
    ),
    "Construction": (
        "html/war-rooms/construct-war/construction-war-room.html",
        '<script src="/construction-suite/tsm-construction-analyzer.js"></script>',
        "/construction-suite",
    ),
    "Healthcare": (
        "html/war-rooms/health-war/hc-denial-war-room.html",
        '<script src="/html/healthcare/js/memory.engine.js"></script>',
        "/html/healthcare/js",
    ),
}

# BPO deliberately omitted -- needs manual anchor review first.
HELD_FOR_MANUAL_REVIEW = {
    "BPO": (
        "html/war-rooms/bpo-war/bpo-war-room.html",
        "autorun-engine.js (line ~1139) is not adjacent to tsm-runtime.js "
        "(line ~1209); three unexplained inline <script> blocks sit between "
        "them (~1140, ~1168, ~1192). Anchor not yet confirmed.",
    ),
}


def patch_file(vertical, path, anchor, widget_dir):
    if not os.path.exists(path):
        return ("SKIPPED", f"{path}: file not found")

    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    count = html.count(anchor)
    if count == 0:
        return ("SKIPPED", f"{path}: anchor not found -- file may have "
                            f"changed since this anchor was confirmed. "
                            f"Expected: {anchor!r}")
    if count > 1:
        return ("SKIPPED", f"{path}: anchor found {count} times -- no "
                            f"longer unique, refusing to guess which one. "
                            f"Expected: {anchor!r}")

    widget_tag = f'<script src="{widget_dir}/{WIDGET_FILENAME}"></script>'
    insertion = anchor + "\n" + widget_tag
    new_html = html.replace(anchor, insertion, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)

    return ("PATCHED", f"{path}: inserted '{widget_tag}' after anchor")


def main():
    results = []
    for vertical, (path, anchor, widget_dir) in PATCH_PLAN.items():
        status, detail = patch_file(vertical, path, anchor, widget_dir)
        results.append((status, vertical, detail))

    for vertical, (path, reason) in HELD_FOR_MANUAL_REVIEW.items():
        results.append(("HELD", vertical, f"{path}: {reason}"))

    print("=" * 70)
    print("AI WIDGET ROLLOUT RESULTS (v3 - confirmed anchors)")
    print("=" * 70)
    patched = sum(1 for s, _, _ in results if s == "PATCHED")
    skipped = sum(1 for s, _, _ in results if s == "SKIPPED")
    held = sum(1 for s, _, _ in results if s == "HELD")
    for status, vertical, detail in results:
        print(f"[{status}] {vertical}: {detail}")
    print("=" * 70)
    print(f"{patched} patched, {skipped} skipped, {held} held for manual review.")
    print("NOT committed. Run `git diff -- <file>` on every PATCHED file")
    print("before trusting it, then `node --check` if it's parsed as JS")
    print("anywhere, or just eyeball the HTML around the insertion point.")


if __name__ == "__main__":
    main()