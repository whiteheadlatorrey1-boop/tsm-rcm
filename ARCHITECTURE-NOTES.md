# TSM Architecture Notes — Known Duplication Hazards

Status: living document, started 2026-07-04, pre-Monday-demo audit.
Purpose: record confirmed structural divergences BEFORE any consolidation/move,
so a future refactor goes in with eyes open instead of rediscovering these by
breaking something on stage.

---

## 1. Two non-equivalent `tsm-enforcer.js` files

| Location | Role | Behavior |
|---|---|---|
| `/core/tsm-enforcer.js` (repo root) | **Health-audit dashboard** | Reads `TSM_STRAT_CONFIRMED_<vertical>` / `TSM_EXEC_CONFIRMED_<vertical>` flags from localStorage, logs a pass/fail table + health score to console. Read-only, non-blocking. |
| `/html/core/tsm-enforcer.js` | **Relay-write firewall** | Monkey-patches `localStorage.setItem` / `sessionStorage.setItem`. **Throws `"BLOCKED RELAY WRITE"`** if the key matches a `tsm_war_relay_*` / `TSM_WAR_RELAY_*` pattern. Actively blocking. |

**Who currently loads which:**
- Legacy verticals (`html/healthcare/`, `html/legal-pro/`, `html/finops-suite/`,
  `html/construction-suite/`, `html/reo-pro/`, `html/tsm-insurance/`, `html/bpo/`)
  reference `../../core/tsm-enforcer.js` → resolves to the **repo-root audit version**.
- Anything under `html/war-rooms/<vertical>/` that references `/html/core/tsm-enforcer.js`
  (or a relative path that resolves there) gets the **firewall version**.

**Risk:** moving a legacy-vertical page into `html/war-rooms/` changes which file
a `../../` relative path resolves to — silently swapping audit-only behavior for
active write-blocking behavior. No error at move time; the error (if any) surfaces
later, live, when a relay write happens to hit a blocked key pattern.

**Decision needed (post-Monday):** pick ONE canonical enforcer. Given the relay
firewall is what the "Relay compliance passed" git hook is presumably built around,
the firewall version (`html/core/tsm-enforcer.js`) is likely the intended canonical
one — but confirm before deleting the audit version, in case anything depends on
its console health-score output for monitoring.

---

## 2. Two non-equivalent `tsm-kernel.js` files

| Location | `setRelay` payload shape | Extra API |
|---|---|---|
| `/core/tsm-kernel.js` (repo root) | `{ timestamp, vertical, payload }` | also has `listRelays()` |
| `/html/core/tsm-kernel.js` | `{ ts, v, p }` | `setRelay`/`getRelay` only |

**Risk:** identical to above — any code written against one shape
(e.g. reading `.payload`) silently gets `undefined` if the other kernel loaded
instead. This is a data-shape mismatch, not just a naming one, so it won't throw —
it'll just quietly not work.

---

## 3. Known duplicate vertical: `bpo`

`bpo` exists in two separate directories with separate implementations:
- `html/bpo/` (`bpo-executive-portal.html`, `bpo-strategist-v2.html`, `bpo-situation-room.html`)
- `html/war-rooms/bpo/` (`bpo-war-room.html`, `bpo-strategist.html`, `bpo-executive-portal.html`)

`war-room-prep.html` currently links to the `html/bpo/` versions. The canonical
relay registry (`tsm-auto-pipeline.js`) points at `html/war-rooms/bpo/...`.
Not yet reconciled — flagged for the same post-Monday pass as #1 and #2.

---

## 4. Pre-existing relative-path inconsistency (found during move-risk check)

`legal-pro`, `reo-pro`, and `tsm-insurance` war-room pages reference
`../..//js/tsm-mission-conductor.js` (two levels up, stray double-slash) while at
least one page in `reo-pro` uses a single `../` in another spot for what appears
to be the same intended target. Not yet confirmed whether this causes an actual
load failure today (browsers usually tolerate `//`), but the inconsistency itself
suggests these paths were hand-edited independently rather than generated from
one source — worth a straight audit pass post-Monday.

---

## Recommended order for the post-Monday consolidation pass

1. Decide canonical enforcer + kernel (likely the `html/core/` versions, matching
   the compliance-hook direction), migrate legacy verticals to load them
   explicitly by absolute path (`/html/core/tsm-enforcer.js`), not by relative
   `../../` — removes path-depth fragility entirely regardless of file location.
2. Once absolute paths are in place everywhere, physically consolidating
   directories becomes low-risk, because no path depends on folder depth anymore.
3. Then resolve the `bpo` duplication and reconcile `war-room-prep.html` links
   to point at the canonical `html/war-rooms/` locations.
4. Then, and only then, is a physical folder move actually safe.

This order matters: fixing the path-fragility first is what makes the folder
move safe later, rather than the other way around.