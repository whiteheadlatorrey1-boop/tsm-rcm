/* Phase 8A — Competency taxonomy. Pure, deterministic, versioned. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMCompetencyTaxonomy = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAXONOMY_VERSION = '1.0.0';

  // dimensionId values are PROVISIONAL until reconciled with the 7A readiness dimensions.
  var SEED_ENTRIES = [
    { competencyId: 'it.l1.ticket-triage', label: 'L1 ticket triage', dimensionId: 'technical', verticalIds: ['it'], aliases: ['ticket triage', 'incident triage'] },
    { competencyId: 'it.servicenow.fundamentals', label: 'ServiceNow fundamentals', dimensionId: 'technical', verticalIds: ['it'], aliases: ['servicenow'] },
    { competencyId: 'healthcare.rcm.claims-follow-up', label: 'Claims follow-up', dimensionId: 'technical', verticalIds: ['healthcare'], aliases: ['claims follow up', 'ar follow up'] },
    { competencyId: 'healthcare.rcm.denials-management', label: 'Denials management', dimensionId: 'technical', verticalIds: ['healthcare'], aliases: ['denials', 'denial management'] },
    { competencyId: 'enterprise.sap.fundamentals', label: 'SAP fundamentals', dimensionId: 'technical', verticalIds: ['enterprise'], aliases: ['sap'] },
    { competencyId: 'workplace.communication', label: 'Professional communication', dimensionId: 'workplace', verticalIds: [], aliases: ['communication', 'written communication'] }
  ];

  function key(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function createTaxonomy(entries, version) {
    if (!Array.isArray(entries)) throw new Error('entries must be an array');
    if (typeof version !== 'string' || !version) throw new Error('version required');
    var byId = {};
    var byKey = {};
    var frozen = entries.map(function (e) {
      if (!e || typeof e.competencyId !== 'string' || !e.competencyId) throw new Error('competencyId required');
      if (byId[e.competencyId]) throw new Error('duplicate competencyId: ' + e.competencyId);
      var entry = Object.freeze({
        competencyId: e.competencyId,
        label: e.label,
        dimensionId: e.dimensionId,
        verticalIds: Object.freeze((e.verticalIds || []).slice()),
        aliases: Object.freeze((e.aliases || []).slice()),
        version: version
      });
      byId[entry.competencyId] = entry;
      [entry.competencyId, entry.label].concat(entry.aliases).forEach(function (t) {
        var k = key(t);
        if (k && !Object.prototype.hasOwnProperty.call(byKey, k)) byKey[k] = entry;
      });
      return entry;
    });
    return Object.freeze({
      version: version,
      entries: Object.freeze(frozen),
      get: function (id) { return Object.prototype.hasOwnProperty.call(byId, id) ? byId[id] : null; },
      resolve: function (text) {
        if (text === null || text === undefined) return null;
        var k = key(text);
        return k && Object.prototype.hasOwnProperty.call(byKey, k) ? byKey[k] : null;
      }
    });
  }

  var defaultTaxonomy = createTaxonomy(SEED_ENTRIES, TAXONOMY_VERSION);

  return {
    TAXONOMY_VERSION: TAXONOMY_VERSION,
    createTaxonomy: createTaxonomy,
    defaultTaxonomy: defaultTaxonomy
  };
}));
