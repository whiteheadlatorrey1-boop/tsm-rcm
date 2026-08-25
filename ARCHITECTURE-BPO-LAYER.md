# TSM Platform — Vertical Apps / Case Engine / BPO Operations Layer
## Architecture checkpoint — 2026-08-25

Status: proposal, not yet implemented. Written as a checkpoint before designing
the GCU-style client engagement model, so that model gets built against a named
architecture instead of an ad-hoc one.

---

## 0. Why this checkpoint exists

Every client engagement to date has meant handing over (or demoing) a specific
vertical's full three-screen chain — War Room, Strategist, Executive Portal.
That's fine for a sales demo. It's the wrong shape for a service engagement
where the client should be submitting and authorizing work, not operating
inside the platform's own UI.

The fix isn't a new build. It's naming a layer that already exists in embryonic
form and finishing it:

```
                      TSM PLATFORM
                            │
              ┌─────────────┴─────────────┐
              │                           │
        VERTICAL APPS               BPO OPERATIONS
     (War Room → Strategist            (client-facing
        → Exec Portal,                  submit/authorize
        per §1-8 of                     surface — no
        MASTER_VERTICAL_                platform access)
        WALKTHROUGH.md)
              │                           │
              └──────────► CASE ENGINE ◄──┘
                                │
                                ▼
                        BPO CASE QUEUE
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                 Review      Execute      Report
```

The client relationship point is the BPO Operations layer, not the vertical
UI. The vertical apps keep doing exactly what they do today — they become
internal tooling that TSM operators use to work the queue, not something a
client ever sees directly.

---

## 1. What already exists (confirmed against source)

**Every vertical already normalizes into the same three-layer chain** — this
is the entire premise of `MASTER_VERTICAL_WALKTHROUGH.md` and it holds for all
8 verticals (HC, Construction, FinOps, Insurance, Legal, RE, Mortgage,
Schools). That's most of the hard part of a Case Engine already done: there's
one consistent internal shape to route work through, not eight bespoke ones.

**A vertical-agnostic event taxonomy is already declared**, in
`html/shared/runtime/adapters/bpo-runtime-adapter.js`:

```
client.intake → document.received → processing.started → processing.completed
              → quality.exception → sla.breach → delivery.completed → invoice.ready
```

This is, functionally, the Case Engine's state machine — it's just not wired
to anything yet. `html/shared/runtime/rules/bpo.js` is registered against the
`"BPO"` domain but is currently a no-op pass-through (`return input`), i.e. a
placeholder waiting for real routing logic.

**Two relay mechanisms already move state between screens** (per the
walkthrough's cross-vertical patterns section): legacy verticals use
per-action JS functions (`escalateToStrategist()`, `writeExecRelay()`),
newer ones use a standardized `sessionStorage` + `localStorage` +
`TSM_RELAY_EVENT` pattern (Mortgage, Schools). The newer pattern is the one
worth extending to feed the Case Engine, since it's already decoupled from any
single vertical's DOM.

**Known landmine, flagged in `ARCHITECTURE-NOTES.md`:** there have historically
been duplicate/non-equivalent kernel and enforcer files (`/core/tsm-kernel.js`
vs `/html/core/tsm-kernel.js`, differing payload shapes) and a duplicate `bpo`
vertical directory. Those notes say the duplicates were resolved as of
2026-07-04, but a fresh grep today shows the specific paths named in that
note no longer exist — worth a quick re-audit before building the Case Engine
on top of the kernel, so we're wiring to the currently-canonical file, not a
stale reference from a resolved-but-since-moved duplication.

---

## 2. What "BPO Operations" needs to be, concretely

Not a ninth vertical. A **client-facing shell** that:

- Lets a client submit/authorize work (documents, decisions, approvals)
  without ever loading `hc-denial-war-room.html` or any other operator screen.
- Writes into the same Case Engine event taxonomy above — a client submission
  is a `client.intake` event regardless of which vertical it's ultimately
  routed to.
- Surfaces status back to the client (`processing.started` →
  `delivery.completed`) without exposing *how* the work got done — the
  vertical apps, engines, and Strategist reports stay internal.
- Lets a TSM operator work the underlying case through the existing vertical
  chain (War Room → Strategist → Exec Portal) exactly as today. Nothing about
  the operator experience needs to change.

This is what makes the "don't hand GCU your platform" model work mechanically,
not just contractually: the client's access surface is architecturally
separate from the vertical apps, not just role-gated within them.

---

## 3. Open questions before implementation

1. **Which relay pattern does the Case Engine standardize on?** Recommend the
   Mortgage/Schools pattern (`sessionStorage`+`localStorage`+custom event)
   since it's already vertical-agnostic; the legacy per-function relays would
   need individual adapters.
2. **Kernel/enforcer re-audit** — confirm current canonical paths before the
   Case Engine reads/writes through them (see landmine note above).
3. **Case Queue ownership** — does a case get assigned to an operator, or
   pulled? Affects whether the BPO layer needs its own queue UI or just a
   client-status view.
4. **Multi-vertical cases** — a single client (e.g. GCU) will likely generate
   cases across more than one vertical (say, Mortgage + FinOps). Does the
   Case Engine need a case ever to fan out to multiple vertical chains, or is
   one case always single-vertical with cross-vertical rollup happening only
   at the BPO reporting layer?

---

*This doc is a checkpoint, not a spec. Next step: answer §3, then scope the
BPO shell as its own build against the existing event taxonomy rather than
against any single vertical's UI.*
