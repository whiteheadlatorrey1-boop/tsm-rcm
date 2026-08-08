/**
 * TSM Launcher — Unified v2
 * Drop ONE copy at your static root (e.g. /public/js/tsm-launcher.js)
 * and load it with an absolute path: <script src="/js/tsm-launcher.js">
 *
 * Every page that needs mission-bridge + mission-panel will auto-load them
 * from the same resolved base, so no more 404s from path drift.
 */

(function () {
  /* ── Auto-load companion scripts from the same directory as this file ── */
  var scripts = document.querySelectorAll('script[src]');
  var thisScript = scripts[scripts.length - 1]; // works during sync parse
  var base = thisScript.src.replace(/\/[^/]+$/, '/'); // strip filename

  ['mission-bridge.js', 'mission-panel.js'].forEach(function (src) {
    // Skip if already loaded
    if (document.querySelector('script[src*="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = base + src;
    document.head.appendChild(s);
  });
})();

/* ── TSM Namespace ─────────────────────────────────────────────────────── */
window.TSM = window.TSM || {};

/* ── Tab helpers (fixes showPart missing warnings) ─────────────────────── */
window.showPart = function (id, triggerEl) {
  document.querySelectorAll('.tab-panel, .part-panel').forEach(function (p) {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  document.querySelectorAll('.nav-btn, .tab-btn').forEach(function (b) {
    b.classList.remove('active');
  });

  var panel = document.getElementById('tab-' + id) ||
              document.getElementById('part-' + id) ||
              document.getElementById(id);
  if (panel) {
    panel.classList.add('active');
    panel.style.display = '';
  }

  var btn = triggerEl ||
            document.querySelector('[data-tsm-args*="' + id + '"]') ||
            document.querySelector('[onclick*="' + id + '"]');
  if (btn) btn.classList.add('active');
};

// Alias — some pages call switchTab directly
window.switchTab = window.showPart;

/* ── Delegate click handler for data-tsm-action buttons ─────────────────
   Add this ONE listener to the document; any button with data-tsm-action
   will work automatically — no per-button onclick needed.             ── */
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-tsm-action]');
  if (!el) return;
  var action = el.getAttribute('data-tsm-action');
  var args   = el.getAttribute('data-tsm-args') || '';
  window.TSM.launcher.run(action, args, el); // pass el so runGuide works
});

/* ── Launcher core ───────────────────────────────────────────────────── */
window.TSM.launcher = {

  /**
   * run(action, args, sourceEl)
   *  sourceEl — the DOM element that triggered the action (fixes el bug)
   */
  run: function (action, args, sourceEl) {
    var el = sourceEl || null; // safe reference used by runGuide below

    /* ── fillAndRun ── populate an input then click a button ── */
    if (action === 'fillAndRun') {
      var a = args.replace(/['"]/g, '').split(',').map(function (s) { return s.trim(); });
      var inpId = a[0], btnId = a[1], query = a[3];
      var inp = document.getElementById(inpId);
      var btn = document.getElementById(btnId);
      if (inp) inp.value = query;
      if (btn) btn.click();
    }

    /* ── switchTab ── show a tab panel by id ── */
    if (action === 'switchTab') {
      var id = args.trim().replace(/^['"]/, '').split(/['",]/)[0].trim();
      window.showPart(id, el);
    }

    /* ── showPart ── alias kept for legacy buttons ── */
    if (action === 'showPart') {
      var id = args.trim().replace(/^['"`]|['"`]$/g, '');
      window.showPart(id, el);
    }

    /* ── runQ ── run a query via the page's runQ function ── */
    if (action === 'runQ') {
      var parts = args.match(/['"`]([^'"`]+)['"`]/g);
      if (!parts || parts.length < 2) return;
      var query  = parts[0].replace(/['"]/g, '');
      var btnId  = parts[1].replace(/['"]/g, '');
      var resId  = parts[2] ? parts[2].replace(/['"]/g, '') : btnId.replace('-btn', '-res');
      if (window.runQ) window.runQ(query, btnId, resId);
    }

    /* ── runPreset ── fill intel input and fire ── */
    if (action === 'runPreset') {
      var query = args.replace(/^[`'"]|[`'"]$/g, '');
      var inp   = document.getElementById('intel-inp');
      var btn   = document.getElementById('intel-btn');
      if (inp) inp.value = query;
      window.showPart('intel', document.querySelector('.nav-btn[data-tsm-args*="intel"]'));
      if (btn) btn.click();
    }

    /* ── runGuide ── FIXED: was crashing because bare `el` was undefined ── */
    if (action === 'runGuide') {
      // el is now safely passed in as sourceEl above
      var raw   = el ? el.getAttribute('data-tsm-args') : args;
      var query = (raw || '').replace(/^[`'"]|[`'"]$/g, '');
      var out   = document.getElementById('guide-output');
      if (out) out.textContent = '> Running...';
      if (window.runQ) window.runQ(query, null, 'guide-output');
    }

    /* ── navigateTo ── go to another app page ── */
    if (action === 'navigateTo') {
      var url = args.replace(/^['"`]|['"`]$/g, '');
      if (url) window.location.href = url;
    }

    /* ── openTab ── open in new browser tab ── */
    if (action === 'openTab') {
      var url = args.replace(/^['"`]|['"`]$/g, '');
      if (url) window.open(url, '_blank');
    }
  }
};

/* ── Persistent AI logic: re-run any guided missions on page load ──────── */
document.addEventListener('DOMContentLoaded', function () {

  /* Mark mission steps that are already stored as complete */
  var stored = {};
  try { stored = JSON.parse(localStorage.getItem('tsm-missions') || '{}'); } catch (e) {}

  Object.keys(stored).forEach(function (stepId) {
    var el = document.getElementById(stepId) ||
             document.querySelector('[data-mission-id="' + stepId + '"]');
    if (el && stored[stepId] === 'done') el.classList.add('mission-done');
  });

  /* Activate first tab panel if none is active */
  var panels = document.querySelectorAll('.tab-panel, .part-panel');
  var hasActive = document.querySelector('.tab-panel.active, .part-panel.active');
  if (panels.length && !hasActive) {
    panels[0].classList.add('active');
    panels[0].style.display = '';
    var firstBtn = document.querySelector('.nav-btn, .tab-btn');
    if (firstBtn) firstBtn.classList.add('active');
  }
});

/* ── Mission step persistence helper (call from any page) ─────────────── */
window.TSM.markStep = function (stepId) {
  var stored = {};
  try { stored = JSON.parse(localStorage.getItem('tsm-missions') || '{}'); } catch (e) {}
  stored[stepId] = 'done';
  localStorage.setItem('tsm-missions', JSON.stringify(stored));
  var el = document.getElementById(stepId) ||
           document.querySelector('[data-mission-id="' + stepId + '"]');
  if (el) el.classList.add('mission-done');
};

window.TSM.resetMissions = function () {
  localStorage.removeItem('tsm-missions');
  document.querySelectorAll('.mission-done').forEach(function (el) {
    el.classList.remove('mission-done');
  });
};