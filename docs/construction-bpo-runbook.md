# Construction BPO — Runbook

_Covers the Construction BPO weekly GC financial review service on `feat/construction-bpo` (PR #256). Last verified 2026-10-17 against this branch's `npm test` (99/99 suites) and a dry run of the live-Mongo acceptance test against a stubbed driver (see "Live-Mongo + Playwright acceptance test" below) — no real `MONGODB_URI` is reachable from this sandbox, so the live-against-real-Mongo path itself still needs a human to run it once._

## What this service does

Every week, an analyst reviews a general contractor client's job data and produces one **weekly report**: per-job WIP (work-in-progress) status, change-order SLA tracking, retainage variance, and lien-waiver compliance, combined into a single draft the analyst checks before the client ever sees it. Publishing is a one-way gate — a client can never see a draft, only a report their analyst has explicitly published.

```
import (CSV/XLSX)  ──┐
manual entry       ──┼─► workbench.html (analyst review/edit) ─► POST /weekly-reports (draft)
                      │                                              │
                      │                                    analyst reviews flags
                      │                                              │
                      │                                    POST .../publish (one-way)
                      │                                              │
                      └──────────────────────────────────────────────▼
                                                          client-portal.html (client, read-only,
                                                          published-only, own clientId only)
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
| Mongo persistence + audit | `server/construction-bpo/store.js` |
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

Two things worth remembering because they're easy to get backwards:
- **`physicalPercentComplete` not supplied ≠ a flag.** `physicalProgressStatus: 'not_provided'` is just a status field on the job result — it only *prevents* `COST_OVERRUN` trigger A from ever firing for that job, it isn't itself something to alert on.
- `COST_OVERRUN` trigger A is deliberately **not** checked against cost-to-cost `percentComplete` (that's the same ratio the trigger's own cost side already uses — see `wip.js`'s header for the bug that shipped once from conflating the two). It needs the independent, PM-reported `physicalPercentComplete`.

Pass a `thresholds` object (`{ wip, slaHours, retainage }`) into `buildWeeklyReportDraft()` / the `POST /weekly-reports` route body to override any of the above per report.

## Weekly operational workflow

1. **Import.** Analyst uploads the GC's CSV/XLSX export in `workbench.html` (`POST /api/construction-bpo/import`, staff-only). `source` selects a known column-alias set (`sage|foundation|procore|quickbooks`); `columnMap` lets a client-specific header override ride along per request. Import is stateless — it returns parsed jobs + a validation report, nothing is persisted yet.
2. **Review.** The analyst edits the imported (or manually entered) jobs, change orders, retainage, and lien-waiver tables directly in the workbench before generating anything — this is the human check the spec calls the "analyst review gate."
3. **Generate draft.** `POST /api/construction-bpo/weekly-reports` with `clientId`, `weekEnding`, and the four arrays builds the draft (pure compute, `weekly-report.js`) and stores it, keyed `clientId__weekEnding`. Re-submitting the same client+week while still a draft **upserts** — it is not an error to regenerate a draft.
4. **Publish.** `POST /api/construction-bpo/weekly-reports/:id/publish` (staff-only) is one-way: publishing an already-published report is `409`, never a silent no-op, and regenerating a draft for an already-published client+week is also `409` — a report the client has already seen can never be silently rewritten.
5. **Client view.** Once published, the client (and only that client, and only that report) can see it in `client-portal.html`. Before publish, even that same client gets `404` on its own report id — never `403`, so the response doesn't confirm a report exists for someone else.
6. **Audit.** Every draft-generated and publish event writes an append-only entry to `construction_bpo_audit_logs` (`GET /api/construction-bpo/audit`, staff-only), attributed to the acting session's label/staffId/role.

There is **no scheduled job** that runs step 1–4 automatically on a weekly cadence — an analyst (or a future cron) has to trigger it. This mirrors the same gap `docs/BPO_PRODUCTION_READINESS.md` notes for the monthly-report generator.

## Roles

| Role | Can |
|---|---|
| `admin` / `manager` / `analyst` (staff) | import, generate/regenerate drafts, publish, read any client's reports, read the audit trail |
| `client` | read only its own `clientId`'s **published** reports; everything else (import, generate, publish, audit) is `403` |

A session's role lives on `req.tsmSession` (signed cookie, `middleware/require-auth.js`), set at login (`POST /api/auth/login`) from the admin password, a staff access code, or a per-client access code — the same login endpoint and client registry (`middleware/client-registry.js`) every other BPO-style vertical in this app uses; there is nothing construction-specific about client onboarding.

## API reference

| Method | Path | Who | Notes |
|---|---|---|---|
| `POST` | `/api/construction-bpo/import` | staff | multipart `file`, optional `source`/`columnMap` |
| `POST` | `/api/construction-bpo/weekly-reports` | staff | builds + stores a draft; `409` if already published |
| `GET` | `/api/construction-bpo/weekly-reports[?clientId=&status=]` | any | staff sees everything (optionally filtered); client forced to own id + `published` |
| `GET` | `/api/construction-bpo/weekly-reports/:id` | any | `404` (not `403`) if not yours or still a draft |
| `POST` | `/api/construction-bpo/weekly-reports/:id/publish` | staff | one-way; `409` if already published |
| `GET` | `/api/construction-bpo/audit[?entityId=&limit=]` | staff | |

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
```

All of the above run offline (fake Mongo / in-memory stubs) and are picked up automatically by `npm test` (`scripts/run-tests.js` globs `test-construction-*.js`).

### Live-Mongo + Playwright acceptance test

`scripts/test-construction-bpo-mongo-live.js` is opt-in and also picked up by the same glob, but skips itself cleanly (exit 0) unless **both** `MONGODB_URI` and `BPO_MONGO_LIVE=1` are set — so it never slows down or risks a real database in ordinary CI/local runs. It hard-refuses (exit 1) if the environment looks like a real deployment (`NODE_ENV=production` or `FLY_APP_NAME` set), checked before the opt-in vars.

What it proves, against a real MongoDB-compatible backend:
- a real BPO client created via the existing client registry
- a week-1 draft generated and published through the real HTTP routes, then confirmed by **reading `construction_bpo_weekly_reports` and `construction_bpo_audit_logs` directly** — not just trusting the HTTP response
- republish is `409` against the real store
- a week-2 draft (both `COST_OVERRUN` triggers, 3 stalled COs) stays scoped away from the client until published
- the real client, logged in with its real access code, sees exactly its own published report and `404`s on the still-draft one
- Playwright drives the real `workbench.html` and `client-portal.html` against this same live server and checks for zero page errors

Run it:
```
MONGODB_URI=<your test database> BPO_MONGO_LIVE=1 node scripts/test-construction-bpo-mongo-live.js
```
It tags every record it creates and deletes them (client, both reports, only its own tagged audit entries) in a `finally` block regardless of outcome, and prints Mongo counts before/after so a human can confirm cleanup actually happened. **Never point it at a production `MONGODB_URI`** — the production-environment refusal is a backstop, not a substitute for pointing it at a test database on purpose.

This was dry-run verified in this development sandbox (no real MongoDB credentials reachable here) by temporarily stubbing the `mongodb` driver with the same in-memory fake `scripts/test-construction-bpo-routes.js` uses — 23/23 assertions passed and cleanup brought every collection count back to zero. That is not the same as having run it against a real database; do that at least once before relying on this service with real client data.

## Known gaps

- No scheduled weekly-report generation job (manual trigger only — see "Weekly operational workflow" above).
- `workbench.html`'s Sample GC demo data is a hand-copied mirror of the fixture module, not a shared import — keep both in sync by hand if the fixture changes.
- No PDF/export of a published report; the client portal is the only client-facing presentation today.
- No notification (email/Slack) on publish — a client has to know to check the portal.
- The live-Mongo acceptance test has not yet been run against a real `MONGODB_URI` from any environment (see above) — only dry-run verified against a stub.
