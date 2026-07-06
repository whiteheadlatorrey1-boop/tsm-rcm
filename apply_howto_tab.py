#!/usr/bin/env python3
"""
apply_howto_tab.py

Adds a "How To" tab (systematic workflow order, SLA discipline, and
anomaly-detection guidance) to the TSM L1 Ticket Copilot page.

Follows the repo's established edit pattern: backs up the target file
first, uses assert-guarded string replacement, and is idempotent — safe
to re-run if it already applied.

Run from the repo root:
    python3 apply_howto_tab.py --html=html/l1-copilot/l1-ticket-copilot.html

If you saved the page somewhere else, pass its actual path with --html=.
"""

import argparse
import shutil
import sys
from datetime import datetime, timezone

NAV_ANCHOR = '    <div class="sb-item" data-section="history"><span class="sb-dot"></span>History</div>\n  </div>'
NAV_REPLACEMENT = (
    '    <div class="sb-item" data-section="history"><span class="sb-dot"></span>History</div>\n'
    '    <div class="sb-item" data-section="howto"><span class="sb-dot"></span>How To</div>\n'
    '  </div>'
)

SECTION_ANCHOR = """    </section>

  </div>
</div>

<!-- L1 Assistant widget mounts here (see apply-l1-assistant.js) -->"""

HOWTO_SECTION = """    </section>

    <!-- HOW TO -->
    <section class="section" id="sec-howto">
      <div class="card">
        <div class="card-head">WORKING THE QUEUE — RECOMMENDED ORDER</div>
        <div class="card-body">
          <div class="ai-output" style="white-space:normal;line-height:1.8">
            <b style="color:var(--cyan)">1. Ticket →</b> paste the full ticket text as soon as it lands, before you touch the hardware or remote in. The AI reads best on raw, unfiltered user language.<br>
            <b style="color:var(--cyan)">2. AI Analysis →</b> run it immediately after intake. Treat <b>Confidence</b> as a triage signal, not a verdict — below ~70%, expect to spend more time in Troubleshooting before you trust the recommended path.<br>
            <b style="color:var(--cyan)">3. Troubleshooting →</b> work the checklist in order (Verify User → Power → Hardware → OS). Skipping ahead because you "know" the fix is the single biggest cause of re-opened tickets — the checklist exists so nothing gets assumed.<br>
            <b style="color:var(--cyan)">4. Vendor Support →</b> pull this up the moment hardware is implicated, even if you think it's software. Knowing the warranty tier before you need it saves the hold-time later.<br>
            <b style="color:var(--cyan)">5. SLA →</b> check this every time you switch tabs, not just when the alert bar fires. Color changes are your cue to act, not a background indicator.<br>
            <b style="color:var(--cyan)">6. Resolution →</b> generate this before you close the ticket, not after — it forces you to confirm the actions taken actually match what's in Notes.<br>
            <b style="color:var(--cyan)">7. Escalation →</b> if you reach this tab, you should already know why — it should confirm your reasoning, not create it from scratch.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">STAYING AHEAD OF SLA</div>
        <div class="card-body">
          <div class="ai-output" style="white-space:normal;line-height:1.8">
            <span class="tag tag-ok">GREEN</span> Plenty of runway — work the checklist fully, don't shortcut steps to save time you don't need to save.<br><br>
            <span class="tag tag-medium">AMBER</span> You're inside the window where escalation should already be in motion if L1 hasn't resolved it — open the Escalation tab now, not when it flips red.<br><br>
            <span class="tag tag-high">RED</span> Breach is imminent or has happened. Stop troubleshooting, escalate immediately, and note the breach reason in Resolution so the pattern can be tracked — a late escalation is still better than a silent one.<br><br>
            A P1 with 20 minutes remaining and a P3 with 20 minutes remaining are not the same urgency — always read the <b>Priority</b> field next to the timer, not the timer alone.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">ANOMALY SIGNALS TO WATCH FOR</div>
        <div class="card-body">
          <div class="ai-output" style="white-space:normal;line-height:1.8">
            <b style="color:var(--amber)">Repeat asset/user in History →</b> the same hostname or requester showing up more than once usually means the last fix treated a symptom, not the root cause. Say so explicitly in the new ticket's notes and consider escalating on the second occurrence rather than the third.<br><br>
            <b style="color:var(--amber)">Low confidence + high severity together →</b> this is the highest-risk combination in the queue — the AI isn't sure, but the stakes are high. Don't rely on the recommended path alone; work the full checklist and lean toward earlier escalation.<br><br>
            <b style="color:var(--amber)">Vendor case opened but warranty status unclear →</b> resolve this before dispatch gets involved — an expired warranty discovered mid-repair costs more time than checking it up front.<br><br>
            <b style="color:var(--amber)">Escalations clustering on one team →</b> if Network or Server escalations spike in a short window, that's an infrastructure signal, not a coincidence of unrelated tickets — flag it up rather than closing each ticket independently.
          </div>
        </div>
      </div>
    </section>

  </div>
</div>

<!-- L1 Assistant widget mounts here (see apply-l1-assistant.js) -->"""


def backup(path):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    backup_path = f"{path}.bak.howto.{ts}"
    shutil.copyfile(path, backup_path)
    print(f"  backed up {path} -> {backup_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", default="html/l1-copilot/l1-ticket-copilot.html")
    args = parser.parse_args()

    try:
        with open(args.html, "r", encoding="utf-8") as f:
            src = f.read()
    except FileNotFoundError:
        print(f"ERROR: {args.html} not found. Pass --html=path/to/your/page.html")
        sys.exit(1)

    if 'data-section="howto"' in src:
        print("  How To tab already present — skipping (idempotent).")
        return

    nav_count = src.count(NAV_ANCHOR)
    assert nav_count == 1, f"expected NAV_ANCHOR exactly once, found {nav_count} — page may not match expected shape"

    section_count = src.count(SECTION_ANCHOR)
    assert section_count == 1, f"expected SECTION_ANCHOR exactly once, found {section_count} — page may not match expected shape"

    backup(args.html)
    src = src.replace(NAV_ANCHOR, NAV_REPLACEMENT, 1)
    src = src.replace(SECTION_ANCHOR, HOWTO_SECTION, 1)

    with open(args.html, "w", encoding="utf-8") as f:
        f.write(src)

    print(f"  inserted How To nav item + section into {args.html}")
    print("\nDone. Reload the page to see the new How To tab in the left nav.")


if __name__ == "__main__":
    main()