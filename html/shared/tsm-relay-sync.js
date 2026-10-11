/**
 * TSM Relay Sync
 * --------------------------------------------------------------------------
 * The War Room -> Strategist -> Executive Portal chain hands a case along in
 * browser storage (localStorage / sessionStorage relay keys). That works in
 * one browser and nowhere else: an executive opening the portal on their own
 * machine sees nothing the operator escalated. This script mirrors those
 * relay keys through the server so the same signed-in team sees the same
 * relays on any device.
 *
 * What it does, and only this:
 *   pull  on page load: GET /api/relay-sync, write any newer relay into this
 *         browser's storage, then reload the page once so it renders them.
 *   push  whenever a relay key changes here (checked every 2s, on
 *         TSM_RELAY_EVENT, and when the page is hidden): POST the change.
 *
 * It never touches a page's own code and never patches Storage. Pages keep
 * reading and writing storage exactly as before.
 *
 * It does nothing at all when the visitor is signed out or the server has
 * relay sync switched off (the default until TSM_RELAY_SYNC=1 is set): the
 * server then answers "not enabled" and this script stops, so logged-out
 * demo use and an un-flagged deploy are unchanged.
 * Only keys that look like relay keys are mirrored (see allowed()); anything
 * that looks like a key, token or secret is never sent.
 *
 * Opt out in one browser: localStorage.setItem('TSM_RELAY_SYNC_OFF', '1').
 */
(function (global) {
  'use strict';
  if (global.TSMRelaySync) return;

  var API = '/api/relay-sync';
  var META_KEY = 'TSM_RELAY_SYNC_META';        // { key: { h: hash, t: server time } }, see loadMeta()
  var RELOAD_KEY = 'TSM_RELAY_SYNC_RELOADED';  // sessionStorage: version this tab already reloaded for
  var OFF_KEY = 'TSM_RELAY_SYNC_OFF';
  var ALLOW = /^(TSM|tsm)[A-Za-z0-9_-]*(RELAY|relay)[A-Za-z0-9_-]*$/;
  var EXTRA = { TSM_WAR_ROOM_BRIEF: true };
  var DENY = /(key|token|secret|password|credential)/i;
  var UI_FLAG = /_(SHOWN|SEEN|DISMISSED|DONE)$/i;   // per-browser display flags, not case data
  var OWN = { TSM_RELAY_SYNC_META: true, TSM_RELAY_SYNC_RELOADED: true, TSM_RELAY_SYNC_OFF: true };
  var MAX_VALUE_CHARS = 256 * 1024;
  var MAX_REQUEST_CHARS = 500 * 1024;
  var MAX_KEEPALIVE_CHARS = 60 * 1024;   // browsers cap keepalive request bodies at ~64KB
  var SCAN_MS = 2000;

  var state = { enabled: false, pulled: false, pushing: false, timer: null, refused: {} };

  function allowed(key) {
    if (!key || OWN[key]) return false;
    if (DENY.test(key) || UI_FLAG.test(key)) return false;
    return ALLOW.test(key) || EXTRA[key] === true;
  }

  // Small, stable string hash (djb2 + length). Only used to notice a change.
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + ':' + str.length;
  }

  function store(area) {
    try { return area === 'session' ? global.sessionStorage : global.localStorage; } catch (e) { return null; }
  }

  function keysOf(s) {
    var out = [];
    if (!s) return out;
    try { for (var i = 0; i < s.length; i++) out.push(s.key(i)); } catch (e) {}
    return out;
  }

  // Every allowed relay key in this browser: { key: { value, area } }.
  // localStorage wins when a key is in both (pages write both with one value).
  function localSnapshot() {
    var snap = {};
    var ls = store('local'), ss = store('session');
    keysOf(ss).forEach(function (k) {
      if (!allowed(k)) return;
      var v = null;
      try { v = ss.getItem(k); } catch (e) {}
      if (typeof v === 'string') snap[k] = { value: v, area: 'session' };
    });
    keysOf(ls).forEach(function (k) {
      if (!allowed(k)) return;
      var v = null;
      try { v = ls.getItem(k); } catch (e) {}
      if (typeof v === 'string') snap[k] = { value: v, area: snap[k] ? 'both' : 'local' };
    });
    return snap;
  }

  // Sync bookkeeping lives beside the relay it describes: records for relays
  // in localStorage are kept in localStorage; records for relays that exist
  // only in this tab's sessionStorage are kept in sessionStorage. Otherwise a
  // second tab (which has its own empty sessionStorage) would read "relay
  // known, relay missing" as a deletion and wipe it for everyone.
  function readMeta(area) {
    try { return JSON.parse(store(area).getItem(META_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function loadMeta() {
    var meta = {};
    var s = readMeta('session'), l = readMeta('local');
    Object.keys(s).forEach(function (k) { meta[k] = { h: s[k].h, t: s[k].t, home: 'session' }; });
    Object.keys(l).forEach(function (k) { meta[k] = { h: l[k].h, t: l[k].t, home: 'local' }; });
    return meta;
  }
  function saveMeta(meta) {
    var l = {}, s = {};
    Object.keys(meta).forEach(function (k) {
      var rec = { h: meta[k].h, t: meta[k].t };
      if (meta[k].home === 'session') s[k] = rec; else l[k] = rec;
    });
    try { store('local').setItem(META_KEY, JSON.stringify(l)); } catch (e) {}
    try { store('session').setItem(META_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function homeFor(area) { return area === 'session' ? 'session' : 'local'; }

  function writeLocal(key, value, area) {
    var ls = store('local'), ss = store('session');
    try {
      if (area !== 'session' && ls) ls.setItem(key, value);
      if (area !== 'local' && ss) ss.setItem(key, value);
      return true;
    } catch (e) { return false; }   // quota: leave this key alone
  }
  function removeLocal(key) {
    try { store('local').removeItem(key); } catch (e) {}
    try { store('session').removeItem(key); } catch (e) {}
  }

  // Best-effort "when was this relay written", from the payload itself.
  function contentTime(value) {
    try {
      var o = JSON.parse(value);
      if (!o || typeof o !== 'object') return null;
      var raw = o.timestamp || o.ts || o.generatedAt || o.savedAt;
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'string') { var t = Date.parse(raw); return isNaN(t) ? null : t; }
    } catch (e) {}
    return null;
  }

  // Applies the server's entries to this browser. Returns the keys it changed.
  function applyEntries(entries) {
    var meta = loadMeta();
    var local = localSnapshot();
    var changed = [];

    (entries || []).forEach(function (entry) {
      var key = entry && entry.key;
      if (!allowed(key)) return;
      var here = local[key];
      var m = meta[key];
      var serverTime = Number(entry.updatedAt) || 0;

      if (entry.deleted) {
        // Another device consumed or cleared this relay.
        if (here && m && hash(here.value) === m.h && serverTime > (m.t || 0)) {
          removeLocal(key);
          delete meta[key];
          changed.push(key);
        } else if (!here && m) {
          delete meta[key];   // already gone here too: nothing left to send
        }
        return;
      }
      if (typeof entry.value !== 'string') return;

      var take = false;
      if (!here) {
        // Not in this browser. Take it unless we deleted it here after that write.
        take = !m || serverTime > (m.t || 0);
      } else if (m && hash(here.value) === m.h) {
        // Unchanged here since the last sync: the server copy wins if newer.
        take = serverTime > (m.t || 0) && hash(entry.value) !== m.h;
        if (!take && serverTime > (m.t || 0)) m.t = serverTime;
      } else {
        // Changed here and not pushed yet. Keep ours unless the payloads
        // themselves say the server's is the more recent case.
        var mine = contentTime(here.value), theirs = contentTime(entry.value);
        take = mine !== null && theirs !== null && theirs > mine;
      }

      if (take && writeLocal(key, entry.value, entry.area || 'local')) {
        meta[key] = { h: hash(entry.value), t: serverTime, home: homeFor(entry.area || 'local') };
        if (!here || here.value !== entry.value) changed.push(key);
      }
    });

    saveMeta(meta);
    return changed;
  }

  function disable() {
    state.enabled = false;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  function request(method, body, keepalive) {
    var opts = { method: method, credentials: 'same-origin', headers: { 'Accept': 'application/json' } };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = body;
      if (keepalive) opts.keepalive = true;
    }
    return global.fetch(API, opts).then(function (res) {
      if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 503) {
        disable();
        return null;
      }
      if (!res.ok) return null;
      return res.json();
    }).catch(function () { return null; });
  }

  // What needs sending: relays changed here, and relays removed here.
  function pendingChanges() {
    var meta = loadMeta();
    var local = localSnapshot();
    var sets = [], deletes = [];
    Object.keys(local).forEach(function (key) {
      var here = local[key];
      if (here.value.length > MAX_VALUE_CHARS) return;
      var h = hash(here.value);
      if (state.refused[key] === h) return;   // the server already said no to this exact value
      if (!meta[key] || meta[key].h !== h) sets.push({ key: key, value: here.value, area: here.area });
    });
    Object.keys(meta).forEach(function (key) {
      if (!local[key] && meta[key] && meta[key].h) deletes.push(key);
    });
    return { sets: sets, deletes: deletes };
  }

  function recordResults(sent, results) {
    var meta = loadMeta();
    var byKey = {};
    (results || []).forEach(function (r) { if (r && r.ok) byKey[r.key] = r; });
    sent.sets.forEach(function (s) {
      if (!byKey[s.key]) state.refused[s.key] = hash(s.value);   // do not resend until it changes
    });
    sent.sets.forEach(function (s) {
      if (byKey[s.key]) meta[s.key] = { h: hash(s.value), t: Number(byKey[s.key].updatedAt) || Date.now(), home: homeFor(s.area) };
    });
    sent.deletes.forEach(function (k) { if (byKey[k]) delete meta[k]; });
    saveMeta(meta);
  }

  function push(opts) {
    opts = opts || {};
    if (!state.enabled || !state.pulled) return Promise.resolve(false);
    if (state.pushing && !opts.unloading) return Promise.resolve(false);
    var pending = pendingChanges();
    if (!pending.sets.length && !pending.deletes.length) return Promise.resolve(false);

    // One request per ~500KB so a batch of large relays is never rejected whole.
    var batches = [], current = { sets: [], deletes: pending.deletes.slice(0) }, size = 0;
    pending.sets.forEach(function (s) {
      if (size + s.value.length > MAX_REQUEST_CHARS && current.sets.length) {
        batches.push(current); current = { sets: [], deletes: [] }; size = 0;
      }
      current.sets.push(s); size += s.value.length;
    });
    batches.push(current);

    if (opts.unloading) {
      // The page is going away: only a small keepalive request survives that.
      // Anything larger is picked up by the next page's own scan.
      var body = JSON.stringify(batches[0]);
      if (batches.length === 1 && body.length <= MAX_KEEPALIVE_CHARS) request('POST', body, true);
      return Promise.resolve(false);
    }

    state.pushing = true;
    var chain = Promise.resolve();
    batches.forEach(function (batch) {
      chain = chain.then(function () {
        return request('POST', JSON.stringify(batch)).then(function (data) {
          if (data && data.ok) recordResults(batch, data.results);
        });
      });
    });
    return chain.then(function () { state.pushing = false; return true; }, function () { state.pushing = false; return false; });
  }

  function pull() {
    return request('GET').then(function (data) {
      if (!data || !data.ok) return [];
      if (data.enabled === false) { disable(); return []; }   // signed out, or relay sync is off
      state.pulled = true;
      var changed = applyEntries(data.entries);
      if (changed.length) {
        try { global.dispatchEvent(new CustomEvent('TSM_RELAY_SYNC', { detail: { changed: changed } })); } catch (e) {}
        // This page may already have looked for those relays and found
        // nothing. Reload once so it renders them. The flag stops a loop: a
        // tab never reloads twice for the same server version.
        var version = String(data.version || '');
        var already = null;
        try { already = store('session').getItem(RELOAD_KEY); } catch (e) {}
        if (version && already !== version) {
          try { store('session').setItem(RELOAD_KEY, version); } catch (e) { return changed; }
          if (global.location && typeof global.location.reload === 'function') global.location.reload();
        }
      }
      return changed;
    });
  }

  function start() {
    var off = null;
    try { off = store('local').getItem(OFF_KEY); } catch (e) { return; }   // storage blocked: nothing to sync
    if (off === '1' || typeof global.fetch !== 'function') return;
    state.enabled = true;
    pull().then(function () {
      if (!state.enabled || !state.pulled) return;
      push();
      state.timer = setInterval(function () { push(); }, SCAN_MS);
      global.addEventListener('TSM_RELAY_EVENT', function () { push(); });
      global.addEventListener('pagehide', function () { push({ unloading: true }); });
      if (global.document) {
        global.document.addEventListener('visibilitychange', function () {
          if (global.document.visibilityState === 'hidden') push();
        });
      }
    });
  }

  global.TSMRelaySync = {
    allowed: allowed,
    pull: pull,
    push: push,
    pendingChanges: pendingChanges,
    isEnabled: function () { return state.enabled; },
    _applyEntries: applyEntries,
    _hash: hash
  };

  start();
})(window);
