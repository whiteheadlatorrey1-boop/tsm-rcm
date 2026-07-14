#!/usr/bin/env python3
"""
Adds a 'bpo-war-room' roster to tsm-agent-registry.js, same honest-stub
convention already used for construction-war-room / mortgage-war-room:
labels only, no-op matchers (always fall through to Unassigned) until real
finding text from bpo-strategist-v2.html's getExplainItems() output is
confirmed to pattern-match against.

Labels are not invented -- they're sourced directly from this page's own
existing tab structure (SLA Report / Client Impact / Escalations, see
pullSLAReport/pullClientBrief/pullEscalations) and its sector list
(Plant Operations, Supply Chain, OT/ICS Security -- see sectorMap), so the
roster reflects real domain concepts already coded into this platform.

Run from repo root: python3 apply_agent_registry_bpo_roster.py
"""
import sys

PATH = "html/shared/tsm-agent-registry.js"  # confirm this matches the real repo path (grep -rl showed /shared/tsm-agent-registry.js as the served path)

with open(PATH, "r", encoding="utf-8") as f:
    content = f.read()

original = content

def must_replace(content, old, new, label):
    if old not in content:
        print(f"ABORT: anchor not found for [{label}] — no changes written.")
        sys.exit(1)
    if content.count(old) > 1:
        print(f"ABORT: anchor for [{label}] is not unique ({content.count(old)} matches) — refusing to guess.")
        sys.exit(1)
    return content.replace(old, new, 1)

anchor = """  registerRoster('mortgage-war-room', [
    { id: 'document', label: 'Document Agent' },
    { id: 'underwriting', label: 'Underwriting Agent' },
    { id: 'compliance', label: 'Compliance Agent' },
    { id: 'closing', label: 'Closing Agent' }
  ]);

})(typeof window !== 'undefined' ? window : this);"""

new = """  registerRoster('mortgage-war-room', [
    { id: 'document', label: 'Document Agent' },
    { id: 'underwriting', label: 'Underwriting Agent' },
    { id: 'compliance', label: 'Compliance Agent' },
    { id: 'closing', label: 'Closing Agent' }
  ]);

  // BPO (bpo-strategist-v2.html): roster registered, matchers honestly
  // stubbed (always false -> everything falls through to "Unassigned")
  // until real finding text from this page's getExplainItems()/
  // toExplainItems() output is confirmed to pattern-match against.
  // Labels sourced from this page's own existing tabs (SLA/Client
  // Impact/Escalations) and sector list (Plant/Supply Chain/OT-ICS),
  // not invented.
  registerRoster('bpo-war-room', [
    { id: 'supply-chain', label: 'Supply Chain Agent' },
    { id: 'plant-ops', label: 'Plant Operations Agent' },
    { id: 'security', label: 'OT/ICS Security Agent' },
    { id: 'client-impact', label: 'Client Impact Agent' },
    { id: 'escalation', label: 'Escalation Agent' }
  ]);

})(typeof window !== 'undefined' ? window : this);"""

content = must_replace(content, anchor, new, "bpo-war-room roster registration")

assert content != original, "no changes were made"
with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"OK: {PATH} patched — bpo-war-room roster added.")