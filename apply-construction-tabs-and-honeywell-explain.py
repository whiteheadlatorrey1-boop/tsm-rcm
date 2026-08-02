#!/usr/bin/env python3
"""
Apply-script: adds construction war-room persona tabs (new file, hub-curated to
4 genuinely construction-specific pages) and Honeywell explainability panels
(strategist + exec portal, grounded in the real relay payload fields — no
fabricated confidence score, since none exists in this payload shape).

Run from the repo root:
    python3 apply-construction-tabs-and-honeywell-explain.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent

def patch(path, old, new, expect=1):
    p = ROOT / path
    text = p.read_text()
    count = text.count(old)
    assert count == expect, f"{path}: expected {expect} match(es) for old_str, found {count}"
    p.write_text(text.replace(old, new))
    print(f"OK  patched {path}")

def create(path, content):
    p = ROOT / path
    assert not p.exists(), f"{path}: already exists, refusing to overwrite"
    p.write_text(content)
    print(f"OK  created {path}")

# ── 1. Construction persona tabs: new file ──────────────────────────────
create(
    "html/war-rooms/construct-war/construction-war-tabs.js",
    r"""(function () {
  // Curated against hub_index.html's Construction section only — construction-suite/
  // has other files (auditops-tax.html, construction-pro.html, financial.html,
  // compliance.html, etc.) that either aren't in the platform hub or are generic
  // shared modules parked under a construction-sounding filename (construction-pro.html
  // is a generic "AuditOps // Sovereign Core" console, same pattern as legal-tax.html;
  // financial.html and compliance.html are likewise generic, not construction-specific).
  var TABS = [
    { slug: 'pipeline', label: 'ENGINE PIPELINE',    kind: 'native' },
    { slug: 'command',  label: 'COMMAND HUB',        kind: 'iframe', src: '../../construction-suite/index.html' },
    { slug: 'fieldops', label: 'FIELD & DOC OPS',    kind: 'iframe', src: '../../construction-suite/construction-suite-expansion.html' },
    { slug: 'permits',  label: 'PERMITS & PROPOSALS', kind: 'iframe', src: '../../construction-suite/permits-proposals.html' },
    { slug: 'docs',     label: 'DOCUMENT SHOWCASE',   kind: 'iframe', src: '../../construction-suite/document-showcase.html' }
  ];

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function activate(slug) {
    TABS.forEach(function (t) {
      var btn = document.getElementById('pt-btn-' + t.slug);
      var panel = document.getElementById('tabpanel-' + t.slug);
      if (!btn || !panel) return;
      var isActive = t.slug === slug;
      btn.classList.toggle('active', isActive);
      panel.style.display = isActive ? '' : 'none';
      if (isActive && t.kind === 'iframe' && !panel.dataset.loaded) {
        var frame = panel.querySelector('iframe');
        if (frame) {
          frame.src = t.src;
          panel.dataset.loaded = '1';
        }
      }
    });
    try { history.replaceState(null, '', '#' + slug); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('.nav');
    var layout = document.querySelector('.layout');
    if (!nav || !layout) return;

    layout.id = 'tabpanel-pipeline';

    var bar = el('div', { class: 'persona-tab-bar', id: 'personaTabBar' });
    bar.style.cssText = 'display:flex;gap:2px;padding:0 16px;background:var(--bg2);' +
      'border-bottom:1px solid var(--border);overflow-x:auto;';
    TABS.forEach(function (t) {
      var btn = el('button', { id: 'pt-btn-' + t.slug, class: 'pt-btn' + (t.slug === 'pipeline' ? ' active' : '') }, t.label);
      btn.style.cssText = "font-family:'Courier New',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;" +
        'padding:10px 14px;background:transparent;border:none;border-bottom:2px solid transparent;' +
        'color:var(--text-dim);cursor:pointer;white-space:nowrap;transition:.15s;';
      btn.addEventListener('click', function () { activate(t.slug); });
      bar.appendChild(btn);
    });
    nav.insertAdjacentElement('afterend', bar);

    var styleTag = document.createElement('style');
    styleTag.textContent = '.pt-btn:hover{color:var(--green)}' +
      '.pt-btn.active{color:var(--gold);border-bottom-color:var(--gold)}' +
      '.persona-tab-panel iframe{width:100%;height:calc(100vh - 210px);border:none;display:block}';
    document.head.appendChild(styleTag);

    TABS.filter(function (t) { return t.kind === 'iframe'; }).forEach(function (t) {
      var panel = el('div', { id: 'tabpanel-' + t.slug, class: 'persona-tab-panel' });
      panel.style.display = 'none';
      panel.appendChild(el('iframe', { title: t.label, loading: 'lazy' }));
      layout.insertAdjacentElement('afterend', panel);
    });

    var initial = (location.hash || '').replace('#', '');
    activate(TABS.some(function (t) { return t.slug === initial; }) ? initial : 'pipeline');
  });
})();
""",
)

# ── 2. Wire the tabs script into construction-war-room.html ────────────
patch(
    "html/war-rooms/construct-war/construction-war-room.html",
    "</body>\n</html>",
    '<script src="./construction-war-tabs.js"></script>\n</body>\n</html>',
)

# ── 3. Fix leftover copy-paste placeholder text ("LEGAL WAR ROOM") ─────
patch(
    "html/war-rooms/construct-war/construction-war-room.html",
    '<div class="hud-title" id="hudTitle">LEGAL WAR ROOM</div>',
    '<div class="hud-title" id="hudTitle">CONSTRUCTION WAR ROOM</div>',
)

# ── 4. Honeywell strategist + exec portal: explain-panel CSS ───────────
EXPLAIN_CSS = (
    ".explain-panel{background:var(--bg2);border:1px solid var(--border);border-left:2px solid var(--amber);border-radius:6px;padding:14px 18px;margin-bottom:16px;}\n"
    ".explain-title{font-family:'Orbitron',sans-serif;font-size:.62rem;color:var(--amber);letter-spacing:.1em;margin-bottom:10px;}\n"
    ".explain-row{padding:6px 0;border-top:1px solid var(--border);}\n"
    ".explain-row:first-of-type{border-top:none;}\n"
    ".explain-node{font-family:'Orbitron',sans-serif;font-size:.6rem;color:var(--cyan);letter-spacing:.05em;margin-right:10px;}\n"
    ".explain-score{font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--text);}\n"
    ".explain-text{font-family:'JetBrains Mono',monospace;font-size:.62rem;color:var(--muted);margin-top:3px;line-height:1.5;}"
)

for f in ("html/war-rooms/honeywell-strategist.html", "html/war-rooms/honeywell-executive-portal.html"):
    patch(
        f,
        ".no-items{font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted);}",
        ".no-items{font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted);}\n" + EXPLAIN_CSS,
    )

# ── 5. Honeywell strategist: getExplainItems/renderExplainItems + wire-in ──
patch(
    "html/war-rooms/honeywell-strategist.html",
    """function tertiaryLabel(source){
  if(source==='supplier') return 'ORDERS AT RISK';
  return 'RISK SCORE';
}""",
    """function tertiaryLabel(source){
  if(source==='supplier') return 'ORDERS AT RISK';
  return 'RISK SCORE';
}

// Grounded in the actual relay payload shape (data.kpis.*, data.outputs) — this
// payload carries no confidence/ML score field, unlike legal/construction's
// node-score model, so this cites which structured field each KPI came from
// and which war room wrote it, rather than fabricating a confidence number.
function getExplainItems(data){
  const items = [];
  const k = data.kpis || {};
  const src = data.source || 'unknown';
  const srcLabel = SOURCE_META[src] ? SOURCE_META[src].label : src.toUpperCase();

  const exposureVal = kpiExposure(k.exposure);
  if (exposureVal !== '—') {
    items.push({
      label: 'FINANCIAL EXPOSURE',
      value: exposureVal,
      explain: `Read directly from kpis.exposure in the ${srcLabel} relay payload${data.docType ? ' (source doc type: ' + data.docType + ')' : ''} — not recomputed on this page.`
    });
  }

  const secKpi = k.buffer || k.containment;
  const secVal = kpiSecondary(secKpi);
  if (secVal !== '—') {
    items.push({
      label: secondaryLabel(src),
      value: secVal,
      explain: `Read directly from kpis.${k.buffer ? 'buffer.bufferDays' : 'containment.containmentEta'} as written by the ${srcLabel} war room.`
    });
  }

  const terKpi = k.orders || k.risk;
  const terVal = kpiTertiary(terKpi);
  if (terVal !== '—') {
    items.push({
      label: tertiaryLabel(src),
      value: terVal,
      explain: `Read directly from kpis.${k.orders ? 'orders.ordersAtRisk' : 'risk'} as written by the ${srcLabel} war room.`
    });
  }

  if (data.outputs && data.outputs.length) {
    items.push({
      label: '6-ENGINE ANALYSIS',
      value: data.outputs.length + ' engine output' + (data.outputs.length === 1 ? '' : 's'),
      explain: `The KPI figures above are the war room's own computation across its 6-engine pipeline — this page displays them, it does not independently re-score or re-weight them.`
    });
  }

  return items;
}

function renderExplainItems(items){
  if (!items.length) return '';
  return `<div class="explain-panel">
    <div class="explain-title">WHY THESE NUMBERS</div>
    ${items.map(it => `<div class="explain-row">
      <span class="explain-node">${escapeHtml(it.label)}</span>
      <span class="explain-score">${escapeHtml(it.value)}</span>
      <div class="explain-text">${escapeHtml(it.explain)}</div>
    </div>`).join('')}
  </div>`;
}""",
)

patch(
    "html/war-rooms/honeywell-strategist.html",
    "  </div>`;\n\n  if(data.docText){",
    "  </div>`;\n\n  html += renderExplainItems(getExplainItems(data));\n\n  if(data.docText){",
)

# ── 6. Honeywell exec portal: getExplainItems/renderExplainItems + wire-in ──
patch(
    "html/war-rooms/honeywell-executive-portal.html",
    """function tertiaryLabel(source){
  if(source==='supplier') return 'ORDERS AT RISK';
  return 'RISK SCORE';
}""",
    """function tertiaryLabel(source){
  if(source==='supplier') return 'ORDERS AT RISK';
  return 'RISK SCORE';
}

// Grounded in the actual relay payload shape (data.kpis.*, data.outputs) — this
// payload carries no confidence/ML score field, so this cites which structured
// field each KPI came from and which war room wrote it, rather than fabricating
// a confidence number. Mirrors honeywell-strategist.html's version.
function getExplainItems(data){
  const items = [];
  const k = data.kpis || {};
  const src = data.source || 'unknown';
  const srcLabel = SOURCE_META[src] ? SOURCE_META[src].label : src.toUpperCase();

  const exposureVal = kpiExposure(k.exposure);
  if (exposureVal !== '—') {
    items.push({
      label: 'FINANCIAL EXPOSURE',
      value: exposureVal,
      explain: `Read directly from kpis.exposure in the ${srcLabel} relay payload${data.docType ? ' (source doc type: ' + data.docType + ')' : ''} — not recomputed on this page.`
    });
  }

  const secKpi = k.buffer || k.containment;
  const secVal = kpiSecondary(secKpi);
  if (secVal !== '—') {
    items.push({
      label: secondaryLabel(src),
      value: secVal,
      explain: `Read directly from kpis.${k.buffer ? 'buffer.bufferDays' : 'containment.containmentEta'} as written by the ${srcLabel} war room.`
    });
  }

  const terKpi = k.orders || k.risk;
  const terVal = kpiTertiary(terKpi);
  if (terVal !== '—') {
    items.push({
      label: tertiaryLabel(src),
      value: terVal,
      explain: `Read directly from kpis.${k.orders ? 'orders.ordersAtRisk' : 'risk'} as written by the ${srcLabel} war room.`
    });
  }

  if (data.outputs && data.outputs.length) {
    items.push({
      label: '6-ENGINE ANALYSIS',
      value: data.outputs.length + ' engine output' + (data.outputs.length === 1 ? '' : 's'),
      explain: `The KPI figures above are the war room's own computation across its 6-engine pipeline, escalated as-is by the strategist — this page displays them without re-scoring.`
    });
  }

  return items;
}

function renderExplainItems(items){
  if (!items.length) return '';
  return `<div class="explain-panel">
    <div class="explain-title">WHY THESE NUMBERS</div>
    ${items.map(it => `<div class="explain-row">
      <span class="explain-node">${escapeHtml(it.label)}</span>
      <span class="explain-score">${escapeHtml(it.value)}</span>
      <div class="explain-text">${escapeHtml(it.explain)}</div>
    </div>`).join('')}
  </div>`;
}""",
)

patch(
    "html/war-rooms/honeywell-executive-portal.html",
    '  </div>`;\n\n  // The last of the 6 engines is always the "Executive Dispatch" summary —',
    '  </div>`;\n\n  html += renderExplainItems(getExplainItems(data));\n\n  // The last of the 6 engines is always the "Executive Dispatch" summary —',
)

print("\nAll patches applied.")