# TSM Enterprise Lab — Full Reassembly

Everything below was recovered from your Sprint 1–4 + device-twin + frontend-panels
scripts, verified against Node 22, and actually run end-to-end (all test suites +
a live Express server hitting every route) before being handed back to you.

## What's in this package

```
server/enterprise-lab/
  incident-engine.js                    (Sprint 1 — categories, sites, SLA/priority, mission queue)
  api.js                                (Sprint 1 — /api/enterprise-lab routes)
  vmware-twin.js                        (Sprint 2 — clusters/hosts/VMs/datastores)
  network-twin.js                       (Sprint 2 — routers/switches/links)
  ad-twin.js                            (Sprint 2b — users/OUs/groups/DCs)
  m365-twin.js                          (Sprint 2b — mailboxes/licenses/services)
  knowledge-copilot.js                  (Sprint 3 — KB entries)
  vendor-ops-twin.js                    (Sprint 3 — vendors/tickets)
  chaos-engine.js                       (Sprint 3 base + Sprint 4 cumulative counters)
  sla-engine.js                         (FINAL — includes network/vmware/device rules)
  ai-scoring.js                         (Sprint 4 — risk scoring)
  technician-performance-metrics.js     (Sprint 4 — tech roster/assignments)
  historical-analytics.js               (Sprint 4 — periodic snapshots)
  device-twin.js                        (FINAL — laptops/desktops/printers)
  twins-router.js                       (FINAL — wires ALL of the above under /api/twins)

test-twins.js         (vmware + network + device fault-injection tests)
test-ad-m365.js        (AD + M365 fault-injection tests)
test-sprint3.js        (knowledge copilot + vendor ops + chaos + SLA tests)

html/enterprise-command-center.html     (FINAL — full UI with all twin panels)

patch-server-mounts.py  (idempotently mounts /api/enterprise-lab and /api/twins in your server.js)
```

## Scenario Library added (28 documented anomaly playbooks)

The Knowledge Copilot originally only documented 9 of the 28 real fault types
across the platform — AD and M365 only. Network, VMware, Device, and Vendor
faults had zero documented response steps. Fixed:

- `knowledge-copilot.js` now has a complete, well-formed entry for **all 28
  fault types** across all 6 twins (AD: 5, M365: 4, Network: 4, VMware: 4,
  Device: 7, Vendor: 4) — confirmed with an automated audit script, zero
  missing, zero malformed.
- `enterprise-command-center.html` now has a **Scenario Library** panel below
  the twin panels — a filterable, browsable grid of all 28 scenarios, grouped
  by twin, with steps lazily loaded per-card on click (one API call per card
  actually opened, not 28 up front). This lets end users read through every
  documented anomaly response on their own, independent of triggering a fault.
- `test-sprint3.js` had one test relying on `vendor:vendor-outage` being an
  *unwritten* key — since that's now a real documented entry, the test was
  updated to upsert a genuinely new key instead. Still passes.

Verified: audited fault-type coverage with a Node script (28/28, 0 missing, 0
malformed), re-ran all three test suites (63/63 checks pass), syntax-checked
both inline `<script>` blocks in the HTML, and hit the live
`/api/twins/knowledge/entries` and `/api/twins/knowledge/lookup/:twinType/:faultType`
endpoints against a real running server — confirmed 28 entries returned,
correctly broken down by twin, with real spot-checked step content for
previously-missing categories (network, vmware, device, vendor).

## Fixed since first delivery

The four twin panels (VMware/Network/AD/Device) in `enterprise-command-center.html`
originally called `res.json()` directly on every poll. If the backend isn't
reachable yet — wrong port, `/api/twins` not mounted, or you're just previewing
the raw HTML with no server behind it (e.g. a Claude.ai artifact preview) — the
fetch returns an HTML error page instead of JSON, and `res.json()` throws
`Unexpected token '<' ... is not valid JSON`, spamming the console every 5s.

Fixed with:
- `safeFetchJSON()` — checks `res.ok` and the `content-type` header before
  parsing, returns `null` on any failure instead of throwing.
- `setTwinStatus()` — shows a small red "OFFLINE" badge next to each twin's
  name instead of a wall of console errors, and only logs a `console.warn`
  once per online→offline transition (not on every retry).
- On first failure, each panel shows "Twin backend not reachable yet —
  retrying…" instead of leaving stale or blank data.

Verified: extracted and `node --check`'d both inline `<script>` blocks (pass),
and confirmed against a real running server that an unmounted route (404,
`text/html`) and a real route (200, `application/json`) both hit the correct
branch in `safeFetchJSON`.

## Verified before delivery

I actually ran this, not just read it:

- `node -c` on all 15 JS files — all parse cleanly.
- `node test-twins.js` — 24/24 checks passed.
- `node test-ad-m365.js` — 15/15 checks passed.
- `node test-sprint3.js` — 24/24 checks passed.
- Loaded `twins-router.js` directly — 46 routes registered, no runtime errors.
- Spun up a real Express server with both `/api/enterprise-lab` and `/api/twins`
  mounted and hit every major endpoint (vmware, network, device, ad, m365,
  vendor, knowledge, sla, scoring, technicians, analytics, chaos) — all returned
  HTTP 200.
- Fired `/api/twins/chaos/trigger` for the `device` module and confirmed it
  correctly bridged into the mission queue (`incident-engine.js`), producing
  a real `missionId` — this is the trickiest wiring point (twins-router →
  incident-engine) and it works.

## How to install this in your real repo

1. Copy the `server/enterprise-lab/` folder into your repo root (overwrite
   what's there — these are the final, reconciled versions).
2. Copy `html/enterprise-command-center.html` into your `html/` folder.
3. Copy `test-twins.js`, `test-ad-m365.js`, `test-sprint3.js` into your repo root.
4. Copy `patch-server-mounts.py` into your repo root and run:
   ```bash
   python3 patch-server-mounts.py
   ```
   This adds the two missing `app.use(...)` mount lines to your `server.js`:
   - `/api/enterprise-lab` → `server/enterprise-lab/api.js`
   - `/api/twins` → `server/enterprise-lab/twins-router.js` (this one was
     never actually mounted by any of your original scripts — confirmed by
     reading every one of them)

   It's idempotent — safe to re-run, and it'll tell you if either mount
   already exists so it won't double-patch.

5. Sanity-check and run your tests:
   ```bash
   node -c server.js
   node test-twins.js
   node test-ad-m365.js
   node test-sprint3.js
   ```
6. Start your server as usual, then verify:
   ```bash
   curl http://localhost:8080/api/enterprise-lab/health
   curl http://localhost:8080/api/twins/vmware/state
   curl http://localhost:8080/api/twins/ad/state
   curl -X POST http://localhost:8080/api/twins/chaos/trigger
   ```

## One dependency note

All of this requires `express` to be a dependency in your repo already (it's
`require()`'d directly in `api.js` and `twins-router.js`). If your `server.js`
already runs an Express app, you already have it — nothing new to install.
