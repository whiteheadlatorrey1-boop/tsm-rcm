/**
 * TSM Exec Framework v1.0
 * --------------------------------------------------------------------------
 * Shared, reusable rendering layer for the TSM Exec Kit "explain" contract:
 *   { id, claim, confidence, severity, impact, rationale, sources, dataPoints }
 *
 * One render function, used by every vertical's strategist/executive-portal
 * page, instead of each page re-implementing its own risk register markup.
 *
 * Consumes the CSS var convention already defined in each page's :root
 * (--bg, --bg2, --cyan, --amber, --green, --red, --muted, --border, --text),
 * so it inherits the page's theme automatically — no extra vars required.
 *
 * Usage (inside an existing render() function):
 *   html += TSMExecFramework.renderRiskRegister(data.explain, { isExec: CFG.isExec });
 * ========================================================================== */

(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  var SEVERITY_LABEL = { high: 'HIGH', med: 'MED', low: 'LOW' };
  var SEVERITY_RANK = { high: 0, med: 1, low: 2 };

  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items
      .filter(function (it) { return it && it.claim; })
      .slice()
      .sort(function (a, b) { return (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3); });
  }

  /**
   * renderRiskRegister(items, opts)
   * items: array from engine.getExplainItems() — the raw contract shape.
   * opts.isExec: bool — expands the register (shows full rationale + data
   *   points inline) for executive portals; strategist pages get a
   *   collapsed <details> view to keep the page scannable.
   * opts.label: section header text (default "RISK REGISTER").
   * opts.emptyText: shown when there are no items.
   */
  function renderRiskRegister(items, opts) {
    opts = opts || {};
    var label = opts.label || 'RISK REGISTER';
    var norm = normalizeItems(items);

    if (!norm.length) {
      return '<div class="sec"><div class="sec-hdr">' + label + '</div>' +
        '<div class="no-items">' + (opts.emptyText || 'No explainable risk items \u2014 all clear.') + '</div></div>';
    }

    var rows = norm.map(function (it) {
      var sev = it.severity && SEVERITY_LABEL[it.severity] ? it.severity : 'med';
      var conf = (it.confidence != null) ? Math.round(it.confidence) + '%' : null;
      var sources = Array.isArray(it.sources) ? it.sources : [];
      var dataPoints = Array.isArray(it.dataPoints) ? it.dataPoints : [];

      var head =
        '<div class="risk-head">' +
          '<span class="risk-badge risk-' + sev + '">' + SEVERITY_LABEL[sev] + '</span>' +
          '<span class="risk-claim">' + escapeHtml(it.claim) + '</span>' +
          (conf ? '<span class="risk-conf">' + conf + ' conf.</span>' : '') +
        '</div>';

      var impact = it.impact ? '<div class="risk-impact">' + escapeHtml(it.impact) + '</div>' : '';

      var dp = dataPoints.length
        ? '<div class="risk-datapoints">' + dataPoints.map(function (d) {
            return '<span class="risk-dp"><span class="risk-dp-lbl">' + escapeHtml(d.label) + '</span>' +
              '<span class="risk-dp-val">' + escapeHtml(d.value) + '</span></span>';
          }).join('') + '</div>'
        : '';

      var rationale = it.rationale ? '<div class="risk-rationale">' + escapeHtml(it.rationale) + '</div>' : '';
      var src = sources.length ? '<div class="risk-sources">Source: ' + sources.map(escapeHtml).join(', ') + '</div>' : '';

      var body = impact + dp + rationale + src;

      if (opts.isExec) {
        // Executive portals: everything visible, no click required.
        return '<div class="risk-item risk-' + sev + '-item">' + head + body + '</div>';
      }
      // Strategist pages: collapsed by default, expand for the full trace.
      return '<details class="risk-item risk-' + sev + '-item"><summary>' + head + '</summary>' + body + '</details>';
    }).join('');

    return '<div class="sec"><div class="sec-hdr">' + label + ' &middot; ' + norm.length + '</div><div class="risk-register">' + rows + '</div></div>';
  }

  global.TSMExecFramework = {
    renderRiskRegister: renderRiskRegister,
    normalizeItems: normalizeItems
  };

})(typeof window !== 'undefined' ? window : this);
