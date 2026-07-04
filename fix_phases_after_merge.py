#!/usr/bin/env python3
"""
Run this AFTER `git checkout --theirs architecture/kernel/phases.json`
during the merge conflict resolution for PR #52.

Main's phases.json got reformatted today by the relay-standardization pass
but never actually got the entryPoint fix -- it still points cpq/catalog/
approval at the stale flat html/*.html files. This reapplies just that fix
on top of main's newer structure/formatting, matching the same pattern
already used for every other phase (o2c, crm, mdm, etc.).
"""
import json

path = "architecture/kernel/phases.json"

FIXES = {
    "phase-3-cpq": ("html/cpq-war-room.html", "war-rooms/cpq/cpq-war-room.html"),
    "phase-4-catalog": ("html/catalog-war-room.html", "war-rooms/catalog/catalog-war-room.html"),
    "phase-5-approvals": ("html/approval-war-room.html", "war-rooms/approval/approval-war-room.html"),
}

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

phases = data if isinstance(data, list) else data.get("phases", data)

changed = []
for p in phases:
    pid = p.get("id")
    if pid in FIXES:
        stale, canonical = FIXES[pid]
        if p.get("entryPoint") == stale:
            p["entryPoint"] = canonical
            changed.append(pid + " (entryPoint)")
        if p.get("modules") and p["modules"][0] == stale:
            p["modules"][0] = canonical
            changed.append(pid + " (modules[0])")

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4)
    f.write("\n")

if changed:
    print("Fixed:", ", ".join(changed))
else:
    print("Nothing to fix -- entryPoints already correct (double-check before committing).")
    