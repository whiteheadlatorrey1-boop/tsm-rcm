/* ═══════════════════════════════════════════════════════════
   TSM INTAKE GATEWAY — RENDERER
   /architecture/kernel/intake-gateway-render.js
   Drop into tsm-doc-search-multi.html after upload/parse completes.
   Reuses the .node-event / .meta-grid / .rtag / .status-pill CSS
   classes already defined in tsm-hc-demo-trail.html so the same
   visual language works in both the live gateway and the demo.
   Requires: metadata-engine.js, relevance-engine.js,
             tsm-registry-verticals.js loaded first.
═══════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  function pillClass(confidence) {
    if (confidence >= 75) return "pill-routed";
    if (confidence >= 40) return "pill-processing";
    return "pill-pending";
  }

  function pillLabel(confidence) {
    if (confidence >= 75) return "✓ High Confidence";
    if (confidence >= 40) return "⏳ Review Suggested";
    return "⏳ Low Confidence";
  }

  /** Builds the meta-grid rows shown under a ranked recommendation. */
  function metaRowsForEntry(entry) {
    const rows = entry.matched.map((k) => ({ k, v: "✔ matched", cls: "hi" }));
    if (entry.seeded) {
      rows.push({ k: "Seed Source", v: entry.seedReason || "War Room Prep", cls: "warn" });
    }
    rows.push({ k: "Confidence", v: entry.confidencePct + "%", cls: entry.confidencePct >= 75 ? "hi" : "" });
    return rows;
  }

  /** One recommendation card — primary or secondary. */
  function renderRecommendationCard(entry, isPrimary) {
    const rows = metaRowsForEntry(entry)
      .map((m) => `
        <div class="meta-kv">
          <div class="meta-k">${m.k}</div>
          <div class="meta-v ${m.cls || ""}">${m.v}</div>
        </div>`)
      .join("");

    return `
      <div class="doc-card ${isPrimary ? "active" : "done-card"}" style="border-left:3px solid ${entry.room.color}40; margin-bottom:8px;">
        <div class="doc-header">
          <div class="doc-icon" style="background:${entry.room.color}15;">${isPrimary ? "🎯" : "🔗"}</div>
          <div>
            <div class="doc-name">${entry.room.title}</div>
            <div class="doc-sub">${isPrimary ? "Primary Recommendation" : "Secondary"}</div>
          </div>
        </div>
        <div class="meta-grid">${rows}</div>
        <span class="status-pill ${pillClass(entry.confidencePct)}">${pillLabel(entry.confidencePct)} · ${entry.confidencePct}%</span>
      </div>`;
  }

  /** Full "Enterprise Intelligence Report" panel for one uploaded document. */
  function renderIntelligenceReport(extraction, rankResult, fileName) {
    const ranked = rankResult.ranked.filter((r) => r.score > 0);
    const primary = ranked[0] || null;
    const secondary = ranked.slice(1, 4);

    const routingTags = ranked.slice(0, 5).map((r) => {
      const cls = r.seeded ? "bnca" : "";
      return `<span class="rtag ${cls}">${r.room.title}${r.seeded ? " ⚡" : ""}</span>`;
    }).join("");

    const risksHtml = (extraction.risks || []).map((r) =>
      `<div class="meta-kv"><div class="meta-k">Risk</div><div class="meta-v danger">${r.type} (${r.severity})</div></div>`
    ).join("");

    return `
      <div class="node-event visible" id="intake-report-${Date.now()}">
        <div class="node-body">
          <div class="node-tag-row">
            <span class="node-tag" style="background:rgba(30,232,182,.1);color:#1ee8b6;border:1px solid rgba(30,232,182,.25);">INTELLIGENCE REPORT</span>
            <span class="node-tag" style="background:rgba(255,255,255,.04);color:var(--dim);border:1px solid var(--border);">${extraction.metadata.documentType || "Document"}</span>
          </div>
          <div class="node-title">${fileName || extraction.metadata.title}</div>
          <div class="node-desc">${extraction.aiSummary || "Classified via cross-sector relevance engine."}</div>

          <div class="panel-label" style="margin-top:10px;">Primary Recommendation</div>
          ${primary ? renderRecommendationCard(primary, true) : `<div class="doc-sub">No confident match — manual routing required.</div>`}

          ${secondary.length ? `
            <div class="panel-label" style="margin-top:10px;">Secondary</div>
            ${secondary.map((r) => renderRecommendationCard(r, false)).join("")}
          ` : ""}

          ${risksHtml ? `<div class="panel-label" style="margin-top:10px;">Detected Risks</div><div class="meta-grid">${risksHtml}</div>` : ""}

          <div class="routing-row" style="margin-top:10px;">
            <span class="routing-label">Routed →</span>
            ${routingTags}
          </div>
        </div>
      </div>`;
  }

  /** Full pipeline: raw parser output -> normalized -> ranked -> rendered HTML. */
  function processUpload(rawExtraction, fileName) {
    const extraction = TSMMetadataEngine.normalizeExtraction(rawExtraction);
    extraction.risks = TSMMetadataEngine.detectRisk(extraction);

    const seed = TSMRelevanceEngine.readLaunchSeed();
    const rankResult = TSMRelevanceEngine.rankWarRooms(extraction, seed);

    const html = renderIntelligenceReport(extraction, rankResult, fileName);

    return { extraction, rankResult, html, seed };
  }

  const TSMIntakeGateway = {
    processUpload,
    renderIntelligenceReport,
    renderRecommendationCard
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TSMIntakeGateway;
  } else {
    global.TSMIntakeGateway = TSMIntakeGateway;
  }
})(typeof window !== "undefined" ? window : globalThis);