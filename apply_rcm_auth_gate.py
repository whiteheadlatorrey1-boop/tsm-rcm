#!/usr/bin/env python3
"""
Applies the RCM OS auth-gate changes directly via string replacement.
Pure ASCII source file (all non-ASCII chars are \\u escapes) so it can't
be mangled by terminal paste or download encoding conversion, unlike the
.patch / base64 approaches that kept getting corrupted in transfer.

Run from the repo root:
    python3 apply_rcm_auth_gate.py

Idempotent: safe to re-run; already-applied edits are skipped, not
duplicated. Reports exactly what it did or why it skipped each edit.
"""
import os
import sys

EM_DASH = "\u2014"           # —
BOX_H = "\u2500" * 76        # ── ... repeated for box-drawing header lines

def box_line(text):
    """Recreate the '// \u2500\u2500 TEXT \u2500\u2500\u2500...' comment style used in this repo."""
    prefix = "// \u2500\u2500 " + text + " "
    return prefix + ("\u2500" * max(0, 76 - len(prefix)))

REQUIRE_API_KEY_FN = (
    "function requireApiKey(req, res, next) {\n"
    "  const key = req.headers['x-api-key'];\n"
    "  if (!key || key !== process.env.TSM_API_KEY) {\n"
    "    return res.status(401).json({ ok: false, error: 'Unauthorized' });\n"
    "  }\n"
    "  next();\n"
    "}\n"
)

edits_applied = []
edits_skipped = []
edits_failed = []

def apply_edit(filepath, old, new, label):
    if not os.path.exists(filepath):
        edits_failed.append((filepath, label, "file not found"))
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    if new in content:
        edits_skipped.append((filepath, label, "already applied"))
        return
    if old not in content:
        edits_failed.append((filepath, label, "anchor text not found (file may have changed)"))
        return
    count = content.count(old)
    if count > 1:
        edits_failed.append((filepath, label, f"anchor not unique ({count} matches) - aborting to avoid wrong edit"))
        return
    content = content.replace(old, new)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    edits_applied.append((filepath, label))


# ── routes/rcm-relay.js ─────────────────────────────────────────────────
f = "routes/rcm-relay.js"

auth_block = (
    box_line("AUTH: shared-secret gate for mutating endpoints") + "\n"
    + "// Mirrors the requireApiKey convention in server.js (MDM/WIP gated\n"
    + "// endpoints). Duplicated here rather than imported since routes/ modules\n"
    + "// don't share server.js's module scope " + EM_DASH + " see html/config/tsm-client-key.js\n"
    + "// for the client-side key this checks against.\n"
    + REQUIRE_API_KEY_FN
)

apply_edit(
    f,
    "const express = require('express');\nconst crypto = require('crypto');\nconst router = express.Router();\n\n// \u2500\u2500 In-memory staging store",
    "const express = require('express');\nconst crypto = require('crypto');\nconst router = express.Router();\n\n" + auth_block + "\n// \u2500\u2500 In-memory staging store",
    "add requireApiKey middleware"
)

apply_edit(
    f,
    "router.post('/relay', express.json({ limit: '2mb' }), (req, res) => {",
    "router.post('/relay', requireApiKey, express.json({ limit: '2mb' }), (req, res) => {",
    "gate POST /relay"
)

apply_edit(
    f,
    "router.delete('/relay', (req, res) => {",
    "router.delete('/relay', requireApiKey, (req, res) => {",
    "gate DELETE /relay"
)

apply_edit(
    f,
    "router.post('/guidance', express.json({ limit: '1mb' }), async (req, res) => {",
    "router.post('/guidance', requireApiKey, express.json({ limit: '1mb' }), async (req, res) => {",
    "gate POST /guidance"
)

# ── routes/rcm-requirements.js ──────────────────────────────────────────
f = "routes/rcm-requirements.js"

auth_block2 = (
    box_line("AUTH: shared-secret gate for mutating endpoints") + "\n"
    + "// Mirrors the requireApiKey convention in server.js (MDM/WIP gated\n"
    + "// endpoints) and routes/rcm-relay.js. Duplicated per-file rather than\n"
    + "// imported since routes/ modules don't share server.js's module scope.\n"
    + REQUIRE_API_KEY_FN
)

apply_edit(
    f,
    "const express = require('express');\nconst fs = require('fs');\nconst path = require('path');\nconst router = express.Router();\n\nconst REGISTRY_PATH",
    "const express = require('express');\nconst fs = require('fs');\nconst path = require('path');\nconst router = express.Router();\n\n" + auth_block2 + "\nconst REGISTRY_PATH",
    "add requireApiKey middleware"
)

apply_edit(
    f,
    "router.post('/self-reported', express.json({ limit: '100kb' }), (req, res) => {",
    "router.post('/self-reported', requireApiKey, express.json({ limit: '100kb' }), (req, res) => {",
    "gate POST /self-reported"
)

apply_edit(
    f,
    "router.delete('/self-reported/:key/:fieldId', (req, res) => {",
    "router.delete('/self-reported/:key/:fieldId', requireApiKey, (req, res) => {",
    "gate DELETE /self-reported/:key/:fieldId"
)

# ── html/finops-suite/js/rcm-relay-client.js ────────────────────────────
f = "html/finops-suite/js/rcm-relay-client.js"

apply_edit(
    f,
    "    try {\n      const res = await fetch(`${API_BASE}/relay`, {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(payload)\n      });",
    "    try {\n      const key = global.TSM_CLIENT_KEY;\n      if (!key) console.warn('[RCMRelay] TSM_CLIENT_KEY is unset " + EM_DASH + " relay push will 401. See html/config/tsm-client-key.js');\n      const res = await fetch(`${API_BASE}/relay`, {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json', 'x-api-key': key || '' },\n        body: JSON.stringify(payload)\n      });",
    "add x-api-key to relay send()"
)

apply_edit(
    f,
    "    try { await fetch(`${API_BASE}/relay`, { method: 'DELETE' }); } catch (e) { /* ignore */ }",
    "    try { await fetch(`${API_BASE}/relay`, { method: 'DELETE', headers: { 'x-api-key': global.TSM_CLIENT_KEY || '' } }); } catch (e) { /* ignore */ }",
    "add x-api-key to relay clear()"
)

# ── html/finops-suite/tsm-rcm-os.html ───────────────────────────────────
f = "html/finops-suite/tsm-rcm-os.html"

apply_edit(
    f,
    '<script src="js/rcm-relay-client.js"></script>\n<script src="js/rcm-assistant.js"></script>',
    '<script src="/config/tsm-client-key.js"></script>\n<script src="js/rcm-relay-client.js"></script>\n<script src="js/rcm-assistant.js"></script>',
    "load tsm-client-key.js"
)

apply_edit(
    f,
    "async function saveSelfReport(key, fieldId, value){\n  if(!value || !value.trim()) return;\n  try {\n    const res = await fetch('/api/rcm/self-reported', {\n      method: 'POST', headers: {'Content-Type':'application/json'},\n      body: JSON.stringify({ key, fieldId, value: value.trim() })\n    });",
    "async function saveSelfReport(key, fieldId, value){\n  if(!value || !value.trim()) return;\n  try {\n    const apiKey = window.TSM_CLIENT_KEY;\n    if(!apiKey) console.warn('[RCM OS] TSM_CLIENT_KEY is unset " + EM_DASH + " self-report save will 401. See html/config/tsm-client-key.js');\n    const res = await fetch('/api/rcm/self-reported', {\n      method: 'POST', headers: {'Content-Type':'application/json', 'x-api-key': apiKey || ''},\n      body: JSON.stringify({ key, fieldId, value: value.trim() })\n    });",
    "add x-api-key to saveSelfReport()"
)

apply_edit(
    f,
    "    const res = await fetch('/api/rcm/guidance', {\n      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)\n    });",
    "    const res = await fetch('/api/rcm/guidance', {\n      method: 'POST', headers: {'Content-Type':'application/json', 'x-api-key': window.TSM_CLIENT_KEY || ''}, body: JSON.stringify(body)\n    });",
    "add x-api-key to fetchGuidance()"
)

# ── html/finops-suite/finops-showcase-v1.html ───────────────────────────
f = "html/finops-suite/finops-showcase-v1.html"

apply_edit(
    f,
    '  <script src="/shared/tsm-shared.js"></script>\n<script src="js/rcm-relay-client.js"></script>',
    '  <script src="/shared/tsm-shared.js"></script>\n<script src="/config/tsm-client-key.js"></script>\n<script src="js/rcm-relay-client.js"></script>',
    "load tsm-client-key.js"
)


# ── Report ───────────────────────────────────────────────────────────────
print("=" * 60)
print(f"APPLIED: {len(edits_applied)}")
for fp, label in edits_applied:
    print(f"  [OK] {fp}: {label}")

print(f"\nSKIPPED (already applied): {len(edits_skipped)}")
for fp, label, reason in edits_skipped:
    print(f"  [--] {fp}: {label} ({reason})")

print(f"\nFAILED: {len(edits_failed)}")
for fp, label, reason in edits_failed:
    print(f"  [XX] {fp}: {label} -- {reason}")
print("=" * 60)

total_expected = 13
total_ok = len(edits_applied) + len(edits_skipped)
if edits_failed:
    print(f"\n{len(edits_failed)} edit(s) failed - review above before committing.")
    sys.exit(1)
elif total_ok == total_expected:
    print(f"\nAll {total_expected} edits present (applied + already-applied). Ready to review with: git diff --stat")
    sys.exit(0)
else:
    print(f"\nExpected {total_expected} edits, accounted for {total_ok}. Something's off - review above.")
    sys.exit(1)