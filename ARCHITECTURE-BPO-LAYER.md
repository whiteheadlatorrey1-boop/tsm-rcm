# TSM Platform — BPO Client Layer & Cross-Vertical Case Rollup
## Architecture checkpoint — 2026-08-25 (corrected)

**Correction notice:** an earlier version of this doc, committed the same
day, proposed building a Case Engine and a client-facing BPO shell from
scratch. That was wrong — both already exist, live, wired end to end. This
version replaces that one. It documents what's actually there (verified
against `server.js`, `server/tsm-ledger-service.js`,
`html/shared/tsm-case-manager.js`, `middleware/client-registry.js`, and
`html/client-portal.html`), and scopes the one real gap found in the process.

---

## 1. What already exists, end to end (verified)

```
 VERTICAL EXEC PORTALS                    CLIENT-FACING SIDE
 (HC, Construction, FinOps,
  Insurance, Legal, RE,
  Mortgage, Schools, PM-Copilot,
  HotelOps, NOC, BPO)
         │  loads
         ▼
 tsm-case-manager.js  ───────sync────►  POST/GET /api/bpo/cases
 (localStorage: tsm_cases_v1)               │
                                             ▼
                                    bpo_cases  (MongoDB, one doc per
                                     caseId, vertical-scoped field)
                                             │
                        ┌────────────────────┼────────────────────┐
                        ▼                                         ▼
              bpoBuildClientRollup(clientId)          memberCaseSummary(tenantId)
              → GET /api/bpo/reports/client-rollup    → GET /api/members/:id/summary
              (BPO_CLIENT_VIEW_ROLES: admin/           (BPO_INTERNAL_ROLES only —
               manager/analyst/**client**)              no client-role access)
                        │
                        ▼
              html/client-portal.html
              (its own auth: /api/auth/status,
               session { role:'client', clientId, label })
```

**Case creation and sync is real, not a stub.** Every vertical's executive
portal loads `html/shared/tsm-case-manager.js`, which keeps a local
(`localStorage`) case store and best-effort syncs it to
`POST /api/bpo/cases/:caseId` and `GET /api/bpo/cases`, both backed by the
`bpo_cases` MongoDB collection via `tsmLedger.bpoUpsertCase` /
`tsmLedger.bpoListCases`. This is called the "Universal Case Engine
(Roadmap #10)" in the ledger service's own comments — it's a named,
deliberate piece of work, already shipped.

**The client-facing shell already exists.** `html/client-portal.html` is a
working page with its own session check (`/api/auth/status`), an "Open
Work" and "SLA Events" view, and document download links — all driven by
`GET /api/bpo/reports/client-rollup`, which is role-gated so a `'client'`
session can only ever see `req.tsmSession.clientId`'s own rollup (server.js
enforces this server-side, not just hidden client-side).

**Internal data doesn't leak to clients by accident.** `client-package-generator.js`
maintains an explicit field policy — `SAFE` (passes through), `TRANSLATE`
(internal shorthand like exclusion codes get a human-readable label before
a client sees them), `INTERNAL` (never leaves the building — e.g.
`sourceNode`/`routing`, which "reveals your internal routing architecture").
This is the actual redaction boundary between operator data and client data.

**Cross-vertical rollup already exists as a named concept: the Member.**
`tsm_members` is a separate collection (deliberately distinct from
`bpo_clients` — see §2) keyed by `tenantId`, the same field `bpo_cases`
already carries. `memberCaseSummary(memberId)` aggregates real `bpo_cases`
documents filtered by `tenantId`, and returns exact counts broken out
`byVertical`, `byStatus`, `bySeverity`, plus a carefully-partial-aware
exposure total (a case with no `exposure` field is excluded from the sum,
not counted as `$0` — the summary also reports `isExposurePartial` so a UI
can show the difference between "$0 across N cases" and "no exposure data
yet"). This is exactly the aggregation a GCU-style engagement needs.

---

## 2. The actual gap — and why it isn't an oversight

`bpo_clients` (what `client-portal.html` and the `'client'` role are built
on) and `tsm_members` (the cross-vertical `tenantId` entity) are two
separate collections **by deliberate design**, per the comment in
`tsm-ledger-service.js`:

> "A Member is a cross-vertical demo tenant... Reusing `bpo_clients` would
> collide two meanings of 'client'" — a BPO client pays for document
> processing; a Member is the multi-vertical tenant whose cases roll up
> across verticals.

That's a sound distinction. The gap isn't the separation — it's that
**nothing bridges them for a client login.** Concretely:

- `middleware/client-registry.js` issues a session payload of exactly
  `{ role: 'client', clientId, label }` — no `tenantId` field, ever.
- `/api/members/:id/summary` (the route that actually returns
  `memberCaseSummary`, the cross-vertical rollup) is gated
  `requireRole(BPO_INTERNAL_ROLES)` — `'client'` is not in that list, by
  design, since `/api/members` is documented as tenant *administration*,
  "not something a `'client'` session should be listing/creating."
- So today: a GCU-style engagement spanning Mortgage + FinOps would exist
  correctly as a `Member` with a real cross-vertical `memberCaseSummary`
  rollup — but there is no client-facing route or session shape that
  surfaces it. A GCU contact logging into `client-portal.html` would see,
  at best, one vertical's `bpo_clients`-scoped rollup, or nothing, not the
  Member-level view the architecture already supports internally.

This is a small, well-bounded gap — reading data that already exists
correctly, not building new aggregation.

---

## 3. Scoped reconciliation — minimal-change plan

Goal: a client login can be *optionally* linked to a Member, and when it
is, the client-facing rollup widens from single-vertical to cross-vertical
automatically. Clients with no Member link keep exactly today's behavior —
this is additive, not a migration.

1. **Add an optional `tenantId` field to the `bpo_clients` document**
   (set at client creation or via a follow-up admin action — mirrors how
   `slaThresholdHours`/`pricingTier` already default unset and are safe to
   backfill later). No schema change needed elsewhere; `bpo_clients`
   already tolerates unset optional fields per its own comments.
2. **Carry `tenantId` in the client session payload** in
   `middleware/client-registry.js`, alongside the existing
   `{ role, clientId, label }` shape, populated from the client doc's
   `tenantId` if present.
3. **Branch the rollup route on that field.** In
   `GET /api/bpo/reports/client-rollup`: if `req.tsmSession.tenantId` is
   set, call `tsmLedger.memberCaseSummary(tenantId)` instead of
   `bpoBuildClientRollup(clientId)`; otherwise, unchanged. Keeps one route
   and one frontend fetch call in `client-portal.html` — the shape returned
   just gets richer (adds `byVertical`) when a Member link exists.
4. **Run the Member-scoped result through the same redaction boundary**
   `client-package-generator.js` already enforces for single-client
   rollups — the field policy shouldn't have a hole just because the data
   came from a different collection.
5. **Render the `byVertical` breakdown in `client-portal.html`** only when
   present in the response, so single-vertical clients see no UI change.

No change needed to `/api/members/*` (internal-role administration stays
internal-role), to `bpo_cases` (already vertical + tenantId scoped
correctly), or to `tsm-case-manager.js` (already syncing correctly).

---

## 4. Answering the open question from the original checkpoint

The original doc asked whether a single case can span multiple verticals.
Verified answer: **no, and it shouldn't** — a `bpo_cases` document is
always single-vertical (`vertical` is a scalar field, not an array), and
cross-vertical visibility is handled correctly one level up, at the
rollup/summary layer (`memberCaseSummary`), not by making an individual
case multi-vertical. GCU's Mortgage case and FinOps case stay two separate
case records; the Member rollup is what shows them together. No change
needed here — this was already solved correctly before this doc existed.

---

## 5. Remaining open questions

1. **Onboarding flow** — when a new multi-vertical client (e.g. GCU) signs
   on, does the admin flow create the `Member` first and the `bpo_clients`
   record second (with `tenantId` set at creation), or is linking always a
   follow-up step? Affects whether step 1 above needs its own admin UI or
   just a field on the existing client-creation form.
2. **Existing clients that should retroactively become Members** — is
   there a current `bpo_clients` record that's secretly already
   multi-vertical in practice (cases landing under its `clientId` from more
   than one vertical) that this reconciliation should backfill, or is this
   purely forward-looking for new engagements like GCU?

---

*This is a checkpoint, not a spec. Next step: confirm §5, then implement
§3 as a small, additive change — no new collections, no new Case Engine,
no new client shell.*
