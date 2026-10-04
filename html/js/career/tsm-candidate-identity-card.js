(function (global) {
  'use strict';

  var KEY = 'tsm_candidate_session_v1';

  function hasIdentity() {
    try {
      var s = JSON.parse(global.localStorage.getItem(KEY)) || {};
      return !!(s.identity && s.identity.name);
    } catch (e) { return false; }
  }

  function dismissed() {
    try { return global.sessionStorage.getItem(KEY + '_skip') === '1'; }
    catch (e) { return false; }
  }

  function mount(opts) {
    opts = opts || {};
    var doc = global.document;
    var anchor = doc.getElementById(opts.anchorId || 'app-root');
    if (!anchor || !global.TSMCandidateSession) return;
    if (hasIdentity() || dismissed()) return;

    var card = doc.createElement('div');
    card.style.cssText = 'max-width:720px;margin:16px auto;padding:16px;border:1px solid var(--cyan,#22d3ee);border-radius:10px;background:rgba(34,211,238,0.06);color:var(--text,#e5e7eb);font-size:14px;';

    var title = doc.createElement('div');
    title.style.cssText = 'font-weight:700;margin-bottom:6px;';
    title.textContent = 'Save your practice results (optional)';

    var note = doc.createElement('div');
    note.style.cssText = 'margin-bottom:10px;opacity:0.85;';
    note.textContent = 'Add your name so finished sessions count toward your readiness profile. You can skip and still practice.';

    var name = doc.createElement('input');
    name.type = 'text'; name.placeholder = 'Full name';
    var email = doc.createElement('input');
    email.type = 'email'; email.placeholder = 'Email (optional)';
    [name, email].forEach(function (el) {
      el.style.cssText = 'display:block;width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:6px;border:1px solid #475569;background:#0f172a;color:inherit;';
    });

    var save = doc.createElement('button');
    save.type = 'button'; save.textContent = 'Save';
    var skip = doc.createElement('button');
    skip.type = 'button'; skip.textContent = 'Skip';
    [save, skip].forEach(function (b) {
      b.style.cssText = 'margin-right:8px;padding:8px 14px;border-radius:6px;border:1px solid #475569;background:transparent;color:inherit;cursor:pointer;';
    });

    save.onclick = function () {
      var n = name.value.trim();
      if (!n) { name.focus(); return; }
      global.TSMCandidateSession.setIdentity({
        name: n,
        email: email.value.trim() || null,
        role: opts.role || null
      });
      card.remove();
    };
    skip.onclick = function () {
      try { global.sessionStorage.setItem(KEY + '_skip', '1'); } catch (e) {}
      card.remove();
    };

    [title, note, name, email, save, skip].forEach(function (el) { card.appendChild(el); });
    anchor.parentNode.insertBefore(card, anchor);
  }

  global.TSMCandidateIdentityCard = { mount: mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.TSMCandidateIdentityCard;
})(typeof window !== 'undefined' ? window : globalThis);
