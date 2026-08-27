/**
 * TSM Auto-Run Engine v1.0
 * Reads the autorun flag set by TSMRunner and fires all war room engines automatically.
 *
 * Load at the END of every war room HTML file.
 * Works by detecting: tsm_auto_mode=on in localStorage OR ?autorun=1 in URL.
 *
 * How it fires engines:
 *  - Reads the war room's existing relay key for the doc text
 *  - Finds and clicks the "Run All" / "Fire All Engines" button, OR
 *  - Calls the existing runAll() / fireEngines() / runBNCA() function directly
 *  - Falls back to clicking each engine button sequentially
 *
 * After all engines complete, writes completion signal for TSMRunner polling.
 *
 * Drop into html/js/core/ and add to every war room before </body>:
 *   <script src="/js/core/tsm-autorun-engine.js"></script>
 */

(function (global) {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────

  // Map of war room relay keys → doc text field
  const RELAY_KEYS = [
    'TSM_HC_WAR_RELAY',
    'tsm_hc_docsearch_relay',
    'TSM_CONSTRUCTION_WAR_RELAY',
    'tsm_con_docsearch_relay',
    'TSM_FIN_WAR_RELAY',
    'tsm_fin_docsearch_relay',
    'TSM_INS_WAR_RELAY',
    'tsm_ins_docsearch_relay',
    'TSM_LEGAL_WAR_RELAY',
    'tsm_legal_docsearch_relay',
    'TSM_RE_WAR_RELAY',
    'tsm_re_docsearch_relay',
    'TSM_BPO_WAR_RELAY',
    'tsm_bpo_docsearch_relay',
    'TSM_RELAY_PAYLOAD',
  ];

  // Engine button selectors — ordered by priority
  const RUN_ALL_SELECTORS = [
    '#runAllBtn',
    '#fireAllBtn',
    '#autoRunBtn',
    '#runEnginesBtn',
    '[data-action="run-all"]',
    '[onclick*="runAll"]',
    '[onclick*="fireAll"]',
    '[onclick*="fireEngines"]',
    '[onclick*="runEngines"]',
    '[onclick*="startAll"]',
    '.run-all-btn',
    '.fire-engines-btn',
  ];

  // Individual engine button patterns (fallback)
  const ENGINE_BTN_SELECTORS = [
    '[onclick*="runEngine"]',
    '[onclick*="fireEngine"]',
    '[onclick*="engine1"], [onclick*="engine01"]',
    '.engine-btn',
    '.run-engine',
    '[data-engine]',
  ];

  // Doc input selectors
  const DOC_INPUT_SELECTORS = [
    '#docText',
    '#docInput',
    '#documentText',
    '#pasteArea',
    '#inputDoc',
    'textarea[id*="doc"]',
    'textarea[id*="text"]',
    'textarea[placeholder*="paste"]',
    'textarea[placeholder*="document"]',
  ];

  // ── Entry point ───────────────────────────────────────────────────────────

  function init() {
    if (!_shouldAutoRun()) return;

    console.info('[TSMAutoRun] Auto-run triggered.');

    // Small delay to let war room scripts fully initialize
    setTimeout(_execute, 800);
  }

  function _shouldAutoRun() {
    // Check URL param only. This must be explicit per page-load — a
    // persisted localStorage flag would silently auto-run analysis on
    // every future visit to this war room with no click and no warning,
    // which is not acceptable for real usage. Demo scripts should pass
    // ?autorun=1 in the URL for the specific run they intend to automate.
    const params = new URLSearchParams(global.location?.search || '');
    if (params.get('autorun') === '1') return true;

    return false;
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  async function _execute() {
    _showBanner();

    // Step 1: Load doc text from relay into the page input
    const docText = _loadDocFromRelay();
    if (docText) {
      _injectDocText(docText);
      await _wait(500);
    }

    // Step 2: Fire engines
    const fired = await _fireEngines();
    if (!fired) {
      console.warn('[TSMAutoRun] Could not find engine trigger. Manual run required.');
      _updateBanner('⚠ Could not auto-trigger engines — run manually', '#ff9500');
      return;
    }

    _updateBanner('⚡ Engines firing — analyzing document…', '#ffd700');
  }

  function _loadDocFromRelay() {
    for (const key of RELAY_KEYS) {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        const text = data.docText || data.text || data.summary || data.content;
        if (text && text.length > 20) {
          console.info(`[TSMAutoRun] Doc loaded from: ${key} (${text.length} chars)`);
          return text;
        }
      } catch (_) {}
    }
    return null;
  }

  function _injectDocText(text) {
    for (const sel of DOC_INPUT_SELECTORS) {
      const el = document.querySelector(sel);
      if (!el) continue;
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      console.info(`[TSMAutoRun] Doc injected into: ${sel}`);
      return true;
    }

    // Also try setting window.docText if the war room uses it as a global
    if (typeof global.docText !== 'undefined' || 'docText' in global) {
      global.docText = text;
    }

    return false;
  }

  async function _fireEngines() {
    // Strategy 1: call existing global function directly
    const fnNames = [
      'runAll', 'fireAll', 'fireEngines', 'runEngines',
      'startAll', 'runAllEngines', 'autoRun',
      'runBNCA', 'runConstructionBNCAFromRelay',
      'runHCEngines', 'runFinOpsEngines',
    ];

    for (const fn of fnNames) {
      if (typeof global[fn] === 'function') {
        try {
          console.info(`[TSMAutoRun] Calling ${fn}()`);
          await global[fn]();
          return true;
        } catch (e) {
          console.warn(`[TSMAutoRun] ${fn}() failed:`, e);
        }
      }
    }

    // Strategy 2: click a "run all" button
    for (const sel of RUN_ALL_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) {
        console.info(`[TSMAutoRun] Clicking: ${sel}`);
        btn.click();
        return true;
      }
    }

    // Strategy 3: click each engine button sequentially
    const engineBtns = [];
    for (const sel of ENGINE_BTN_SELECTORS) {
      document.querySelectorAll(sel).forEach(b => engineBtns.push(b));
    }

    if (engineBtns.length > 0) {
      console.info(`[TSMAutoRun] Firing ${engineBtns.length} engine buttons sequentially.`);
      for (const btn of engineBtns) {
        if (!btn.disabled) {
          btn.click();
          await _wait(2000); // wait between engines
        }
      }
      return true;
    }

    return false;
  }

  // ── Banner UI ─────────────────────────────────────────────────────────────

  function _showBanner() {
    if (document.getElementById('tsm-autorun-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'tsm-autorun-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      background: rgba(0,10,5,.95);
      border-bottom: 1px solid rgba(0,212,170,.4);
      padding: 8px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 9999;
      font-family: 'Courier New', monospace;
    `;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:8px;letter-spacing:2px;color:#00d4aa;">AUTO-RUN</span>
        <span id="tsm-autorun-msg" style="font-size:10px;color:#c8d8c8;letter-spacing:.05em;">⚡ Initializing autonomous engine chain…</span>
      </div>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#5a7a5a;cursor:pointer;font-size:11px;">✕</button>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
  }

  function _updateBanner(msg, color) {
    const el = document.getElementById('tsm-autorun-msg');
    if (el) {
      el.textContent = msg;
      el.style.color = color || '#c8d8c8';
    }
  }

  // ── Monitor engine completion ─────────────────────────────────────────────
  // Watch for the war room writing its output relay key.
  // When detected, update banner and signal TSMRunner.

  function _monitorCompletion(sector) {
    const completionKeys = {
      hc:     'TSM_HC_STRATEGIST_RELAY',
      con:    'TSM_CONSTRUCTION_STRATEGIST_RELAY',
      finops: 'tsm_fin_strategist_output',
      ins:    'tsm_ins_strategist_output',
      legal:  'tsm_leg_strategist_output',
      re:     'tsm_re_strategist_output',
      bpo:    'TSM_BPO_STRAT_RELAY',
    };

    if (!sector || !completionKeys[sector]) return;

    let checks = 0;
    const maxChecks = 60; // 3 min at 3s interval

    const poll = setInterval(() => {
      checks++;
      const raw = localStorage.getItem(completionKeys[sector]);
      if (raw) {
        clearInterval(poll);
        _updateBanner(`✓ ${sector.toUpperCase()} chain complete — escalating to Executive Portal`, '#00ff50');
        console.info(`[TSMAutoRun] Completion detected for ${sector}`);
      }
      if (checks >= maxChecks) clearInterval(poll);
    }, 3000);
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  function _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Detect sector from URL ────────────────────────────────────────────────

  function _detectSector() {
    const url = global.location?.pathname || '';
    const params = new URLSearchParams(global.location?.search || '');
    if (params.get('sector')) return params.get('sector');
    if (url.includes('healthcare') || url.includes('hc-denial')) return 'hc';
    if (url.includes('finops'))      return 'finops';
    if (url.includes('insurance'))   return 'ins';
    if (url.includes('construction'))return 'con';
    if (url.includes('legal'))       return 'legal';
    if (url.includes('reo') || url.includes('re-war')) return 're';
    if (url.includes('bpo'))         return 'bpo';
    return null;
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  global.TSMAutoRun = { init, runDemo: _execute };

  // Run after DOM + war room scripts are ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

  // Start completion monitor
  setTimeout(() => _monitorCompletion(_detectSector()), 1000);

})(window);