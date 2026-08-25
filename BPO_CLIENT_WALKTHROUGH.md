# TSM Consultz — BPO Client-Facing Chain
## Doc Intake → War Room → Strategist → Executive Portal → Client Portal

**Scope:** the one vertical chain that ends in a real client-facing login,
not just an internal exec portal. Companion to `MASTER_VERTICAL_WALKTHROUGH.md`
(which covers the 8 internal-only verticals) — this doc is BPO-specific and
was out of that doc's scope. All onClick chains and routes below are
verified against the live HTML/JS/server code, not assumed.

---

## 0. The Story (use before touching any screen)

**Talk points:**
- "Every other vertical chain ends with a leadership decision inside the
  building. This one keeps going — all the way out to the client's own
  login."
- "A document comes in, three internal screens work it, and then the
  client themselves can log in and see their own numbers — without ever
  touching the internal tooling."
- "As of this session, that client view can also span every vertical a
  client engages TSM on, not just BPO — if they're linked to a Member."

---

## 1. Intake — `tsm-doc-search-multi.html`

- Shared entry point for every vertical, including BPO — same file the
  8-vertical chain in `MASTER_VERTICAL_WALKTHROUGH.md` starts from.
- A document is uploaded, extracted, classified, and routed. For a
  BPO-sector document, routing lands the operator in `bpo-war-room.html`.

---

## 2. War Room — `html/war-rooms/bpo-war/bpo-war-room.html`

**Relay key:** `TSM_BPO_WAR_RELAY`

- **⚡ FIRE EXTRACTION ENGINE** (`#fireEngineBtn`) — `fireExtractionEngine()`.
- **⚡ LAUNCH** (manual paste path) — `bpoLaunchManual()`.
- **ROUTE TO STRATEGIST →** (`#routeBtn` / `#stratBtn`) — `routeToStrategist()`.
- **⬇ EXPORT** — `exportBrief()`.
- Real file uploads go through `bpoLoadFile()`, which POSTs to
  `/api/bpo/work-items/:caseId/documents` and pulls server-extracted text
  back via `GET .../documents/:docId/text` — not a client-side-only
  FileReader parse, so PDF/DOCX/XLSX content is actually read, not mangled.
- `storeWarRoomRelay()` is the real handoff function: writes the relay
  payload to `sessionStorage` + `localStorage` under `TSM_BPO_WAR_RELAY`,
  calls `TSM.relay.write("BPO", ...)`, and — additively — creates a Mission
  Core record via `TSMMissionModel.createMission()`.

**Talk points:**
- "Fire Extraction Engine reads the actual uploaded document — coding
  errors, missing fields, whatever's really in it — not a canned response."
- "Route to Strategist isn't just a link. It's writing real state the next
  screen reads back out."

**A real inconsistency worth knowing, not papering over:** the Mission
record's `tenantId` falls back to the literal string `'default'` when no
active Member is set (`window.TSMActiveMember.getId() || 'default'`), not
`null`. The shared module it reads from (`html/shared/tsm-active-member.js`)
documents its own contract as "never guessed... `null`, same as before this
layer existed" — this one call site doesn't follow that contract. Doesn't
break anything functional today (nothing currently queries Missions by a
literal `'default'` tenantId), but don't demo it as "this always resolves
the real Member" — it silently degrades to a placeholder string instead of
staying honestly empty.

---

## 3. Strategist — `html/war-rooms/bpo-war/bpo-strategist.html`

- **⚡ GENERATE STRATEGY BRIEF** (`#fireStratBtn`) — `fireStrategy()`.
- **SLA REPORT / CLIENT BRIEF / ESCALATIONS** — `pullSLAReport()` /
  `pullClientBrief()` / `pullEscalations()`.
- **⬇ EXPORT CLIENT PACKAGE** — `exportClientPackage()`.
- **ESCALATE TO EXECUTIVE →** (`#escalateBtn` / `#escalateBtnBar`) —
  `escalateToExec()`.
- **⬇ EXPORT STRATEGY** — `exportBrief()`.

**Talk points:**
- "Strategy Brief isn't cold — it inherited the war room's extraction."
- "Client Brief is a real preview of what the client's own portal is about
  to show them, generated here first for internal review."

**Note:** `exportClientPackage()` (the `TSMDeliveryPackage.build()`
integration) exists on this Strategist screen but **not** on the BPO
Executive Portal — the reverse of what a prior session's notes claimed was
shipped there. Verified directly by grep against both files; don't promise
"Export Client Package" on the BPO exec portal itself.

---

## 4. Executive Portal — `html/war-rooms/bpo-war/bpo-executive-portal.html`

- **APPROVE STRATEGY / ASSIGN OWNERS / NOTIFY STAKEHOLDERS** (Decision
  Center) — `dcAct('approve' | 'assign' | 'notify')`.
- **EXPORT BRIEF** (`#dc-export-btn`) — `exportBrief()`.
- **◈ GENERATE LIVE EXECUTIVE BRIEF — AI SYNTHESIS** (`#liveBriefBtn`) —
  `generateLiveExecBrief()`.
- **✓ ACKNOWLEDGE / ↑ ESCALATE** (`#bpo-ack-btn` / `#bpo-esc-btn`) —
  `recordExecAction('acknowledged' | 'escalated', ...)`.
- **APPROVE & EXECUTE** (per Case Queue item) — `approveQueueItem(...)` —
  mutates both the DOM and the real underlying `TSMCaseManager` record.
- **✓ MARK EXECUTED** — `markExecuted()`.

**Talk points:**
- "This is the last internal screen. Everything a client is about to see
  in their own portal was decided here first."

---

## 5. Client Portal — `html/client-portal.html`

**This is the one screen in the whole platform a client logs into directly**
— no admin/manager/analyst role, a real session-gated login.

- `boot()` calls `GET /api/auth/status` first; anything other than an
  authenticated `role: 'client'` session shows the login gate, not the
  workspace.
- `loadRollup()` calls `GET /api/bpo/reports/client-rollup` — this is the
  one route that now branches (see §6 below).
- Renders: Total Work Items, Avg Open Age, By Status, By Priority — plus,
  **new as of this session**, "Across Verticals" and "Exposure" cards that
  only appear for a Member-linked client (empty/absent otherwise, zero
  layout change for every existing single-vertical client).
- Case list and SLA event breakdown render from `rollup.cases` /
  `rollup.slaEventsByType`.
- Logout calls `POST /api/auth/logout`, redirects to `login.html`.

**Talk points:**
- "This is the payoff of the whole chain — the client didn't have to ask
  anyone for a status update. It's just here, live, the moment they log in."

---

## 6. NEW: Cross-Vertical Client Linking (this session)

**What it is:** a client login can optionally be linked to a Member
(`tenantId`) — a cross-vertical tenant tracked in `tsm_members`, distinct
from a single BPO `clientId`. Unlinked clients (the default, and every
pre-existing client) are completely unaffected.

**How to link a client, live, in the demo:**
1. Open `html/bpo-clients-admin.html` (admin-only).
2. Find the client card → **Member link** section.
3. Pick a Member from the dropdown → **Link**.
4. That client's *next* login (not their already-open session — sessions
   are signed at login time and don't retroactively pick up a new link)
   carries the Member's `tenantId`.

**What changes for a linked client:**
- `GET /api/bpo/reports/client-rollup` returns the cross-vertical rollup
  (`bpoBuildMemberClientRollup`, reading real cases from every vertical's
  Case Engine — `bpo_cases` — not just the BPO work-item pipeline) instead
  of the single-clientId BPO-only rollup.
- The client portal's two new cards (Across Verticals, Exposure) populate.

**Talk points:**
- "GCU-style engagement — a client that's more than one vertical to us.
  Before this, their portal could only ever show BPO numbers. Now it shows
  everything, from the same login."
- "Nothing retrofits automatically — linking is a deliberate admin action,
  and it's reversible (Unlink button, same panel)."

**Honest caveats, said out loud rather than glossed over:**
- Verified end-to-end against a real database in this session (login →
  link → session → rollup branch, all confirmed with a real
  `memberId`-tagged response) — but only with a synthetic test Member that
  had zero real cases tagged against it. The *numbers themselves*
  (`byVertical` counts, `exposureTotal`) haven't been checked against a
  real Member with real multi-vertical case history yet.
- The admin-UI Member-linking panel in `bpo-clients-admin.html` calls
  `PATCH /api/bpo/clients/:id` (the ledger-backed route), which is a
  different code path from the `POST /api/admin/clients/:id/link-member`
  route also added this session (the login-registry-only path, used by the
  retrofit script). Both are wired to end up in the same place — the login
  registry's `tenantId` field — but they were each verified separately, not
  as one combined flow through the UI panel itself.

---

*Verified against live source in `tsm-rcm` repo (post-`0001-feat-bpo-link-
client-registry-logins-to-cross-vertic.patch`). onClick/route bindings
confirmed by direct grep against the HTML/JS/server files, not inferred
from naming conventions or from prior session notes — several of which
(the BPO client-selector wiring, the BPO exec-portal Delivery Package
wiring) turned out not to have actually landed on `main` despite being
described elsewhere as shipped.*
