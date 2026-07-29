# Phase 2 Mission Core — Healthcare & BPO Verification

Verification-only pass (no code changes required) confirming Mission Core
wiring for the final two verticals, completing Phase 2 across all 10
verticals.

## Healthcare — `hc-main-strategist.html`

- Output panel id confirmed as `#strat-out` (not `strat-output` — correcting
  a stale reference from earlier notes; the code already used the correct
  id, so no bug existed here).
- Escalate button selector confirmed:
  `.pack-btn[onclick="escalateToExecPortal()"]`, matches actual markup.
- `TSMMissionModel.createMission()` fires inside `escalateToExecPortal()`,
  immediately after `fireCapabilitySweep_HEALTHCARE(payload)`.
- Wrapped in try/catch, non-fatal — `TSM_EXEC_RELAY` write always succeeds
  even if Mission Core creation fails.

**Pattern:** single mission created fresh at the exec-escalation step.

## BPO — `bpo-war-room.html` + `bpo-strategist.html`

- Mission created once at **intake** (`bpo-war-room.html`), keyed by
  `caseId`, additive to the existing `TSM.relay.write("BPO", ...)` call.
- Strategist page hydrates the same mission on load:
  `window.tsmMission = TSMMissionStore.getMission(warData.caseId)`.
- `escalateToExec()` calls `storeStratRelay()`, which transitions the
  mission to `IN_PROGRESS`, adds an audit event via
  `TSMMissionModel.addAuditEvent()`, and writes it back with
  `TSMMissionStore.saveMission()` — no duplicate mission is created at
  escalation.

**Pattern:** single mission, lifecycle-tracked from intake through
strategist through exec escalation.

## Note for reviewers

Healthcare and BPO use two different but both-valid Mission Core patterns:

- **HC:** mission born at exec-escalation time.
- **BPO:** mission born at intake, updated through its lifecycle via
  `caseId` lookup.

Neither is wrong. HC's implementation was modeled on BPO's naming
convention (`createMissionFromIntake`-style) but not its lifecycle stage.
Recommend a deliberate decision before converging these — do not "fix"
either to match the other without one.

## Dependencies / outstanding items

- Both verticals' `saveMission()` calls depend on the `RELAY_REGISTRY`
  `'MISSION'` domain fix (confirmed landed; Phase 10–12 verification
  passed post-fix).
- BPO's strategist-side mission hydration depends on `warData.caseId`
  being reliably populated from `TSM_BPO_WAR_RELAY` — same relay plumbing
  used elsewhere in the file, not a new risk, just a noted dependency.
- A duplicate-ticket bug was found in `data/wip-master.json` during this
  verification pass: 5x identical `"Resolve: HC Strategist Relay"` entries
  (all `HIGH` risk, `Unassigned`) auto-created within ~22 minutes, with no
  apparent deduplication. Source not yet identified — worth investigating
  what's firing this and whether it's tied to the HC strategist relay path
  exercised during this verification. Not yet fixed; `wip-master.json`
  changes from this session were reverted rather than committed.

## Status

Phase 2 (wiring `createMission()` into all 10 vertical
escalation/relay points) is now **complete** across all 10 verticals:
BPO, Healthcare, Construction, Real Estate, FinOps, Legal, Insurance,
Honeywell, Mortgage, Schools.
