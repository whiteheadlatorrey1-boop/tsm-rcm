/**
 * TSM DECISION PROVENANCE
 * ------------------------------------------------------------
 * Turns a strategist recommendation object into an evidence record,
 * and turns an evidence record into explain-card rows.
 * Depends on evidence-ledger.js being loaded first (window.TSM.evidenceLedger).
 *
 * Exposes:
 *   window.TSM.recordDecisionEvidence(obj, meta) -> evidence record
 *   window.TSM.buildProvenance(record) -> explain-card row array
 */
(function (global) {
  'use strict';

  function normalizeConfidence(conf) {
    if (typeof conf !== 'number') return null;
    return conf > 1 ? Math.round((conf / 100) * 100) / 100 : conf;
  }

  function recordDecisionEvidence(obj, meta) {
    obj = obj || {};
    meta = meta || {};

    var dataRefs = (obj.dataSources || []).map(function (s) {
      return { name: s.name, weight: s.weight };
    });

    var summary = (obj.recommendedActions && obj.recommendedActions[0] && obj.recommendedActions[0].text)
      || 'No summary available';

    var record = {
      domain: meta.domain || 'BPO',
      decisionId: meta.decisionId || (global.warData && global.warData.extraction && global.warData.extraction.anomalyCode) || null,
      summary: summary,
      confidence: normalizeConfidence(obj.confidence),
      dataRefs: dataRefs,
      reasoning: obj.reasoning || [],
      escalationTriggers: obj.escalationTriggers || [],
      ruleIds: meta.ruleIds || [], // honest empty array — no live policy engine wired yet
      source: meta.source || 'strategist-v2'
    };

    if (global.TSM && global.TSM.evidenceLedger) {
      return global.TSM.evidenceLedger.add(record);
    }
    return record;
  }

  function buildProvenance(record) {
    if (!record) return [];
    var rows = [];
    rows.push({ label: 'Decision', value: record.decisionId || 'unassigned' });
    rows.push({ label: 'Summary', value: record.summary || '—' });
    rows.push({
      label: 'Confidence',
      value: record.confidence != null ? Math.round(record.confidence * 100) + '%' : '—'
    });
    rows.push({
      label: 'Evidence Sources',
      value: (record.dataRefs || []).map(function (d) { return d.name; }).join(', ') || 'none recorded'
    });
    rows.push({
      label: 'Rules Applied',
      value: (record.ruleIds || []).length ? record.ruleIds.join(', ') : 'none recorded'
    });
    rows.push({ label: 'Recorded At', value: record.recordedAt || '—' });
    return rows;
  }

  global.TSM = global.TSM || {};
  Object.assign(global.TSM, {
    recordDecisionEvidence: recordDecisionEvidence,
    buildProvenance: buildProvenance
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { recordDecisionEvidence: recordDecisionEvidence, buildProvenance: buildProvenance };
  }
})(typeof window !== 'undefined' ? window : global);
