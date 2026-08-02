#!/usr/bin/env python3
"""
Fixes the top-right Hub / Command links in bpo-internal1.html.

Hub:     tsm-bpo-website-copy.html  ->  suite-hub.html
         (was pointing at marketing website copy, not a real nav hub;
         suite-hub.html is the actual cross-vertical site map with
         live links to every sector/suite)

Command: bpo-command-center.html    ->  bpo-executive-portal.html
         (bpo-command-center.html's KPIs/mission feed reference
         TSMHub.launch / TSMTelemetry / TSMOrchestrator, none of which
         connect to the real TSMMissionStore data bpo-internal1.html
         actually writes to -- confirmed dead. bpo-executive-portal.html
         genuinely reads TSMMissionStore.listMissions()/getAnalytics()
         and renders a real live cross-vertical rollup, with a safe
         demo-mode fallback if no relay data is present.)

Run from the repo root (contains html/war-rooms/bpo/bpo-internal1.html):
    python3 apply_fix_hub_command.py
"""
import pathlib

TARGET = pathlib.Path("html/war-rooms/bpo/bpo-internal1.html")

OLD_HUB = 'href="tsm-bpo-website-copy.html"'
NEW_HUB = 'href="suite-hub.html"'

OLD_CMD = 'href="bpo-command-center.html"'
NEW_CMD = 'href="bpo-executive-portal.html"'

def main():
    assert TARGET.exists(), f"Not found: {TARGET} (run this from the repo root)"
    text = TARGET.read_text()

    hub_count = text.count(OLD_HUB)
    cmd_count = text.count(OLD_CMD)

    assert hub_count == 1, f"Expected exactly 1 Hub link, found {hub_count} -- aborting, file may have changed"
    assert cmd_count == 2, f"Expected exactly 2 Command links, found {cmd_count} -- aborting, file may have changed"

    text = text.replace(OLD_HUB, NEW_HUB)
    text = text.replace(OLD_CMD, NEW_CMD)

    TARGET.write_text(text)

    # verify
    final = TARGET.read_text()
    assert final.count(NEW_HUB) == 1
    assert final.count(NEW_CMD) == 2
    assert OLD_HUB not in final
    assert OLD_CMD not in final

    print(f"OK: patched {TARGET}")
    print(f"  Hub     -> suite-hub.html")
    print(f"  Command -> bpo-executive-portal.html (topbar + sidebar 'Command Center' nav item)")

if __name__ == "__main__":
    main()