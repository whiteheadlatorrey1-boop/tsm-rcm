#!/usr/bin/env python3
"""
Patch: add AI widget to BPO war room (final vertical in the rollout).

Context confirmed by manual inspection (not guessed):
  - tsm-autorun-engine.js at ~line 1139 is followed by three inline
    <script> blocks: an auto-run IIFE, a manual-paste-fallback UI, and
    an autonomy-standardization flag setter. None of them depend on or
    block script load order after tsm-autorun-engine.js -- confirmed by
    reading their actual contents.
  - Same anchor pattern as Insurance/Legal/RE: insert right after
    tsm-autorun-engine.js, since BPO uses the identical shared script path.

Safety check: anchor must match exactly once, or this skips and reports
why rather than guessing.
"""

import os

WIDGET_FILENAME = "ai-widget.js"  # <-- confirm matches what was used for the other 5

TARGET = "html/war-rooms/bpo-war/bpo-war-room.html"
ANCHOR = '<script src="/js/tsm-autorun-engine.js"></script>'
WIDGET_DIR = "/js"


def main():
    if not os.path.exists(TARGET):
        print(f"[SKIPPED] {TARGET}: file not found")
        return

    with open(TARGET, "r", encoding="utf-8") as f:
        html = f.read()

    count = html.count(ANCHOR)
    if count != 1:
        print(f"[SKIPPED] {TARGET}: anchor found {count} time(s), expected 1 -- refusing to guess.")
        return

    widget_tag = f'<script src="{WIDGET_DIR}/{WIDGET_FILENAME}"></script>'
    insertion = ANCHOR + "\n" + widget_tag
    new_html = html.replace(ANCHOR, insertion, 1)

    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(new_html)

    print(f"[PATCHED] {TARGET}: inserted '{widget_tag}' after tsm-autorun-engine.js")
    print("NOT committed. Run `git diff` on this file before trusting it.")


if __name__ == "__main__":
    main()