#!/usr/bin/env python3
"""
One-shot, idempotent apply script for the Healthcare/Honeywell e2e path fix.
Run from repo root: python3 apply_hc_honeywell_fix.py
"""
import subprocess
import sys

PATH = "tests/e2e/tsm-platform.spec.js"

OLD_HC = '''{
name:"Healthcare",
pages:[
"/html/war-rooms/healthcare/hc-war-room.html",
"/html/war-rooms/healthcare/hc-strategist.html",
"/html/war-rooms/healthcare/hc-executive-portal.html"
]
},'''

NEW_HC = '''{
name:"Healthcare",
pages:[
"/html/healthcare/hc-denial-war-room.html",
"/html/healthcare/hc-main-strategist.html",
"/html/healthcare/executive-portal.html"
]
},'''

OLD_TAIL = '''{
name:"Sweet OS",
url:"/html/sweet-os/index.html"
},

{
name:"Honeywell Demo",
url:"/html/demo/honeywell-demo.html"
}'''

NEW_TAIL = '''{
name:"Honeywell Demo",
url:"/html/TSM_Shell_Honeywell_TalkTrack_30min.html"
}'''

ALREADY_APPLIED_MARKER = '"/html/healthcare/hc-denial-war-room.html"'

def main():
    with open(PATH, "r") as f:
        content = f.read()

    if ALREADY_APPLIED_MARKER in content:
        print(f"[skip] {PATH} already patched — nothing to do.")
        return

    assert OLD_HC in content, (
        f"Healthcare block not found verbatim in {PATH}. "
        "File has likely drifted since this script was written — check manually."
    )
    assert OLD_TAIL in content, (
        f"Sweet OS/Honeywell block not found verbatim in {PATH}. "
        "File has likely drifted since this script was written — check manually."
    )

    content = content.replace(OLD_HC, NEW_HC)
    content = content.replace(OLD_TAIL, NEW_TAIL)

    with open(PATH, "w") as f:
        f.write(content)

    print(f"[ok] patched {PATH}")

    result = subprocess.run(["node", "--check", PATH], capture_output=True, text=True)
    if result.returncode != 0:
        print("[FAIL] node --check failed after patch:")
        print(result.stderr)
        sys.exit(1)
    print("[ok] node --check passed")

if __name__ == "__main__":
    main()