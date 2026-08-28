#!/usr/bin/env python3
"""
Applies the doc-search seed-workspace-visibility fix directly,
bypassing git am. Run from repo root:

    python3 apply_seed_visibility_fix.py

Safe to re-run: it checks whether each block is already present
and skips it instead of double-inserting.
"""
import sys
from pathlib import Path

TARGET = Path("html/tsm-doc-search-multi.html")

FIX_BLOCK_1 = """  // Each sample lands in its own baked-in client compartment (not
  // necessarily the one currently selected in the workspace dropdown),
  // so switch to the All Clients rollup afterward -- otherwise seeding
  // looks like a silent no-op if a different, unrelated workspace was
  // active when the button was clicked. Skipped for a locked client-role
  // session, which has no All Clients option at all.
  if (!(window.TSM_SESSION && window.TSM_SESSION.role === 'client')) {
    switchWorkspace(ALL_CLIENTS_ID);
  }
"""

OLD_1 = """    saveIndexForClient(currentVertical, cid, bucket);
  });
  refreshWorkspaceSelector();
  runSearch();
  refreshTotalCount();
}"""

NEW_1 = f"""    saveIndexForClient(currentVertical, cid, bucket);
  }});
{FIX_BLOCK_1}  refreshWorkspaceSelector();
  runSearch();
  refreshTotalCount();
}}"""

FIX_BLOCK_2 = """  // Same visibility fix as seedDemoData(): land on the All Clients rollup
  // so the freshly seeded records for the current vertical are actually
  // visible instead of sitting in compartments the dropdown isn't on.
  if (!(window.TSM_SESSION && window.TSM_SESSION.role === 'client')) {
    switchWorkspace(ALL_CLIENTS_ID);
  }
"""

OLD_2 = """  const btn = document.getElementById('seed-all-btn');
  if (btn) btn.textContent = '✓ ALL VERTICALS SEEDED';

  refreshWorkspaceSelector();
  refreshTotalCount();
  if (typeof runSearch === 'function') runSearch();"""

NEW_2 = f"""  const btn = document.getElementById('seed-all-btn');
  if (btn) btn.textContent = '✓ ALL VERTICALS SEEDED';

{FIX_BLOCK_2}  refreshWorkspaceSelector();
  refreshTotalCount();
  if (typeof runSearch === 'function') runSearch();"""


def main():
    if not TARGET.exists():
        sys.exit(f"ERROR: {TARGET} not found. Run this from the repo root.")

    text = TARGET.read_text(encoding="utf-8")
    original = text
    changed = False

    # --- Hunk 1: seedDemoData() ---
    if FIX_BLOCK_1.strip() in text:
        print("Hunk 1 (seedDemoData) already present -- skipping.")
    elif OLD_1 in text:
        if text.count(OLD_1) != 1:
            sys.exit("ERROR: OLD_1 context matched more than once -- aborting, refusing to guess.")
        text = text.replace(OLD_1, NEW_1)
        changed = True
        print("Hunk 1 (seedDemoData) applied.")
    else:
        sys.exit(
            "ERROR: could not find expected context for hunk 1 (seedDemoData).\n"
            "Your local file has diverged further than expected -- do not guess,\n"
            "paste back `sed -n '3100,3145p' html/tsm-doc-search-multi.html` instead."
        )

    # --- Hunk 2: seedAllVerticals() ---
    if FIX_BLOCK_2.strip() in text:
        print("Hunk 2 (seedAllVerticals) already present -- skipping.")
    elif OLD_2 in text:
        if text.count(OLD_2) != 1:
            sys.exit("ERROR: OLD_2 context matched more than once -- aborting, refusing to guess.")
        text = text.replace(OLD_2, NEW_2)
        changed = True
        print("Hunk 2 (seedAllVerticals) applied.")
    else:
        sys.exit(
            "ERROR: could not find expected context for hunk 2 (seedAllVerticals).\n"
            "Your local file has diverged further than expected -- do not guess,\n"
            "paste back `sed -n '3185,3205p' html/tsm-doc-search-multi.html` instead."
        )

    if changed:
        backup = TARGET.with_suffix(TARGET.suffix + ".bak")
        backup.write_text(original, encoding="utf-8")
        TARGET.write_text(text, encoding="utf-8")
        print(f"Done. Backup of the pre-edit file saved to {backup}")
    else:
        print("No changes needed -- both hunks were already present.")


if __name__ == "__main__":
    main()
