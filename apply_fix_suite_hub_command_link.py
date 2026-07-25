#!/usr/bin/env python3
"""
Fixes suite-hub.html's "BPO Command Center" link, which pointed at the
dead bpo-command-center.html (same page just retired as the Command
target in bpo-internal1.html). Points it at bpo-executive-portal.html
instead, consistent with that fix.

Run from the repo root (contains html/war-rooms/bpo/suite-hub.html):
    python3 apply_fix_suite_hub_command_link.py
"""
import pathlib

TARGET = pathlib.Path("html/war-rooms/bpo/suite-hub.html")

OLD = 'href="/bpo/bpo-command-center.html">BPO Command Center</a>'
NEW = 'href="/bpo/bpo-executive-portal.html">BPO Command Center</a>'

def main():
    assert TARGET.exists(), f"Not found: {TARGET} (run this from the repo root)"
    text = TARGET.read_text()

    count = text.count(OLD)
    assert count == 1, f"Expected exactly 1 match, found {count} -- aborting, file may have changed"

    text = text.replace(OLD, NEW)
    TARGET.write_text(text)

    final = TARGET.read_text()
    assert final.count(NEW) == 1
    assert OLD not in final

    print(f"OK: patched {TARGET}")
    print(f'  "BPO Command Center" -> /bpo/bpo-executive-portal.html')

if __name__ == "__main__":
    main()