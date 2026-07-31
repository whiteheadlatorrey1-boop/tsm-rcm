// js/rcm-relay-client.js
//
// Shared relay client for the FinOps Doc Showcase → TSM RCM OS handoff.
// Tries the server-side staging endpoint (routes/rcm-relay.js) first, since
// that's what makes the relay work across devices/tabs/reloads reliably;
// falls back to localStorage automatically if the API isn't reachable
// (e.g. these files opened directly as static HTML with no server running).
//
// Include on BOTH pages:
//   <script src="js/rcm-relay-client.js"></script>
//
// Usage (showcase, sender side):
//   await RCMRelay.send({ docName, generatedAt, engines: {...} });
//
// Usage (RCM OS, receiver side):
//   const { data, source } = await RCMRelay.load();
//   RCMRelay.clear();

(function (global) {
  const LOCAL_KEY = 'TSM_FINOPS_RCM_RELAY';
  const SEEN_KEY = 'TSM_FINOPS_RCM_RELAY_SEEN'; // last acknowledged generatedAt, so the
                                                  // "relay received" modal only fires for NEW data
  const API_BASE = '/api/rcm';

  async function send(payload) {
    // Sign the payload (SHA-256 over its content) before it leaves this
    // page, so both the server relay and the localStorage fallback carry
    // a tamper-evident seal. Non-fatal if TSMIntegrity isn't loaded (older
    // page, or crypto.subtle unavailable in a non-secure context) — falls
    // back to sending the payload unsigned rather than breaking the relay.
    let signed = payload;
    if (global.TSMIntegrity && typeof global.TSMIntegrity.sign === 'function') {
      try { signed = await global.TSMIntegrity.sign(payload, { module: 'rcm-os' }); }
      catch (e) { console.warn('[rcm-relay-client] signing failed (sending unsigned):', e.message); }
    }

    // Always write the local fallback so same-browser handoffs never break
    // even if the API call below fails.
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(signed)); } catch (e) { /* ignore */ }

    try {
      const res = await fetch(`${API_BASE}/relay`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signed)
      });
      if (!res.ok) throw new Error(`Relay API responded ${res.status}`);
      return { ok: true, via: 'server' };
    } catch (err) {
      return { ok: true, via: 'local', warning: err.message };
    }
  }

  // Verifies data._integrity if present. Never blocks the load — a bad
  // hash means "flag this as possibly tampered/corrupted", not "refuse to
  // show it", consistent with the rest of the relay chain's non-fatal
  // error handling.
  async function verifyIntegrity(data) {
    if (!data || !global.TSMIntegrity || typeof global.TSMIntegrity.verify !== 'function') {
      return null;
    }
    try { return await global.TSMIntegrity.verifyAndWarn(data, 'rcm-os relay load'); }
    catch (e) { return { ok: false, reason: 'error', error: e.message }; }
  }

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/relay`, { credentials: 'include' });
      if (res.status === 204) return { data: null, source: 'server', integrity: null };
      if (!res.ok) throw new Error(`Relay API responded ${res.status}`);
      const data = await res.json();
      const integrity = await verifyIntegrity(data);
      return { data, source: 'server', integrity };
    } catch (err) {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        const data = raw ? JSON.parse(raw) : null;
        const integrity = await verifyIntegrity(data);
        return { data, source: 'local', integrity };
      } catch (e) {
        return { data: null, source: 'local', integrity: null };
      }
    }
  }

  async function clear() {
    try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* ignore */ }
    try { await fetch(`${API_BASE}/relay`, { method: 'DELETE', credentials: 'include' }); } catch (e) { /* ignore */ }
  }

  // Has this relay (identified by its generatedAt timestamp) already been
  // acknowledged via the notification modal? Lets RCM OS show the modal once
  // per new relay instead of on every page load/tab switch.
  function isUnseen(data) {
    if (!data || !data.generatedAt) return false;
    try {
      return sessionStorage.getItem(SEEN_KEY) !== data.generatedAt;
    } catch (e) {
      return true;
    }
  }

  function markSeen(data) {
    if (!data || !data.generatedAt) return;
    try { sessionStorage.setItem(SEEN_KEY, data.generatedAt); } catch (e) { /* ignore */ }
  }

  global.RCMRelay = { send, load, clear, isUnseen, markSeen, LOCAL_KEY };
})(window);