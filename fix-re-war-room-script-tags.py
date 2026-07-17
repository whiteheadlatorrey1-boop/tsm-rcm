#!/usr/bin/env python3
import sys
import shutil
from pathlib import Path

TARGET = Path("html/reo-pro/re-war-room.html")

FIXES = [
    (
        "Insert <script> before DOC SEARCH relay reader block (~line 2994)",
        "\n// ── DOC SEARCH → WAR ROOM RELAY READER ──────────────────\n(function(){",
        "\n<script>\n// ── DOC SEARCH → WAR ROOM RELAY READER ──────────────────\n(function(){",
    ),
    (
        "Insert <script> before TOUR SLIDES block (~line 3487)",
        "\n    /* ════════════════════════════════════════\n       RE WAR ROOM — TOUR SLIDES (single copy)\n    ════════════════════════════════════════ */\n    const TOUR_SLIDES = [",
        "\n    <script>\n    /* ════════════════════════════════════════\n       RE WAR ROOM — TOUR SLIDES (single copy)\n    ════════════════════════════════════════ */\n    const TOUR_SLIDES = [",
    ),
    (
        "Insert <script> before RIGHT PANEL DOC UPLOAD block (~line 3627)",
        "\n    // ——— RIGHT PANEL DOC UPLOAD\ndocument.getElementById('rpFileInput')",
        "\n    <script>\n    // ——— RIGHT PANEL DOC UPLOAD\ndocument.getElementById('rpFileInput')",
    ),
    (
        "Remove stray mid-stream </script> before FORMAT OUTPUT (~line 3685)",
        "  </script>\n\n// ——— FORMAT OUTPUT\n    (function hideMissionGuide(){",
        "\n\n// ——— FORMAT OUTPUT\n    (function hideMissionGuide(){",
    ),
    (
        "Insert <script> before TSM_AUTONOMY_STANDARDIZED block (~line 3727)",
        "\n// ===== TSM_AUTONOMY_STANDARDIZED =====\nwindow.TSM_AUTONOMY_STANDARDIZED = true;",
        "\n<script>\n// ===== TSM_AUTONOMY_STANDARDIZED =====\nwindow.TSM_AUTONOMY_STANDARDIZED = true;",
    ),
    (
        "Insert <script> before TSM WAR ROOM SCOPED RELAY FIX block (~line 3737)",
        '\n// ===== TSM WAR ROOM SCOPED RELAY FIX =====\nwindow.tsmMission = window.tsmMission || {',
        '\n<script>\n// ===== TSM WAR ROOM SCOPED RELAY FIX =====\nwindow.tsmMission = window.tsmMission || {',
    ),
]

def main():
    if not TARGET.exists():
        print(f"FAIL: {TARGET} not found. Run from repo root.")
        sys.exit(1)
    src = TARGET.read_text()
    original = src
    for desc, old, new in FIXES:
        count = src.count(old)
        if count != 1:
            print(f"FAIL: anchor for \"{desc}\" matched {count} times (expected 1). Aborting.")
            print(f"  Anchor was: {old!r}")
            sys.exit(1)
    for desc, old, new in FIXES:
        src = src.replace(old, new, 1)
        print(f"OK: {desc}")
    if src == original:
        print("\nNo changes made -- aborting.")
        sys.exit(1)
    backup_path = TARGET.with_suffix(".html.bak")
    shutil.copy2(TARGET, backup_path)
    TARGET.write_text(src)
    print(f"\nOK: wrote fixed {TARGET}")
    print(f"OK: backed up to {backup_path}")

if __name__ == "__main__":
    main()
