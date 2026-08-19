/**
 * TSM Governance: Audit Engine v2.0
 *
 * Was a non-persisting stub: record() only console.log'd and returned an
 * object, with zero callers anywhere in the codebase. The real backend
 * (POST/GET /api/governance/audit -> GOVERNANCE_AUDIT_LOG in server.js)
 * already existed and already persisted -- it just had zero callers too.
 * This wires the two together: record() now fire-and-forgets a real POST
 * so "ran an audit action" becomes a fact you can go back and prove later,
 * not just a console line that vanishes on reload. Same in-memory-for-now
 * convention as routes/finance-chat.js's audit log -- swap
 * GOVERNANCE_AUDIT_LOG for a real DB when ready, this contract stays the
 * same.
 *
 * Usage:
 *   TSMAuditEngine.record({ actor: 'jdoe@tsm', action: 'RISK_APPROVED', resource: 'risk-abc123', vertical: 'governance' });
 *
 * record() returns immediately (does not await the network call) so it
 * never blocks a UI action -- same convention as TSMMissionStore's
 * fire-and-forget writes elsewhere in this codebase. Call
 * TSMAuditEngine.history({ vertical, limit }) to read entries back.
 */
window.TSMAuditEngine = {

  endpoint: '/api/governance/audit',

  record(event) {
    console.log("AUDIT EVENT", event);

    const entry = {
      timestamp: new Date().toISOString(),
      event
    };

    // Real persistence, fire-and-forget. actor/action are required by the
    // server route; if the caller didn't supply them, still log locally
    // above but skip the network call rather than send a 400 the caller
    // has no way to observe.
    var actor = event && event.actor;
    var action = event && event.action;
    if (actor && action) {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: actor,
          action: action,
          resource: (event && event.resource) || null,
          vertical: (event && event.vertical) || null
        })
      }).catch(function (e) {
        console.warn('[TSMAuditEngine] persist failed (event still logged locally):', e.message);
      });
    } else {
      console.warn('[TSMAuditEngine] record() called without actor/action -- logged locally only, not persisted. Real audit entries need both.');
    }

    return entry;
  },

  /** Read persisted entries back. Returns a Promise<{ok, entries}>. */
  history(opts) {
    opts = opts || {};
    var qs = [];
    if (opts.vertical) qs.push('vertical=' + encodeURIComponent(opts.vertical));
    if (opts.limit) qs.push('limit=' + encodeURIComponent(opts.limit));
    var url = this.endpoint + (qs.length ? '?' + qs.join('&') : '');
    return fetch(url).then(function (r) { return r.json(); });
  }

};
