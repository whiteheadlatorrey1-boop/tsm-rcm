'use strict';
/**
 * Placement audit events. Pure: no imports, clock, randomness or I/O.
 * Builds one immutable event per placement status change. Actor id and
 * timestamp are caller-supplied. No ranking, no decisions, and no
 * protected-class attributes in any field.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMStaffingAudit = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  var STATUSES = Object.freeze(['submitted', 'interviewing', 'offered', 'placed', 'declined', 'ended']);

  function isStr(x) { return typeof x === 'string' && x.length > 0; }
  function isIso(x) { return isStr(x) && !isNaN(Date.parse(x)); }

  function buildStatusChangeEvent(a) {
    if (!a || typeof a !== 'object') throw new TypeError('audit: args required');
    var p = a.placement;
    if (!p || !isStr(p.placementId)) throw new TypeError('audit: placement.placementId required');
    if (STATUSES.indexOf(a.to) === -1) throw new TypeError('audit: unknown status "' + a.to + '"');
    if (!isIso(a.at)) throw new TypeError('audit: at must be an ISO timestamp');
    if (!Number.isInteger(a.historyIndex) || a.historyIndex < 0) throw new TypeError('audit: historyIndex must be an integer >= 0');
    return Object.freeze({
      auditEventId: p.placementId + ':' + a.historyIndex + ':' + a.to,
      schemaVersion: 1,
      type: 'placement.' + a.to,
      placementId: p.placementId,
      candidateId: isStr(p.candidateId) ? p.candidateId : null,
      jobOrderId: isStr(p.jobOrderId) ? p.jobOrderId : null,
      from: isStr(p.status) ? p.status : null,
      to: a.to,
      actorId: isStr(a.actorId) ? a.actorId : null,
      at: a.at,
      historyIndex: a.historyIndex
    });
  }

  return Object.freeze({ STATUSES: STATUSES, buildStatusChangeEvent: buildStatusChangeEvent });
});
