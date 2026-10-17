# Construction BPO — Runbook

_Covers the Construction BPO weekly GC financial review service on `feat/construction-bpo` (PR #256). Last verified 2026-10-17 against this branch's `npm test` (106/106 suites) and a REAL run of `scripts/test-construction-bpo-mongo-live.js` against `~/.tsm-mongo.env`'s `MONGODB_URI` (33/33 passed; cleanup independently confirmed zero leftover tagged documents in every collection it touched) — see "Live-Mongo + Playwright acceptance test" below._

## What this service does

Every week, an analyst reviews a general contractor client's job data and produces one **weekly report**: per-job WIP (work-in-progress) status, change-order SLA tracking, retainage variance, and lien-waiver compliance, combined into a single draft the analyst checks before the client ever sees it. Every flag on that draft needs its own explicit approve/dismiss decision before the report can publish at all, and publishing itself is a one-way gate — a client can never see a draft, only a report their analyst has explicitly published, and only the flags that were approved (never a dismissed flag, never an analyst's note).

```
import (CSV/XLSX)  ──┐
manual entry       ──┼─► workbench.html (analyst review/edit) ─► POST /weekly-reports (draft)
                      │                                              │
                      │                            PATCH .../flags/:flagId (approve/dismiss, per flag)
                      │                                              │
                      │                            POST .../publish -- refused 409 flags_pending
                      │                            until every flag is decided; fails CLOSED if its
                      │                            own audit write fails (rolls back to draft, 503)
                      │                                              │
                      └──────────────────────────────────────────────▼
                                                          client-portal.html (client, read-only,
                                                          published-only, own clientId only,
                                                          approved-flags-only, no notes) /
                                                          GET .../export.pdf (staff or owning client)
```

## File map

| Layer | Path |
|---|---|
| WIP engine | `server/construction-bpo/wip.js` |
| Change-order SLA engine | `server/construction-bpo/change-orders.js` |
| Retainage engine | `server/construction-bpo/retainage.js` |
| Lien-waiver engine | `server/construction-bpo/lien-waivers.js` |
| Report combiner (pure, no storage/auth) | `server/construction-bpo/weekly-report.js` |
| CSV/XLSX import | `server/construction-bpo/import.js` |
| Mongo persistence + audit (reports, flag review, engagements, controller time) | `server/construction-bpo/store.js` |
| Pilot metrics (pure compute) | `server/construction-bpo/metrics.js` |
| Demo fixture (8 jobs × 4 weeks) | `server/construction-bpo/fixtures/sample-gc.js` |
| HTTP routes | `routes/construction-bpo.js` (mounted in `server.js`) |
| Analyst UI | `html/construction-bpo/workbench.html` |
| Client UI | `html/construction-bpo/client-portal.html` |

Each engine file's own header comment explains its sign conventions and edge cases in more depth than this runbook repeats — read those before changing thresholds or flag logic.

## Flags reference

| Flag | Engine | Fires when | Default threshold |
|---|---|---|---|
| `COST_OVERRUN` (`reason: cost_vs_physical_progress`) | wip.js | costsToDate > 90% of totalEstimatedCost **and** PM-reported `physicalPercentComplete` < 85% | `costOverrunCostPct: 0.90`, `costOverrunCompletePct: 0.85` |
| `COST_OVERRUN` (`reason: eac_exceeds_original_budget`) | wip.js | totalEstimatedCost (current EAC) > `originalBudget` | n/a (any overage) |
| `OVERBILLED` / `UNDERBILLED` | wip.js | \|billedToDate − earnedRevenue\| > 10% of contractValue | `billingVariancePct: 0.10` |
| `LOW_MARGIN` | wip.js | projected margin % < 5% of contractValue | `lowMarginPct: 0.05` |
| `INCOMPLETE_DATA` | wip.js / retainage.js / lien-waivers.js | a required numeric field is missing — never guessed | n/a |
| `SLA_BREACH` | change-orders.js | a `pending` CO's age exceeds the SLA window | `slaHours: 72` |
| `INVALID_SUBMITTED_AT` | change-orders.js | `submittedAt` missing or unparseable | n/a |
| `RETAINAGE_VARIANCE` | retainage.js | \|retainageHeld − expected\| > 2% of billedToDate | `retainageVariancePct: 0.02` |
| `LIEN_WAIVER_MISSING` / `_SHORT` / `_EXPIRED` | lien-waivers.js | no waiver on file / received less than expected / expired as of `asOf` | n/a |

Every flag, wherever it comes from, is also assigned a `flagId` and starts `status: 'pending'` (plus `note`/`reviewedBy`/`reviewedAt`, all null) the moment the draft is built — see "Per-flag review gate" below. That's bookkeeping on top of the flag, not a change to when a flag fires.

Two things worth remembering because they're easy to get backwards:
- **`physicalPercentComplete` not supplied ≠ a flag.** `physicalProgressStatus: 'not_provided'` is just a status field on the job result — it only *prevents* `COST_OVERRUN` trigger A from ever firing for that job, it isn't itself something to alert on.
- `COST_OVERRUN` trigger A is deliberately **not** checked against cost-to-cost `percentComplete` (that's the same ratio the trigger's own cost side already uses — see `wip.js`'s header for the bug that shipped once from conflating the two). It needs the independent, PM-reported `physicalPercentComplete`.

Pass a `thresholds` object (`{ wip, slaHours, retainage }`) into `buildWeeklyReportDraft()` / the `POST /weekly-reports` route body to override any of the above per report.

## Weekly operational workflow

1. **Import.** Analyst uploads the GC's CSV/XLSX export in `workbench.html` (`POST /api/construction-bpo/import`, staff-only). An optional `clientId` pulls that client's saved **engagement** (see below) for the default `source`/`columnMap`; a `source`/`columnMap` in the request still overrides it for that one call. Import is stateless — it returns parsed jobs + a validation report, nothing is persisted yet.
2. **Review (data).** The analyst edits the imported (or manually entered) jobs, change orders, retainage, and lien-waiver tables directly in the workbench before generating anything.
3. **Generate draft.** `POST /api/construction-bpo/weekly-reports` with `clientId`, `weekEnding`, and the four arrays builds the draft (pure compute, `weekly-report.js`) and stores it, keyed `clientId__weekEnding`. Thresholds come from the client's saved engagement unless the request body supplies its own `thresholds` (an override, recorded in the audit entry). Re-submitting the same client+week while still a draft **upserts** — it is not an error to regenerate a draft (but see Known Gaps: this resets flag review).
4. **Review (flags).** Every flag on the draft starts `pending`. `PATCH /api/construction-bpo/weekly-reports/:id/flags/:flagId` (staff-only) sets it `approved` or `dismissed`, with an optional note — this is the human check the spec calls the "analyst review gate," and it's per-flag, not just per-report.
5. **Publish.** `POST /api/construction-bpo/weekly-reports/:id/publish` (staff-only) is one-way: refused `409 flags_pending` while any flag is still undecided; `409` if already published (never a silent no-op), same for regenerating a draft for an already-published client+week. It also fails CLOSED on its own audit write — if that write throws, the report is rolled back to `draft` and the request is `503`, never a published report with no audit record behind it.
6. **Client view.** Once published, the client (and only that client, and only that report) can see it in `client-portal.html` — and only the flags an analyst approved; a dismissed flag, a still-pending one (impossible post-publish, but enforced anyway), and every analyst note are stripped server-side. Before publish, even that same client gets `404` on its own report id — never `403`, so the response doesn't confirm a report exists for someone else. `GET .../export.pdf` gives staff or the owning client a server-rendered PDF of the same (sanitized, for a client) report; only a published report can be exported at all.
7. **Audit.** Every state-changing action (draft, flag review, engagement CRUD, controller-time) writes an append-only entry to `construction_bpo_audit_logs` (`GET /api/construction-bpo/audit`, staff-only), attributed to the acting session's label/staffId/role. Every one of those writes is best-effort EXCEPT the publish one (step 5).

There is **no scheduled job** that runs step 1–5 automatically on a weekly cadence — an analyst (or a future cron) has to trigger it. This mirrors the same gap `docs/BPO_PRODUCTION_READINESS.md` notes for the monthly-report generator.

## Roles

| Role | Can |
|---|---|
| `admin` / `manager` / `analyst` (staff) | import, generate/regenerate drafts, review flags, publish, read any client's reports/engagements/metrics, log controller time, export any report as PDF, read the audit trail |
| `client` | read only its own `clientId`'s **published** reports (approved flags only, no notes), export its own published reports as PDF; everything else is `403` |
| anything else (no session, or a non-staff session with no `clientId`) | `403` on every route in this file — see FORBIDDEN in `routes/construction-bpo.js`'s header. A non-staff session must carry a real `clientId` even to reach the client-scoped routes; it is never enough to just not be staff. |

A session's role lives on `req.tsmSession` (signed cookie, `middleware/require-auth.js`), set at login (`POST /api/auth/login`) from the admin password, a staff access code, or a per-client access code — the same login endpoint and client registry (`middleware/client-registry.js`) every other BPO-style vertical in this app uses; there is nothing construction-specific about client onboarding.

## API reference

| Method | Path | Who | Notes |
|---|---|---|---|
| `POST` | `/api/construction-bpo/import` | staff | multipart `file`, optional `clientId` (uses its engagement's source/columnMap as default), optional `source`/`columnMap` (override, audited when clientId given) |
| `POST` | `/api/construction-bpo/weekly-reports` | staff | builds + stores a draft using the client's engagement thresholds unless overridden; `409` if already published |
| `PATCH` | `/api/construction-bpo/weekly-reports/:id/flags/:flagId` | staff | `{ status: 'approved'\|'dismissed', note? }`; `409` once published |
| `GET` | `/api/construction-bpo/weekly-reports[?clientId=&status=]` | staff or own-clientId client | staff sees everything (optionally filtered); client forced to own id + `published`, flags sanitized |
| `GET` | `/api/construction-bpo/weekly-reports/:id` | staff or own-clientId client | `404` (not `403`) if not yours or still a draft |
| `GET` | `/api/construction-bpo/weekly-reports/:id/export.pdf` | staff or owning client | same scoping as GET :id; `409 not_published` for staff on a draft |
| `POST` | `/api/construction-bpo/weekly-reports/:id/publish` | staff | `409 flags_pending` / `409 already_published`; fails closed (`503`) on its own audit write |
| `GET` | `/api/construction-bpo/audit[?entityId=&limit=]` | staff | |
| `POST`/`GET`/`PATCH`/`DELETE` | `/api/construction-bpo/engagements[/:clientId]` | staff | `{ clientId, name, thresholds, coSlaHours, columnMap, source }`, one per clientId |
| `GET` | `/api/construction-bpo/engagements/:clientId/metrics` | staff | weeks delivered/on-time/late, flag counts, controller-time totals |
| `POST` | `/api/construction-bpo/engagements/:clientId/controller-time` | staff | `{ week, minutes }`, upserted per clientId+week |

## The Sample GC fixture

`server/construction-bpo/fixtures/sample-gc.js` is a hand-built 8-job, 4-week demo portfolio for client id `sample-gc` (a placeholder name, never a real company — see the demo banner in `workbench.html`). Each job is built to isolate exactly one condition so the fixture doubles as a worked example of every flag type:

| Job | Demonstrates |
|---|---|
| J-101 | `COST_OVERRUN` trigger A — clean week 1, fires weeks 2–4 |
| J-102 | `COST_OVERRUN` trigger B — clean week 1, fires weeks 2–4 |
| J-103 | `OVERBILLED`, all 4 weeks |
| J-104 | `UNDERBILLED`, all 4 weeks; one of the 2 missing lien waivers |
| J-105 | `LOW_MARGIN`, all 4 weeks; the other missing lien waiver |
| J-106 | `INCOMPLETE_DATA` — `totalEstimatedCost` never supplied |
| J-107 | `physicalProgressStatus: 'not_provided'`, zero flags ever — the "this is not a flag" case |
| J-108 | clean baseline; hosts `RETAINAGE_VARIANCE`, the one short lien waiver, and one of the 3 change orders that go SLA-stalled from week 2 on |

`buildWeekInput(weekIndex)` (0–3) returns a ready-to-POST input object; `buildAllWeeks()` returns all 4. `scripts/test-construction-bpo-sample-gc-fixtures.js` asserts the exact expected flag set per job per week — run it whenever the fixture or an engine's thresholds change.

`workbench.html` has "Load Sample GC — Week 1/2/3/4" buttons that populate the editable tables directly from a copy of this fixture (kept in sync with the server module by hand — there's no shared-code mechanism between an HTML `<script>` and a Node module here, so if you change the fixture, update both).

## Engagements & pilot metrics

An **engagement** (`construction_bpo_engagements`, one per `clientId`) holds a client's standing deal terms — `thresholds` (the same `{ wip, retainage }` shape `buildWeeklyReportDraft()` takes), `coSlaHours` (mapped onto `thresholds.slaHours`), and import defaults (`source`, `columnMap`) — so an analyst doesn't re-type them into every request. A request body's own `thresholds`/`source`/`columnMap` still wins for that one call; the override is recorded in that action's audit metadata (`thresholdOverride`, `sourceOverride`, `columnMapOverride`).

`GET .../engagements/:clientId/metrics` (`server/construction-bpo/metrics.js`) reports, for one client:
- **weeksDelivered / weeksOnTime / weeksLate** — only `published` reports count. "On time" means published by 23:59 **America/Phoenix** (fixed UTC-7, no DST) of the first **Wednesday strictly after** `weekEnding` — a `weekEnding` that's itself a Wednesday still gets the *next* one, never same-day.
- **flags** — pending/approved/dismissed/total, summed across every report on file for the client (draft + published).
- **controllerTime** — total minutes + the entries themselves, from `POST .../controller-time` (`{ week, minutes }`, upserted per clientId+week — re-logging a week corrects it, doesn't double-count).

## Testing

```
node scripts/test-construction-bpo-import.js
node scripts/test-construction-bpo-wip.js
node scripts/test-construction-bpo-change-orders.js
node scripts/test-construction-bpo-retainage.js
node scripts/test-construction-bpo-lien-waivers.js
node scripts/test-construction-bpo-weekly-report.js
node scripts/test-construction-bpo-routes.js
node scripts/test-construction-bpo-sample-gc-fixtures.js
node scripts/test-construction-bpo-flag-review.js
node scripts/test-construction-bpo-engagements.js
node scripts/test-construction-bpo-metrics.js
node scripts/test-construction-bpo-metrics-route.js
node scripts/test-construction-bpo-publish-fail-closed.js
node scripts/test-construction-bpo-scope-forbidden.js
node scripts/test-construction-bpo-pdf-export.js
```

All of the above run offline (fake Mongo / in-memory stubs) and are picked up automatically by `npm test` (`scripts/run-tests.js` globs `test-construction-*.js`).

### Live-Mongo + Playwright acceptance test

`scripts/test-construction-bpo-mongo-live.js` is opt-in and also picked up by the same glob, but skips itself cleanly (exit 0) unless **both** `MONGODB_URI` and `BPO_MONGO_LIVE=1` are set — so it never slows down or risks a real database in ordinary CI/local runs. It hard-refuses (exit 1) if the environment looks like a real deployment (`NODE_ENV=production` or `FLY_APP_NAME` set), checked before the opt-in vars.

What it proves, against a real MongoDB-compatible backend:
- a real BPO client created via the existing client registry
- a week-1 draft generated, then **publish refused `409 flags_pending` against the real store** while its flags are still undecided; every flag approved for real via `PATCH .../flags/:flagId`, confirmed by reading the stored document directly; publish then succeeds and republish is `409`
- a week-2 draft (both `COST_OVERRUN` triggers, 3 stalled COs) stays scoped away from the client until published
- the real client, logged in with its real access code, sees exactly its own published report and `404`s on the still-draft one
- a real engagement created and persisted, pilot metrics reflecting the one real published week, controller time logged and persisted
- a real PDF export (`%PDF-` magic bytes, `application/pdf`) of the published report
- Playwright drives the real `workbench.html` and `client-portal.html` against this same live server and checks for zero page errors

Run it:
```
set -a; . ~/.tsm-mongo.env; set +a
BPO_MONGO_LIVE=1 node scripts/test-construction-bpo-mongo-live.js
```
It tags every record it creates and deletes them (client, reports, engagement, controller-time entry, only its own tagged audit entries) in a `finally` block regardless of outcome, and prints Mongo counts before/after so a human can confirm cleanup actually happened.
**Never point it at a production `MONGODB_URI`** — the production-environment refusal is a backstop, not a substitute for pointing it at a test database on purpose.

**Actually run against a real database** (not just dry-run verified) on 2026-10-17 against `~/.tsm-mongo.env`'s `MONGODB_URI`: **33/33 passed**, and cleanup was independently re-verified afterward with a fresh connection querying every touched collection (`bpo_clients`, `construction_bpo_weekly_reports`, `construction_bpo_engagements`, `construction_bpo_controller_time`, `construction_bpo_audit_logs`) for anything still tagged with that run — zero in every one. That first live run also caught a real bug in the script itself: `cleanup()` closed the shared `mongoClient` before `main()`'s `finally` block did its own after-cleanup verification read, so that read silently failed and the "before → after" confirmation line never printed — the deletions themselves had already succeeded, but the script couldn't prove it. Fixed by not closing the connection until the very end, after that verification read; a second live run then printed the full confirmation line as intended.

## Known gaps

- No scheduled weekly-report generation job (manual trigger only — see "Weekly operational workflow" above).
- `workbench.html`'s Sample GC demo data is a hand-copied mirror of the fixture module, not a shared import — keep both in sync by hand if the fixture changes.
- **Regenerating a draft resets flag review.** Re-submitting the same client+week while still a draft rebuilds `flags` from scratch (`weekly-report.js`), so every flag goes back to `pending` even if an analyst had already approved/dismissed the previous version — there is no merge of review state across a regeneration. For a re-import mid-week this is probably the right behavior (fresh data deserves fresh review), but it means an analyst who tweaks one number after reviewing everything has to re-review everything.
- No notification (email/Slack) on publish — a client has to know to check the portal or that a new PDF is available.
- The "on time" deadline (Wed 23:59 America/Phoenix of the week after `weekEnding`) is a judgment call this runbook made, not something a client contract specified — confirm it matches the client's actual SLA before using `weeksOnTime`/`weeksLate` in anything client-facing.
- Controller-time has no edit/delete API beyond upsert-by-week — logging the wrong number for a week and wanting to zero it out means POSTing `{ week, minutes: 0 }`, not deleting the entry.
- The PDF export is a plain cover sheet (summary + flag list) generated with the same `pdfkit` pattern as the existing BPO evidence-package export — it does not include per-job tables, charts, or a logo/branding pass; nobody has asked for those yet.
- No rate limit specific to this file's routes (relies on whatever general `apiLimiter` the app applies elsewhere) and no pagination on `GET /weekly-reports` or `GET /audit` — fine at pilot scale, worth revisiting before a client with years of weekly history exists.
