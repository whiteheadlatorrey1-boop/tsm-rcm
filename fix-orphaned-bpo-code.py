#!/usr/bin/env python3
import re
import sys
import shutil
from pathlib import Path

TWIN_FILE = Path("html/war-rooms/digital-twin/digital-twin.html")


def main():
    if not TWIN_FILE.exists():
        print(f"FAIL: {TWIN_FILE} not found. Run from repo root.")
        sys.exit(1)

    src = TWIN_FILE.read_text()

    if "evaluateBpo" not in src:
        print("FAIL: this doesn't look like the post-patch-2 file "
              "(no evaluateBpo found). Stop and check manually.")
        sys.exit(1)

    orig_len = len(src)

    orphan_pattern = re.compile(
        r"\n      if \(raw\) \{.*?"
        r"return \{type:'warn', text:'BPO: no active case data — "
        r"open bpo-war-room\.html to generate live signal', "
        r"src:'BPO', time:'—', live:false\};\n  \}\n",
        re.DOTALL
    )
    if not orphan_pattern.search(src):
        print("WARN: orphaned getBpoLiveSignal() leftover not found.")
    else:
        src = orphan_pattern.sub("\n", src, count=1)
        print("OK: removed orphaned getBpoLiveSignal() leftover")

    header_pattern = re.compile(
        r"\n// ============================================================\n"
        r"// PATCH 2 for html/war-rooms/digital-twin/digital-twin\.html\n"
        r".*?"
        r"\n// ============================================================\n",
        re.DOTALL
    )
    if not header_pattern.search(src):
        print("WARN: PATCH 2 comment header not found.")
    else:
        src = header_pattern.sub("\n", src, count=1)
        print("OK: removed embedded PATCH 2 instructional comment header")

    if len(src) == orig_len:
        print("\nNo changes made -- check manually:")
        print(f"  grep -n 'if (raw)' {TWIN_FILE}")
        print(f"  grep -n 'PATCH 2' {TWIN_FILE}")
        sys.exit(1)

    backup_path = TWIN_FILE.with_suffix(".html.bak3")
    shutil.copy2(TWIN_FILE, backup_path)
    TWIN_FILE.write_text(src)

    print(f"\nOK: wrote fixed {TWIN_FILE}")
    print(f"OK: pre-fix version backed up to {backup_path}")
    print("\nNext: verify with node --check, then git diff, then commit.")


if __name__ == "__main__":
    main()
