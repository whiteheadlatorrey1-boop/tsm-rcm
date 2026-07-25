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
    // Always write the local fallback so same-browser handoffs never break
    // even if the API call below fails.
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(payload)); } catch (e) { /* ignore */ }

    try {
      const key = global.TSM_CLIENT_KEY;
      if (!key) console.warn('[RCMRelay] TSM_CLIENT_KEY is unset — relay push will 401. See html/config/tsm-client-key.js');
      const res = await fetch(`${API_BASE}/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key || '' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Relay API responded ${res.status}`);
      return { ok: true, via: 'server' };
    } catch (err) {
      return { ok: true, via: 'local', warning: err.message };
    }
  }

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/relay`);
      if (res.status === 204) return { data: null, source: 'server' };
      if (!res.ok) throw new Error(`Relay API responded ${res.status}`);
      const data = await res.json();
      return { data, source: 'server' };
    } catch (err) {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        return { data: raw ? JSON.parse(raw) : null, source: 'local' };
      } catch (e) {
        return { data: null, source: 'local' };
      }
    }
  }

  async function clear() {
    try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* ignore */ }
    try { await fetch(`${API_BASE}/relay`, { method: 'DELETE', headers: { 'x-api-key': global.TSM_CLIENT_KEY || '' } }); } catch (e) { /* ignore */ }
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