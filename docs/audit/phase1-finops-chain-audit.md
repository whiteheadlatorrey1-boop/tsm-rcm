# Phase 1 — FinOps relay-chain audit

## Note on history
A prior session traced this chain and wrote a first version of
`tests/playwright/finops-relay-chain.spec.js`, but it was never committed —
searched every branch and full commit history on both `DevShon1976/TSM-Consultz`
and `whiteheadlatorrey1-boop/tsm-rcm`, no trace of the file anywhere. This is a
fresh recreation, re-verified against current `main`, not a restore of the old
one. Re-verifying against current source also surfaced a real regression that
the original trace wouldn't have caught (see below) — the codebase has moved
since that first pass (a `#155`-era commit mentions fixing the Sentinel relay
contract for FinOps, but the fix landed in the wrong file).

## Real chain, as traced from current source

Unlike Healthcare, FinOps's chain genuinely is the doc-search -> war-room ->
strategist -> exec -> sentinel shape end to end for the first three hops:

1. **doc-search -> war-room**: `tsm-doc-search-multi.html` writes
   `tsm_fo_docsearch_relay` (`{ts, summary, doc}`) -> read by
   `html/finops-suite/finops-war-room.html`, which populates `#docPaste` and
   clears the key after consuming it. Confirmed working.

2. **war-room -> strategist**: war room writes via
   `TSM_KERNEL.setRelay("finops-suite", payload)`, landing in
   `tsm_war_relay_finops-suite` as `{ts, v, p}` (kernel envelope, `p` is a
   JSON string). `html/finops-suite/finops-main-strategist.html` reads it and
   renders into `#stratOutput`. Confirmed working.

3. **strategist -> exec portal**: `relayToExecutive()` in the real, linked
   `finops-main-strategist.html` writes `tsm_strategist_relay`
   (`{summary, source, timestamp, exposure, riskScore, exceptions, ...}`).
   `finops-executive-portal.html` reads it (`RELAY_KEYS` includes it as a
   fallback) and renders the exposure figure on the page. Confirmed working.

4. **strategist -> Sentinel Center: BROKEN — orphaned-file bug, same class as
   Healthcare's.** There are two files named `finops-main-strategist.html`:
   - `html/finops-suite/finops-main-strategist.html` — the real, live one.
     Every actual link in the app (`finops-war-room.html`'s nav buttons and
     auto-escalate, the autorun pipeline's `strategistPath`,
     `finops-executive-portal.html`'s "OPEN STRATEGIST" buttons) points here,
     either directly or via relative `nav('finops-main-strategist.html')`
     calls from within `finops-suite/`. This file has **zero** references to
     `STRATEGIST_RELAY` anywhere.
   - `html/finops-main-strategist.html` — a root-level duplicate that *does*
     correctly write `TSM_FINOPS_STRATEGIST_RELAY` in the Sentinel-convention
     shape (`{generatedAt, anomalies: [...]}`). Checked every reference to this
     exact absolute path across the repo: nothing links to it. It's orphaned.

   Net effect: Sentinel Center's FinOps row can never go LIVE from any real
   user action — the file with the correct sentinel-push logic is unreachable
   from the actual chain, and the file everyone actually uses never writes the
   key. Sentinel's own read side is fine (`finops-executive-portal.html`
   already lists `TSM_FINOPS_STRATEGIST_RELAY` first in its `RELAY_KEYS`
   fallback array), so this is purely a wrong-file bug, not a contract
   mismatch. **[NOT FIXED — flagged for Phase 3, not silently patched.]**

## Spec approach
Same approach as Healthcare: seed real payload shapes per hop via
`page.addInitScript`, assert genuine rendering on the next page. The last test
is intentionally a "documented broken" test — it seeds the key directly to
prove Sentinel's read contract is correct, while the audit note above records
that no real code path ever writes it. If the orphaned/live files get merged
or the write gets moved, this test should keep passing (it's testing the read
side, which already works); the fix that actually matters is wiring the write
into the live file, which isn't a Playwright-testable claim without also
driving a full document analysis + AI call.
