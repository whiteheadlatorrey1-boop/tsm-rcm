#!/usr/bin/env python3
"""
Fixes 3 recurring corruption patterns causing 'Skipped block' warnings in build.js.
Run from html/ directory: python3 fix-build-corruption.py [--dry-run]

Pattern 1 (21 files): raw newline broke a string literal in the TSM NEURAL
  chat-response snippet -> real SyntaxError in the browser too, not just the obfuscator.
Pattern 2 (10 files, 13 occurrences): 'fetch(' was stripped, leaving a dangling
  identifier 'runHCNodeAI' where a URL string belongs.
Pattern 3 (20 files): missing '</script>' after the TSM_BRIDGE const line, causing
  the regex-based obfuscator (and any strict parser) to swallow the next <script> tag
  as literal text.
"""
import re
import sys
from pathlib import Path

DRY_RUN = "--dry-run" in sys.argv
ROOT = Path(__file__).parent

# ---- Pattern 1 ----
P1_OLD = "'> TSM NEURAL [' + new Date().toLocaleTimeString() + ']\n\n' +"
P1_NEW = "'> TSM NEURAL [' + new Date().toLocaleTimeString() + ']\\n\\n' +"

# ---- Pattern 2 ----
P2_OLD = "const res = await runHCNodeAI, {"
P2_NEW = "const res = await fetch('/api/hc/query', {"

# ---- Pattern 3 ----
P3_OLD = "<script>const TSM_BRIDGE = 'https://tsm-shell.fly.dev';\n<script>"
P3_NEW = "<script>const TSM_BRIDGE = 'https://tsm-shell.fly.dev';</script>\n<script>"

PATTERNS = [
    ("Pattern 1 (unterminated string)", P1_OLD, P1_NEW),
    ("Pattern 2 (missing fetch wrapper)", P2_OLD, P2_NEW),
    ("Pattern 3 (missing </script>)", P3_OLD, P3_NEW),
]

def main():
    total_files = 0
    total_fixes = 0
    for path in ROOT.rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        original = text
        file_fixes = 0
        for label, old, new in PATTERNS:
            count = text.count(old)
            if count:
                text = text.replace(old, new)
                file_fixes += count
                print(f"  {label}: {count}x in {path.relative_to(ROOT)}")
        if file_fixes:
            total_files += 1
            total_fixes += file_fixes
            if not DRY_RUN:
                path.write_text(text, encoding="utf-8")

    print(f"\n{'[DRY RUN] ' if DRY_RUN else ''}Fixed {total_fixes} occurrences across {total_files} files.")

if __name__ == "__main__":
    main()