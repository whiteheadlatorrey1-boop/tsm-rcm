#!/usr/bin/env python3
"""
patch-schools-writeback.py

Schools Command Center already has its own BNCA exposure projection
(renderBusinessImpactDelta) and exception/case queue wiring — more mature
than logistics/supplier-vendor. The one gap it shares with them is the
"exec bypasses strategist" problem: schools-strategist.html never stamps
the relay payload, so schools-executive-portal.html has no way to show
whether a strategist actually reviewed it before the exec did.

This adds just that missing piece:
  - schools-strategist.html: stamps reviewedAt after render(), written
    directly to storage + via TSM.relay.write when available.
  - schools-executive-portal.html: renders a review badge from
    data.reviewedAt, right after the financials panel.

Every edit is an exact string replace, asserted to occur exactly once
before being applied.

Usage:
    python3 scripts/patch-schools-writeback.py            # apply
    python3 scripts/patch-schools-writeback.py --check    # dry run
"""
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
STRATEGIST = ROOT / "html/war-rooms/schools-command/schools-strategist.html"
EXEC_PORTAL = ROOT / "html/war-rooms/schools-command/schools-executive-portal.html"

DRY_RUN = "--check" in sys.argv


def apply_patch(path: pathlib.Path, old: str, new: str, label: str):
    text = path.read_text()
    count = text.count(old)
    assert count == 1, (
        f"[{path.name}] expected exactly 1 match for '{label}', found {count}. "
        "File has drifted from the assumed shape — aborting."
    )
    assert old != new, f"[{path.name}] no-op patch for '{label}'"
    patched = text.replace(old, new, 1)
    if not DRY_RUN:
        path.write_text(patched)
    print(f"  ok   [{path.name}] {label}")


def patch_strategist():
    p = STRATEGIST
    assert p.exists(), f"missing {p}"

    apply_patch(
        p,
        old="""function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtVal(v, fmt){""",
        new="""function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Re-stamps the relay payload with a strategist review timestamp so the
// executive portal can tell a strategist actually reviewed it, instead of
// reading the command center's raw broadcast directly (the "exec bypasses
// strategist" gap fixed elsewhere in the platform). Written directly to
// storage (not just via TSM.relay.write) since this vertical's exec portal
// falls back to sessionStorage/localStorage when TSM.relay isn't present.
// Guarded so it fires once per fresh payload, not on every render() re-run.
function stampStrategistReview(data){
  if(!data || data.reviewedAt) return;
  data.reviewedAt = new Date().toISOString();
  try {
    sessionStorage.setItem(RELAY_KEY_FALLBACK, JSON.stringify(data));
    localStorage.setItem(RELAY_KEY_FALLBACK, JSON.stringify(data));
    if(window.TSM && window.TSM.relay && window.TSM.relay.write){
      window.TSM.relay.write(DOMAIN, data);
    }
  } catch(e){}
}

function fmtVal(v, fmt){""",
        label="strategist: add stampStrategistReview helper",
    )

    apply_patch(
        p,
        old="""  html += renderWipBoard(data.grant_wip);
  html += renderBusinessImpactDelta(data);
  html += renderActionQueue(data.records, breachIds);

  document.getElementById('wrap').innerHTML = html;
}""",
        new="""  html += renderWipBoard(data.grant_wip);
  html += renderBusinessImpactDelta(data);
  html += renderActionQueue(data.records, breachIds);

  document.getElementById('wrap').innerHTML = html;

  // Strategist re-stamps the relay payload so the executive portal can
  // show a "strategist reviewed" badge instead of just the command
  // center's raw hop.
  stampStrategistReview(data);
}""",
        label="strategist: render() calls stampStrategistReview",
    )


def patch_exec_portal():
    p = EXEC_PORTAL
    assert p.exists(), f"missing {p}"

    # CSS for the review badge
    apply_patch(
        p,
        old=""".model-note{font-family:var(--mono);font-size:.6rem;color:var(--muted);border-top:1px solid var(--border);padding-top:10px;margin-top:6px;}""",
        new=""".model-note{font-family:var(--mono);font-size:.6rem;color:var(--muted);border-top:1px solid var(--border);padding-top:10px;margin-top:6px;}
.meta-row{display:flex;gap:18px;flex-wrap:wrap;font-family:var(--mono);font-size:.6rem;color:var(--muted);margin-top:10px;}
.meta-row span{color:var(--text);}""",
        label="exec: meta-row CSS for review badge",
    )

    # Render helper
    apply_patch(
        p,
        old="""function renderFinancials(fin){""",
        new="""// "Strategist reviewed" badge — confirms this payload actually passed
// through schools-strategist.html's stampStrategistReview() rather than
// being read straight off the command center's raw broadcast.
function renderReviewBadge(data){
  if(!data || !data.reviewedAt){
    return '<div class="meta-row"><span style="color:var(--muted)">Awaiting strategist review</span></div>';
  }
  let t;
  try { t = new Date(data.reviewedAt).toLocaleTimeString(); } catch(e){ t = data.reviewedAt; }
  return '<div class="meta-row">Strategist reviewed <span style="color:var(--green)">' + escapeHtml(String(t)) + '</span></div>';
}

function renderFinancials(fin){""",
        label="exec: add renderReviewBadge helper",
    )

    # Wire into render()
    apply_patch(
        p,
        old="""  let html = '';
  html += renderFinancials(data.financials);

  if(data.ai_summary){""",
        new="""  let html = '';
  html += renderFinancials(data.financials);
  html += renderReviewBadge(data);

  if(data.ai_summary){""",
        label="exec: render() calls renderReviewBadge",
    )


def main():
    print(f"{'DRY RUN — ' if DRY_RUN else ''}patching schools-command strategist write-back gap...")
    patch_strategist()
    patch_exec_portal()
    print("done." if not DRY_RUN else "dry run complete, no files written.")


if __name__ == "__main__":
    main()
