#!/usr/bin/env python3
"""
Fix TSMMemory.detectSector() so supplier-vendor-situation-room.html and
logistics-situation-room.html resolve to the 'finops' sector instead of
falling through to the 'executive' default. Without this, anomalies
registered from those two rooms are invisible to RCM-OS (which reads
sector 'finops' from its own path).

Run from repo root:
    python3 apply_memory_sector_fix.py
"""
import pathlib
import sys

TARGET = pathlib.Path("html/shared/tsm-memory-engine.js")

OLD = '    if(path.includes("finops") || path.includes("financial")) return "finops";\n'
NEW = (
    '    if(path.includes("finops") || path.includes("financial") '
    '|| path.includes("supplier-vendor") || path.includes("logistics")) return "finops";\n'
)

def main():
    if not TARGET.exists():
        print(f"ERROR: {TARGET} not found. Run this from the repo root.")
        sys.exit(1)

    text = TARGET.read_text()

    count = text.count(OLD)
    assert count == 1, f"Expected exactly 1 occurrence of anchor line, found {count}"

    new_text = text.replace(OLD, NEW)
    assert new_text != text, "No change was made"
    assert new_text.count('path.includes("supplier-vendor")') == 1
    assert new_text.count('path.includes("logistics")') == 1

    TARGET.write_text(new_text)
    print(f"Patched {TARGET}")

if __name__ == "__main__":
    main()
