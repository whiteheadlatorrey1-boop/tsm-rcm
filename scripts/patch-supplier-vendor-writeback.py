#!/usr/bin/env python3
"""
patch-supplier-vendor-writeback.py

Ports the logistics strategist write-back + BNCA exposure + exception-queue
fix (commit 7b9f3f76) onto supplier-vendor, which uses the identical bespoke
template (DOMAIN='VENDOR', RELAY_KEY_FALLBACK='TSM_VENDOR_WAR_RELAY').

Every edit is an exact string replace, asserted to occur exactly once in
the target file before being applied — if a target file has drifted from
the assumed shape, this script fails loudly instead of silently mismatching
or double-patching.

Usage:
    python3 scripts/patch-supplier-vendor-writeback.py            # apply
    python3 scripts/patch-supplier-vendor-writeback.py --check    # dry run
"""
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
STRATEGIST = ROOT / "html/supplier-vendor/supplier-vendor-strategist-v2.html"
EXEC_PORTAL = ROOT / "html/supplier-vendor/supplier-vendor-executive-portal.html"

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

    # 1. script includes before the inline <script> block
    apply_patch(
        p,
        old='<div class="wrap" id="wrap"><!-- populated by JS --></div>\n'
            '<div class="toast" id="toast"></div>\n'
            '<script>\n'
            "function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString();}",
        new='<div class="wrap" id="wrap"><!-- populated by JS --></div>\n'
            '<div class="toast" id="toast"></div>\n'
            '<script src="/html/js/tsm-bnca-exposure-engine.js"></script>\n'
            '<script src="/html/shared/tsm-exec-framework.js"></script>\n'
            '<script>\n'
            "function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString();}",
        label="strategist: framework script includes",
    )

    # 2. helper functions inserted after renderEmpty()
    apply_patch(
        p,
        old="""function renderEmpty(){
  document.getElementById('wrap').innerHTML = `
    <div class="empty">
      <h2>NO DATA RECEIVED</h2>
      <p>Run the extraction engine in the Supplier/Vendor war room, then relay it here.</p>
      <div class="hdr-btns" style="justify-content:center;">
        <a class="hbtn primary" href="supplier-vendor-situation-room.html">&#128717; Go to War Room</a>
      </div>
    </div>`;
}""",
        new="""function renderEmpty(){
  document.getElementById('wrap').innerHTML = `
    <div class="empty">
      <h2>NO DATA RECEIVED</h2>
      <p>Run the extraction engine in the Supplier/Vendor war room, then relay it here.</p>
      <div class="hdr-btns" style="justify-content:center;">
        <a class="hbtn primary" href="supplier-vendor-situation-room.html">&#128717; Go to War Room</a>
      </div>
    </div>`;
}

// Parses a strict money literal ($8.2M, $450K, $1,200,000) out of the AI's
// free-text revenueAtRisk field. Returns null on anything that doesn't
// cleanly match \u2014 never guesses a number out of ambiguous text.
function parseMoneyLoose(s){
  if(!s) return null;
  const m = String(s).trim().match(/^\\$?([\\d,]+(?:\\.\\d+)?)\\s*(K|M|B)?$/i);
  if(!m) return null;
  const n = parseFloat(m[1].replace(/,/g,''));
  if(!isFinite(n)) return null;
  const mult = {K:1e3, M:1e6, B:1e9}[(m[2]||'').toUpperCase()] || 1;
  return n * mult;
}

// BNCA exposure projection \u2014 deterministic, sourced only from this
// incident's own revenueAtRisk figure (already relayed from the war room).
// Honestly reports "unavailable" when that figure isn't in a fixed money
// format, rather than fabricating a number from ambiguous text.
function computeExposureBNCA(ex){
  if(!window.TSMBNCAExposureEngine) return null;
  const base = parseMoneyLoose(ex.revenueAtRisk);
  if(base === null || base <= 0){
    return { unavailable: true, reason: 'revenue at risk is not in a fixed money format' };
  }
  const sevMap = { CRITICAL:'CRIT', HIGH:'HIGH', MEDIUM:'MED' };
  return window.TSMBNCAExposureEngine.project({
    baseExposure: base,
    severity: sevMap[ex.severity] || 'MED',
    confidence: Number.isFinite(ex.confidence) ? ex.confidence : 70,
    daysUntilDeadline: 0
  });
}

// Re-stamps the relay payload with a strategist review timestamp so the
// executive portal can tell a strategist actually reviewed it, instead of
// reading the war room's raw broadcast directly (the "exec bypasses
// strategist" gap fixed elsewhere in the platform). Written directly to
// storage (not just via TSM.relay.write) since the exec portal here reads
// straight from sessionStorage/localStorage. Guarded so it fires once per
// fresh payload, not on every render() re-run.
function stampStrategistReview(data){
  if(!data || data.reviewedAt) return;
  data.reviewedAt = new Date().toISOString();
  try {
    sessionStorage.setItem(RELAY_KEY_FALLBACK, JSON.stringify(data));
    localStorage.setItem(RELAY_KEY_FALLBACK, JSON.stringify(data));
    if(window.TSM && window.TSM.relay && window.TSM.relay.write){
      window.TSM.relay.write(DOMAIN, data, { caseId: data.caseId, stage: 'strategist' });
    }
  } catch(e){}
}""",
        label="strategist: parseMoneyLoose/computeExposureBNCA/stampStrategistReview helpers",
    )

    # 3. wire into render()
    apply_patch(
        p,
        old="""  html += renderRisks(ex.risks);
  html += renderBnca(ex.bnca);

  document.getElementById('wrap').innerHTML = html;
}""",
        new="""  html += renderRisks(ex.risks);
  html += renderBnca(ex.bnca);

  if(window.TSMExecFramework){
    html += window.TSMExecFramework.renderBNCA(computeExposureBNCA(ex));
  }

  document.getElementById('wrap').innerHTML = html;

  // Strategist re-stamps the relay payload so the executive portal can
  // show a "strategist reviewed" badge instead of just war room's raw hop.
  stampStrategistReview(data);
}""",
        label="strategist: render() wiring",
    )


def patch_exec_portal():
    p = EXEC_PORTAL
    assert p.exists(), f"missing {p}"

    # 1. CSS additions (kpi-row/kpi/kpi-val/kpi-lbl + meta-row)
    apply_patch(
        p,
        old=".no-items{font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted);}\n"
            ".toast{position:fixed;bottom:20px;right:20px;background:var(--bg2);border:1px solid var(--gold);color:var(--gold);padding:10px 18px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:.65rem;opacity:0;pointer-events:none;transition:.3s;z-index:50;}\n"
            ".toast.show{opacity:1;transform:translateY(-4px);}",
        new=".no-items{font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted);}\n"
            ".toast{position:fixed;bottom:20px;right:20px;background:var(--bg2);border:1px solid var(--gold);color:var(--gold);padding:10px 18px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:.65rem;opacity:0;pointer-events:none;transition:.3s;z-index:50;}\n"
            ".toast.show{opacity:1;transform:translateY(-4px);}\n"
            ".kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;}\n"
            ".kpi{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:16px;text-align:center;}\n"
            ".kpi-val{font-family:'Orbitron',sans-serif;font-size:1.3rem;font-weight:700;color:var(--gold);}\n"
            ".kpi-val.red{color:var(--red);}.kpi-val.green{color:var(--green);}.kpi-val.cyan{color:var(--cyan);}\n"
            ".kpi-lbl{font-size:.6rem;color:var(--muted);margin-top:6px;font-family:'JetBrains Mono',monospace;letter-spacing:.08em;}\n"
            ".meta-row{display:flex;gap:18px;flex-wrap:wrap;font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);margin-top:10px;}\n"
            ".meta-row span{color:var(--text);}",
        label="exec: kpi-row/meta-row CSS",
    )

    # 2. exception-queue mount point + script includes before inline <script>
    apply_patch(
        p,
        old='<div class="wrap" id="wrap"><!-- populated by JS --></div>\n'
            '<div class="toast" id="toast"></div>\n'
            '<script>\n'
            "function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString();}",
        new='<div class="wrap" id="wrap"><!-- populated by JS --></div>\n'
            '<div class="wrap" id="excWrap" style="padding-top:0;"><div id="tsm-exception-queue"></div></div>\n'
            '<div class="toast" id="toast"></div>\n'
            '<script src="/html/js/tsm-bnca-exposure-engine.js"></script>\n'
            '<script src="/html/shared/tsm-exec-framework.js"></script>\n'
            '<script>\n'
            "function tick(){document.getElementById('clock').textContent=new Date().toLocaleTimeString();}",
        label="exec: exception mount + framework script includes",
    )

    # 3. loadRelay() checks TSM.relay first, plus new helper functions
    apply_patch(
        p,
        old="""function loadRelay(){
  try {
    const raw = sessionStorage.getItem(RELAY_KEY_FALLBACK) || localStorage.getItem(RELAY_KEY_FALLBACK);
    return raw ? JSON.parse(raw) : null;
  } catch(e){ return null; }
}""",
        new="""function loadRelay(){
  try {
    if(window.TSM && window.TSM.relay && window.TSM.relay.read){
      const d = window.TSM.relay.read(DOMAIN);
      if(d) return d;
    }
  } catch(e){}
  try {
    const raw = sessionStorage.getItem(RELAY_KEY_FALLBACK) || localStorage.getItem(RELAY_KEY_FALLBACK);
    return raw ? JSON.parse(raw) : null;
  } catch(e){ return null; }
}

// Parses a strict money literal ($8.2M, $450K, $1,200,000) out of the AI's
// free-text revenueAtRisk field. Returns null on anything that doesn't
// cleanly match \u2014 never guesses a number out of ambiguous text.
function parseMoneyLoose(s){
  if(!s) return null;
  const m = String(s).trim().match(/^\\$?([\\d,]+(?:\\.\\d+)?)\\s*(K|M|B)?$/i);
  if(!m) return null;
  const n = parseFloat(m[1].replace(/,/g,''));
  if(!isFinite(n)) return null;
  const mult = {K:1e3, M:1e6, B:1e9}[(m[2]||'').toUpperCase()] || 1;
  return n * mult;
}

// BNCA exposure projection \u2014 deterministic, sourced only from this
// incident's own revenueAtRisk figure (same calculation the strategist
// page runs). Honestly reports "unavailable" when that figure isn't in a
// fixed money format, rather than fabricating a number from ambiguous text.
function computeExposureBNCA(ex){
  if(!window.TSMBNCAExposureEngine) return null;
  const base = parseMoneyLoose(ex.revenueAtRisk);
  if(base === null || base <= 0){
    return { unavailable: true, reason: 'revenue at risk is not in a fixed money format' };
  }
  const sevMap = { CRITICAL:'CRIT', HIGH:'HIGH', MEDIUM:'MED' };
  return window.TSMBNCAExposureEngine.project({
    baseExposure: base,
    severity: sevMap[ex.severity] || 'MED',
    confidence: Number.isFinite(ex.confidence) ? ex.confidence : 70,
    daysUntilDeadline: 0
  });
}

// Generic exception feeder for this vertical's own risks list \u2014 no
// fabricated fields, same convention as the rest of the platform.
// Self-dedupes per page load.
var _exceptionsSeen = {};
function feedVendorExceptions(ex){
  if(!window.TSMExceptions || !ex || !Array.isArray(ex.risks)) return;
  ex.risks.forEach(function(r){
    if(!r || !r.text) return;
    const key = 'vendor:' + r.text.slice(0,60);
    if(_exceptionsSeen[key]) return;
    _exceptionsSeen[key] = true;
    const lvl = String(r.level||'MED').toUpperCase();
    const severity = (lvl === 'CRITICAL' || lvl === 'HIGH') ? 'high' : (lvl === 'MED' ? 'med' : 'low');
    try {
      window.TSMExceptions.add({
        sector: 'vendor',
        entityType: 'vendor-risk',
        entityId: key,
        title: r.text,
        severity: severity,
        source: 'Supplier/Vendor Strategist'
      });
    } catch(e){}
  });
}""",
        label="exec: loadRelay TSM.relay check + parseMoneyLoose/computeExposureBNCA/feedVendorExceptions",
    )

    # 4. wire review badge + BNCA into render(), before EXECUTIVE ACTIONS section
    apply_patch(
        p,
        old="""  html += renderRiskRegister(ex.risks);

  html += `<div class="sec"><div class="sec-hdr"><span class="lbl">EXECUTIVE ACTIONS</span></div>""",
        new="""  html += renderRiskRegister(ex.risks);

  // Strategist-reviewed badge + exposure projection, so this page reflects
  // the strategist's actual second hop instead of just war room's raw
  // broadcast.
  if(window.TSMExecFramework){
    html += window.TSMExecFramework.renderReviewBadge(data);
    html += window.TSMExecFramework.renderBNCA(computeExposureBNCA(ex));
  }

  html += `<div class="sec"><div class="sec-hdr"><span class="lbl">EXECUTIVE ACTIONS</span></div>""",
        label="exec: render() review badge + BNCA panel",
    )

    # 5. feed exception queue + mount widget after innerHTML assignment
    apply_patch(
        p,
        old="""    ${renderExecLog(data.exec_actions)}
  </div>`;

  document.getElementById('wrap').innerHTML = html;
}""",
        new="""    ${renderExecLog(data.exec_actions)}
  </div>`;

  document.getElementById('wrap').innerHTML = html;

  // Feed the exception queue from this vertical's own risks data \u2014 no
  // fabricated fields, same convention as the rest of the platform.
  if(window.TSMExceptions && window.TSMExceptionWidget){
    feedVendorExceptions(ex);
    window.TSMExceptionWidget.mount('tsm-exception-queue', { sector: 'vendor' });
  }
}""",
        label="exec: render() exception feed + widget mount",
    )

    # 6. tail script includes for exceptions + widget
    apply_patch(
        p,
        old="""window.addEventListener('TSM_RELAY_EVENT', e => { if(e.detail && e.detail.domain === DOMAIN) render(); });
</script>
  <script src="/html/war-rooms/_relay_control_plane/relay.core.js"></script>
  <script src="/html/core/tsm-runtime.js"></script>
</body>
</html>""",
        new="""window.addEventListener('TSM_RELAY_EVENT', e => { if(e.detail && e.detail.domain === DOMAIN) render(); });
</script>
  <script src="/html/war-rooms/_relay_control_plane/relay.core.js"></script>
  <script src="/html/shared/tsm-exceptions.js"></script>
  <script src="/html/js/widgets/tsm-exception-widget.js"></script>
  <script src="/html/core/tsm-runtime.js"></script>
</body>
</html>""",
        label="exec: tail script includes (exceptions + widget)",
    )


def main():
    print(f"{'DRY RUN — ' if DRY_RUN else ''}patching supplier-vendor write-back gap...")
    patch_strategist()
    patch_exec_portal()
    print("done." if not DRY_RUN else "dry run complete, no files written.")


if __name__ == "__main__":
    main()
