#!/usr/bin/env python3
P1_OLD = "'> TSM NEURAL [' + new Date().toLocaleTimeString() + ']\n\n' +"
P1_NEW = "'> TSM NEURAL [' + new Date().toLocaleTimeString() + ']\\n\\n' +"
P2_OLD = "const res = await runHCNodeAI, {"
P2_NEW = "const res = await fetch('/api/hc/query', {"
P3_OLD = "<script>const TSM_BRIDGE = 'https://tsm-shell.fly.dev';\n<script>"
P3_NEW = "<script>const TSM_BRIDGE = 'https://tsm-shell.fly.dev';</script>\n<script>"
import sys
from pathlib import Path
DRY_RUN = "--dry-run" in sys.argv
ROOT = Path(__file__).parent
PATTERNS = [(P1_OLD,P1_NEW),(P2_OLD,P2_NEW),(P3_OLD,P3_NEW)]
tf, tx = 0, 0
for path in ROOT.rglob("*.html"):
    text = path.read_text(encoding="utf-8")
    ff = 0
    for old, new in PATTERNS:
        c = text.count(old)
        if c: text = text.replace(old, new); ff += c
    if ff:
        tf += 1; tx += ff
        if not DRY_RUN: path.write_text(text, encoding="utf-8")
print(f"{'[DRY RUN] ' if DRY_RUN else ''}Fixed {tx} occurrences across {tf} files.")
