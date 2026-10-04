(function (global) {
  'use strict';

  var STORAGE_KEY = 'tsm_candidate_session_v1';

  function load() {
    try { return JSON.parse(global.localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }

  function save(data) {
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (e) { /* storage unavailable */ }
  }

  function setIdentity(identity) {
    var s = load();
    s.identity = {
      name: String(identity.name || '').trim(),
      email: identity.email || null,
      role: identity.role || null
    };
    save(s);
  }

  function createCandidate(identity, source) {
    return global.fetch('/api/candidates', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: identity.name,
        role: identity.role,
        email: identity.email,
        status: 'in_training',
        source: source,
        isSampleData: false
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('candidate create failed (' + res.status + ')');
      return res.json();
    }).then(function (data) {
      var id = data && data.candidate && data.candidate.candidateId;
      if (!id) throw new Error('create response missing candidateId');
      return id;
    });
  }

  function recordEvent(event, source) {
    var s = load();
    if (!s.identity || !s.identity.name) {
      return Promise.resolve({ ok: false, reason: 'no-identity' });
    }
    var bridge = global.TSMCandidateRegistryBridge;
    if (!bridge) return Promise.resolve({ ok: false, reason: 'no-bridge' });

    var getId = s.candidateId
      ? Promise.resolve(s.candidateId)
      : createCandidate(s.identity, source).then(function (id) {
          var cur = load(); cur.candidateId = id; save(cur);
          return id;
        });

    return getId
      .then(function (id) { return bridge.recordTrainingEvent(id, event); })
      .then(function (candidate) { return { ok: true, candidate: candidate }; })
      .catch(function (err) {
        console.error('TSM candidate session sync failed:', err);
        return { ok: false, reason: 'error', error: err };
      });
  }

  var API = { setIdentity: setIdentity, recordEvent: recordEvent };
  global.TSMCandidateSession = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
