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

**RESOLVED (2026-07-04):** Canonical is `html/core/tsm-enforcer.js` (the firewall).
Evidence: `TSM_ENFORCER.*` from the repo-root audit version has zero external
callers anywhere in the repo — nothing calls `.audit()` or `.autoHeal()` except
the file itself on load. Self-contained, orphaned, dead code. The firewall
behavior (`BLOCKED RELAY WRITE`) is referenced by two toolchain scripts —
`tsm_full_kernel_lock.sh` and `tsm_quantum_lock_apply_FIXED.sh` — meaning
something was actually built expecting that enforcement to exist. Repo-root
audit version is safe to retire post-Monday.

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

**RESOLVED (2026-07-04) — see section 2b below for the full usage-audit
writeup.** Canonical is `/core/tsm-kernel.js` (repo root) — the opposite
directory from the enforcer decision above. Don't assume the two pair up.

---

## 2b. Kernel decision — usage audit detail (2026-07-04)

Canonical: `/core/tsm-kernel.js` (repo root). Evidence: all 219 real callers of
`TSM_KERNEL.*` that load an actual kernel script load this file — 132 via
absolute path (`/core/tsm-kernel.js`), 67 via relative (`../../core/tsm-kernel.js`).
Zero callers load `/html/core/tsm-kernel.js`. Shape in use everywhere:
`{ timestamp, vertical, payload }`, read via `.payload`, plus `listRelays()`.

Note this is the OPPOSITE directory from the enforcer canonical (`html/core/`) —
the two decisions don't pair up by folder. Don't assume symmetry when migrating
to absolute paths.

Also found during the audit, not previously tracked:
- `public/js/tsm-kernel-v2.js` — third kernel variant, own shim shape
  (`setDoc`/`getDoc`, internal `p.kpis`/`p.relay`). Zero HTML files reference it.
  Fully orphaned, safe to delete same pass as the root-level `tsm-enforcer.js`.
- `tsmWriteRelay(payload){ TSM_KERNEL.setRelay(...) }` is pasted verbatim into
  6 executive-portal pages (bpo, construction, finops, legal-pro, tsm-insurance,
  healthcare) plus `construction-hub.html` and `construction-war-room.html`.
  None of these 8 pages load `/core/tsm-kernel.js` — only `tsm-kernel-upgrade.js`,
  which patches `TSMEventBus` and never defines `window.TSM_KERNEL`. Confirmed
  `tsmWriteRelay()` is never called in any of the 8 files, so this is dead code,
  not a live runtime error — but it reads as functional to anyone grepping the
  repo. Delete or rewire during consolidation.
- `tsm-kernel-upgrade.js` is a naming trap: despite the name, it is NOT a kernel
  variant at all. It only patches `TSMEventBus.emit`. Pages that load it also
  separately load the real `/core/tsm-kernel.js` — confirmed on bpo, legal-pro,
  and finops-suite war rooms.

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

## Demo-safety check (2026-07-04)

Confirmed none of the three demo-critical incident pages (`html/cyber-incident.html`,
`html/plant-incident.html`, `html/supplier-shutdown.html`) reference `TSM_KERNEL.`
or `TSM_ENFORCER.` at all. Sections 1 and 2 above do not affect Monday's demo.

---

## Recommended order for the post-Monday consolidation pass

1. Canonical files are now decided: enforcer = `html/core/tsm-enforcer.js`,
   kernel = `/core/tsm-kernel.js` (note: different directories from each other).
   Migrate legacy verticals to load both explicitly by absolute path, not by
   relative `../../` — removes path-depth fragility entirely regardless of
   file location.
2. Delete confirmed dead code: repo-root `tsm-enforcer.js`, `tsm-kernel-v2.js`,
   and the orphaned `tsmWriteRelay()` blocks in the 8 executive-portal/hub pages.
3. Once absolute paths are in place everywhere, physically consolidating
   directories becomes low-risk, because no path depends on folder depth anymore.
4. Then resolve the `bpo` duplication and reconcile `war-room-prep.html` links
   to point at the canonical `html/war-rooms/` locations.
5. Then, and only then, is a physical folder move actually safe.

This order matters: fixing the path-fragility first is what makes the folder
move safe later, rather than the other way around.
