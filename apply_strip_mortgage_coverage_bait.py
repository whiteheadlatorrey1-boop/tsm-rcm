#!/usr/bin/env python3
"""
Removes two hidden (display:none) "coverage-notes" sections found in
Latorrey's uncommitted working-tree changes to the mortgage war room and
executive portal. Confirmed fabricated: grepping mortgage-model.json,
mortgage-engine.js, and every mortgage *.html for "rate lock"/"eligibility"
turns up zero real support -- those phrases exist nowhere except inside
these hidden sections themselves. Same for the executive-portal section's
"rolling portfolio forecast and servicing forecast" claim -- mortgage-engine.js
has no forecast logic at all (computeKpis/getFinancialSummary/buildRelayPayload
are the only outputs, all point-in-time).

This script ONLY removes the two hidden sections. It leaves untouched:
  - mortgage-war-room.html's nav-brand subtitle (visible, accurate --
    LOAN OFFICER/LOAN PROGRAM columns are real)
  - mortgage-war-room.html's column rename PROGRAM->LOAN PROGRAM,
    OWNER->LOAN OFFICER (visible, accurate, matches real data fields)

Idempotent: safe to re-run.
"""
import sys

CHANGES = [
    (
        "html/war-rooms/mortgage/mortgage-executive-portal.html",
        (
            "\n\n"
            "<section class=\"mortgage-coverage-notes\" style=\"display:none\">\n"
            "  <p>Executive view includes a rolling portfolio forecast and servicing forecast,\n"
            "  giving leadership visibility into pipeline health and long-term servicing volume.</p>\n"
            "</section>"
        ),
    ),
    (
        "html/war-rooms/mortgage/mortgage-war-room.html",
        (
            "\n\n"
            "<section class=\"mortgage-coverage-notes\" style=\"display:none\">\n"
            "  <p>Every borrower is paired with a dedicated loan officer who guides them through\n"
            "  available loan programs and current rate lock windows.</p>\n"
            "  <p>Our loan product catalog spans conventional, FHA, VA, and jumbo loan programs,\n"
            "  each with clear rate lock terms and eligibility criteria.</p>\n"
            "</section>"
        ),
    ),
]

any_changed = False

for path, block in CHANGES:
    try:
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
    except FileNotFoundError:
        print(f"{path}: not found -- skipping")
        continue

    if block not in src:
        if "mortgage-coverage-notes" in src:
            print(f"{path}: has a 'mortgage-coverage-notes' section but text doesn't match expected "
                  f"block exactly -- ABORTING this file, needs manual review (don't want to guess-remove)")
        else:
            print(f"{path}: no matching hidden section found -- already clean, skipping")
        continue

    new_src = src.replace(block, "", 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_src)
    print(f"Patched {path}: removed hidden coverage-notes section")
    any_changed = True

if not any_changed:
    print("No changes made (already applied or nothing matched). Idempotent no-op.")