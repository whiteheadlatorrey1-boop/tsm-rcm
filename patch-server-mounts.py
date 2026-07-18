#!/usr/bin/env python3
"""
patch-server-mounts.py
Idempotently mounts BOTH enterprise-lab routers in server.js:
  - /api/enterprise-lab  -> server/enterprise-lab/api.js       (mission queue)
  - /api/twins           -> server/enterprise-lab/twins-router.js (all digital twins)

Confirmed by reading every recovery script: /api/enterprise-lab was mounted
automatically by apply-sprint1.sh's own patcher, but /api/twins was NEVER
actually mounted by any script -- every later script just assumed it already
was. This script adds whichever of the two is still missing.

Run from repo root:
    python3 patch-server-mounts.py
"""
import os

SERVER_JS = "server.js"

if not os.path.isfile(SERVER_JS):
    print(f"❌ {SERVER_JS} not found in {os.getcwd()}. Run this from your repo root.")
    raise SystemExit(1)

with open(SERVER_JS, "r", encoding="utf-8") as f:
    content = f.read()

changed = False

# ---------------------------------------------------------------------------
# Mount 1: /api/enterprise-lab (mission queue / incident engine)
# ---------------------------------------------------------------------------
if "enterprise-lab/api" in content:
    print("[skip] /api/enterprise-lab already mounted")
else:
    marker = "app.use(\n    '/api/enterprise',\n    enterpriseRouter\n);"
    addition = marker + """

// ── ENTERPRISE LAB (Incident Generator / Live Mission Queue) ─────────────────
const enterpriseLabRouter =
    require('./server/enterprise-lab/api');

app.use(
    '/api/enterprise-lab',
    enterpriseLabRouter
);"""
    if marker in content:
        content = content.replace(marker, addition, 1)
        changed = True
        print("[ok]   /api/enterprise-lab mount added")
    else:
        print("⚠️  Could not find expected anchor for /api/enterprise-lab mount.")
        print("    Add this manually near your other app.use('/api/...') lines:")
        print("      const enterpriseLabRouter = require('./server/enterprise-lab/api');")
        print("      app.use('/api/enterprise-lab', enterpriseLabRouter);")

# ---------------------------------------------------------------------------
# Mount 2: /api/twins (all digital twins: vmware, network, device, ad, m365,
# knowledge copilot, vendor ops, chaos engine, sla engine, ai scoring,
# technician metrics, historical analytics)
# ---------------------------------------------------------------------------
if "twins-router" in content:
    print("[skip] /api/twins already mounted")
else:
    addition = """

// ── ENTERPRISE LAB (Digital Twins: VMware, Network, Device, AD, M365, +) ─────
const twinsRouter =
    require('./server/enterprise-lab/twins-router');

app.use(
    '/api/twins',
    twinsRouter
);"""
    if "enterprise-lab/api" in content:
        # Append right after the enterprise-lab/api mount block for locality.
        anchor = "app.use(\n    '/api/enterprise-lab',\n    enterpriseLabRouter\n);"
        if anchor in content:
            content = content.replace(anchor, anchor + addition, 1)
            changed = True
            print("[ok]   /api/twins mount added (after /api/enterprise-lab)")
        else:
            # Fall back to end of file if formatting differs slightly.
            content = content.rstrip() + "\n" + addition + "\n"
            changed = True
            print("[ok]   /api/twins mount added (appended to end of file)")
    else:
        content = content.rstrip() + "\n" + addition + "\n"
        changed = True
        print("[ok]   /api/twins mount added (appended to end of file)")

if changed:
    with open(SERVER_JS, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"\n✅ {SERVER_JS} updated.")
else:
    print(f"\n✅ {SERVER_JS} already fully patched, nothing to do.")

print("\nNext steps:")
print("  node -c server.js                 # sanity-check syntax")
print("  node test-twins.js")
print("  node test-ad-m365.js")
print("  node test-sprint3.js")
print("  node server.js                    # or however you normally start it")
print("  curl http://localhost:8080/api/twins/vmware/state")
print("  curl http://localhost:8080/api/enterprise-lab/health")
