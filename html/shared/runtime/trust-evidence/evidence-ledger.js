/**
 * evidence-ledger.js
 *
 * Append-only store of decision evidence records. Modeled on the same
 * append-only pattern as relay.core.js's event log, but scoped specifically
 * to "why did we decide this" records rather than general relay traffic.
 *
 * A record is written any time BNCA (or a vertical strategist) emits a
 * decision that gets shown to a human -- i.e. anything that lands on an
 * executive portal or a war room recommendation panel.
 */

const STORE_KEY = 'tsm.trustEvidence.ledger.v1';

class EvidenceLedger {
  constructor() {
    this._mem = [];
    this._loaded = false;
  }

  _load() {
    if (this._loaded) return;
    this._loaded = true;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORE_KEY);
        this._mem = raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      this._mem = [];
    }
  }

  _persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORE_KEY, JSON.stringify(this._mem.slice(-5000)));
      }
    } catch (e) {
      // storage full or unavailable -- evidence stays in-memory for this session
    }
  }

  /**
   * Record a single decision evidence entry. Never mutates or deletes --
   * corrections are new entries that reference the original via
   * correctsRecordId.
   */
  record(opts) {
    this._load();
    const domain = opts.domain;
    const decisionId = opts.decisionId;
    const summary = opts.summary;
    const ruleIds = opts.ruleIds || [];
    const dataRefs = opts.dataRefs || [];
    const confidence = opts.confidence != null ? opts.confidence : null;
    const correctsRecordId = opts.correctsRecordId || null;
    const actor = opts.actor || 'BNCA';

    const record = {
      id: 'ev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      ts: new Date().toISOString(),
      domain: domain,
      decisionId: decisionId,
      summary: summary,
      ruleIds: ruleIds,
      dataRefs: dataRefs,
      confidence: confidence,
      correctsRecordId: correctsRecordId,
      actor: actor,
      approvals: [],
      outcomes: [],
    };
    this._mem.push(record);
    this._persist();

    if (typeof TSM !== 'undefined' && TSM.relay && TSM.relay.write) {
      TSM.relay.write('TRUST_EVIDENCE', { type: 'record', record: record });
    }

    return record;
  }

  attachApproval(recordId, approval) {
    this._load();
    const rec = this._mem.find(function (r) { return r.id === recordId; });
    if (!rec) return null;
    const entry = Object.assign({}, approval, { ts: new Date().toISOString() });
    rec.approvals.push(entry);
    this._persist();
    return rec;
  }

  attachOutcome(recordId, outcome) {
    this._load();
    const rec = this._mem.find(function (r) { return r.id === recordId; });
    if (!rec) return null;
    const entry = Object.assign({}, outcome, { ts: new Date().toISOString() });
    rec.outcomes.push(entry);
    this._persist();
    return rec;
  }

  getByDecisionId(decisionId) {
    this._load();
    return this._mem.filter(function (r) { return r.decisionId === decisionId; });
  }

  getByDomain(domain, limit) {
    this._load();
    const lim = limit || 100;
    return this._mem.filter(function (r) { return r.domain === domain; }).slice(-lim);
  }

  all() {
    this._load();
    return this._mem.slice();
  }
}

const evidenceLedger = new EvidenceLedger();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EvidenceLedger: EvidenceLedger, evidenceLedger: evidenceLedger };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.evidenceLedger = evidenceLedger;
}
