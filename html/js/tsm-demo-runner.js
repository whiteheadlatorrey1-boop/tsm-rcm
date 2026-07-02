/**
 * TSM Demo Runner v1.0
 * One-button autonomous demo chain for war-room-prep.html.
 *
 * For each vertical:
 *  1. Seeds the sample doc into the correct relay keys
 *  2. Sets TSM_AUTO_MODE = on
 *  3. Opens the war room — war room reads autorun flag and fires all engines
 *  4. Polls localStorage for relay completion key
 *  5. Auto-checks war-room-prep checklist boxes as each stage completes
 *
 * Drop into html/war-rooms/ and add one script tag to war-room-prep.html:
 *   <script src="/tsm-demo-runner.js"></script>
 */

(function (global) {
  'use strict';

  // ── Sample docs (matches war-room-prep.html sample-doc-text content) ──────
  const SAMPLE_DOCS = {
    hc:     `Claim #HC-DENIAL-2024-CO50. Patient: John Martinez. DOB: 03/14/1978. Provider: Dr. Sarah Chen, MD. NPI: 1234567890. Payer: BlueCross BlueShield. Policy: BCB-PPO-4421. Date of service: 05/15/2024. CPT: 99213. ICD-10: J06.9. Billed: $285.00. Denial code: CO-50. Reason: Medical necessity not established. Prior auth: not obtained. Treating diagnosis: Upper respiratory infection. Appeal deadline: 07/15/2024.`,
    finops: `Invoice #INV-2024-4421. Vendor: Apex Supply Co. Amount: $142,800. Due: 06/01/2024. Status: 47 days past due. AP aging bucket: 60-90 days. PO match: failed — quantity variance 15%. Contract ref: MSA-2022-009.`,
    ins:    `Claim #INS-2024-77201. Insured: Maria Gonzalez. Policy: AUTO-PPO-2244. Loss date: 04/22/2024. Claim type: collision. Adjuster: Mike Torres. Status: Under investigation — coverage dispute. Estimated loss: $28,500. Subrogation potential: yes.`,
    con:    `RFI #CON-2024-0881. Project: Westgate Medical Center Expansion. GC: Meridian Construction. Subcontractor: SteelPro Inc. Issue: Structural steel delivery delayed 14 days — weather and supply chain. Schedule impact: critical path affected. Cost variance: $87,000 over budget. Lien waiver deadline: 06/30/2024. Contract value: $4.2M.`,
    legal:  `Matter #LEG-2024-4421. Client: TechCorp Inc. Opposing: DataVault LLC. Type: IP dispute — trade secret misappropriation. Filed: 04/01/2024. Jurisdiction: USDC Northern District CA. Exposure: $2.4M. Discovery deadline: 07/01/2024. Mediation scheduled: 06/15/2024. Key issue: former employee departed with proprietary algorithm.`,
    re:     `Property: 4821 Harlow Ave, Phoenix AZ 85032. REO asset #PHX-2024-0441. Occupancy: unknown. Last appraisal: $318,000 (02/2024). BPO: $295,000. HOA delinquency: $4,200. Title issue: junior lien — $22,000 unpaid contractor claim. Eviction status: pending.`,
    bpo:    `SUPPLIER SHUTDOWN NOTICE — GlobalParts Inc filing Chapter 11 bankruptcy. All open POs totaling $2.3M frozen. Production lines A, B, C impacted within 6 days of inventory depletion. 17 customer commitments at risk — $8.2M contracted revenue. Decision window: 6 hours. Supplier B contingency available.`,
  };

  // ── War room relay map (matches WAR_ROOM_ROUTES in doc search) ─────────────
  const RELAY_MAP = {
    hc:     { relay: 'tsm_hc_docsearch_relay',  autoKey: 'TSM_HC_WAR_RELAY',           url: '/html/tsm-doc-search-multi.html?sector=hc&autorun=1',           completionKey: 'TSM_HC_STRATEGIST_RELAY' },
    finops: { relay: 'tsm_fin_docsearch_relay', autoKey: 'TSM_FIN_WAR_RELAY',           url: '/html/tsm-doc-search-multi.html?sector=finops&autorun=1',             completionKey: 'tsm_fin_strategist_output' },
    ins:    { relay: 'tsm_ins_docsearch_relay', autoKey: 'TSM_INS_WAR_RELAY',           url: '/html/tsm-doc-search-multi.html?sector=ins&autorun=1',         completionKey: 'tsm_ins_strategist_output' },
    con:    { relay: 'tsm_con_docsearch_relay', autoKey: 'TSM_CONSTRUCTION_WAR_RELAY',  url: '/html/tsm-doc-search-multi.html?sector=con&autorun=1', completionKey: 'TSM_CONSTRUCTION_STRATEGIST_RELAY' },
    legal:  { relay: 'tsm_leg_docsearch_relay', autoKey: 'TSM_LEG_WAR_RELAY',           url: '/html/tsm-doc-search-multi.html?sector=legal&autorun=1',                 completionKey: 'tsm_leg_strategist_output' },
    re:     { relay: 'tsm_re_docsearch_relay',  autoKey: 'TSM_RE_WAR_RELAY',            url: '/html/tsm-doc-search-multi.html?sector=re&autorun=1',                      completionKey: 'tsm_re_strategist_output' },
    bpo:    { relay: 'tsm_bpo_docsearch_relay', autoKey: 'TSM_BPO_WAR_RELAY',           url: '/html/tsm-doc-search-multi.html?sector=bpo&autorun=1',                   completionKey: 'TSM_BPO_STRAT_RELAY' },
  };

  // ── Checklist step counts (matches STEPS in war-room-prep.html) ────────────
  const STEPS = { hc:5, finops:5, ins:5, con:5, legal:6, re:5, bpo:12 };

  // ── Runner state ──────────────────────────────────────────────────────────
  const _polls = {};

  // ── Core: seed + launch ───────────────────────────────────────────────────

  /**
   * Seed a vertical's relay keys and open the war room with autorun.
   * Called by the AUTO-RUN button in war-room-prep.html.
   * @param {string} vertical  'hc' | 'finops' | 'ins' | 'con' | 'legal' | 're' | 'bpo'
   */
  function runDemo(vertical) {
    const map  = RELAY_MAP[vertical];
    const doc  = SAMPLE_DOCS[vertical];
    if (!map || !doc) {
      console.error('[TSMRunner] Unknown vertical:', vertical);
      return;
    }

    // Build relay payload matching launchWarRoom() format
    const docType = _docTypeFor(vertical);
    const payload = JSON.stringify({
      docText:   doc,
      docType,
      fileName:  `TSM_DEMO_${vertical.toUpperCase()}.record`,
      client:    'TSM Demo',
      ref:       `DEMO-${vertical.toUpperCase()}-${Date.now()}`,
      source:    'demo-runner',
      autorun:   true,
      timestamp: Date.now(),
    });

    // Write relay keys — same pattern as launchWarRoom()
    try {
      localStorage.setItem(map.relay,   payload);
      localStorage.setItem(map.autoKey, payload);
      localStorage.setItem('tsm_auto_mode', 'on');

      // Also write TSM_KERNEL doc if kernel exists
      if (global.TSM_KERNEL && typeof global.TSM_KERNEL.setDoc === 'function') {
        global.TSM_KERNEL.setDoc(doc);
      }
    } catch (e) {
      console.error('[TSMRunner] Storage write failed:', e);
      return;
    }

    _updateRunnerUI(vertical, 'launching');

    // Open war room in new tab — war room reads tsm_auto_mode and auto-fires
    const tab = window.open(map.url + '?autorun=1&sector=' + vertical, '_blank');

    // Start polling for completion
    _startPolling(vertical, tab);

    console.info(`[TSMRunner] Demo launched: ${vertical} → ${map.url}`);
  }

  /**
   * Run all 7 verticals sequentially with 3s gap between each launch.
   */
  function runAll() {
    const verticals = ['hc', 'finops', 'ins', 'con', 'legal', 're', 'bpo'];
    verticals.forEach((v, i) => {
      setTimeout(() => runDemo(v), i * 3000);
    });
  }

  // ── Polling: watch for chain completion ───────────────────────────────────

  function _startPolling(vertical, tab) {
    const map = RELAY_MAP[vertical];
    if (_polls[vertical]) clearInterval(_polls[vertical]);

    let elapsed = 0;
    const TIMEOUT = 5 * 60 * 1000; // 5 min max
    const INTERVAL = 3000;

    _polls[vertical] = setInterval(() => {
      elapsed += INTERVAL;

      // Check war room relay written (engines complete)
      const warRelayRaw = localStorage.getItem(map.autoKey);
      const warRelay = _safeJson(warRelayRaw);

      // Check strategist relay written (strategist complete)
      const stratRaw = localStorage.getItem(map.completionKey);
      const stratRelay = _safeJson(stratRaw);

      // Auto-check boxes based on what's written
      if (warRelay && warRelay.timestamp > (Date.now() - TIMEOUT)) {
        // War room engine run complete → check boxes 0-2
        _checkBoxes(vertical, [0, 1, 2]);
        _updateRunnerUI(vertical, 'warroom-complete');
      }

      if (stratRelay) {
        // Strategist complete → check boxes 3-4
        _checkBoxes(vertical, [3, 4]);
        _updateRunnerUI(vertical, 'strategist-complete');
      }

      // Check exec portal confirmation
      const execRaw = localStorage.getItem('TSM_EXEC_CONFIRMED');
      const execData = _safeJson(execRaw);
      if (execData && execData.ts > (Date.now() - TIMEOUT)) {
        _checkBoxes(vertical, [5]);
        _updateRunnerUI(vertical, 'complete');
        clearInterval(_polls[vertical]);
        delete _polls[vertical];
        console.info(`[TSMRunner] ${vertical} chain complete.`);
      }

      // Timeout
      if (elapsed >= TIMEOUT) {
        clearInterval(_polls[vertical]);
        _updateRunnerUI(vertical, 'timeout');
        console.warn(`[TSMRunner] ${vertical} polling timed out.`);
      }
    }, INTERVAL);
  }

  // ── Auto-check war-room-prep checkboxes ───────────────────────────────────

  function _checkBoxes(vertical, indices) {
    indices.forEach(i => {
      const chk = document.getElementById(`chk-${vertical}-${i}`);
      if (chk && !chk.checked) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change'));
      }
    });
  }

  // ── Runner UI injection ───────────────────────────────────────────────────

  /**
   * Inject AUTO-RUN buttons into each vertical panel in war-room-prep.html
   */
  function injectButtons() {
    const verticals = ['hc', 'finops', 'ins', 'con', 'legal', 're', 'bpo'];

    verticals.forEach(v => {
      const footer = document.querySelector(`#panel-${v} .panel-footer`);
      if (!footer) return;
      if (footer.querySelector('.tsm-autorun-btn')) return; // already injected

      const btn = document.createElement('button');
      btn.className = 'tsm-autorun-btn';
      btn.dataset.vertical = v;
      btn.textContent = '⚡ AUTO-RUN';
      btn.style.cssText = `
        background: rgba(0,212,170,.1);
        border: 1px solid rgba(0,212,170,.4);
        color: #00d4aa;
        font-family: 'Courier New', monospace;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1.5px;
        padding: 6px 14px;
        cursor: pointer;
        margin-right: 8px;
      `;
      btn.onclick = () => runDemo(v);

      // Status indicator
      const status = document.createElement('span');
      status.id = `runner-status-${v}`;
      status.style.cssText = `font-size:9px;color:#5a7a5a;letter-spacing:.08em;margin-right:8px;`;
      status.textContent = '';

      footer.insertBefore(status, footer.firstChild);
      footer.insertBefore(btn, footer.firstChild);
    });

    // Inject RUN ALL button into overview panel
    const overviewFooter = document.querySelector('#panel-overview .panel-footer') ||
                           document.querySelector('.global-footer');
    if (overviewFooter && !overviewFooter.querySelector('.tsm-runall-btn')) {
      const allBtn = document.createElement('button');
      allBtn.className = 'tsm-runall-btn';
      allBtn.textContent = '⚡ AUTO-RUN ALL 7';
      allBtn.style.cssText = `
        background: rgba(0,212,170,.15);
        border: 1px solid #00d4aa;
        color: #00d4aa;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 2px;
        padding: 8px 20px;
        cursor: pointer;
        margin-right: 8px;
      `;
      allBtn.onclick = runAll;
      overviewFooter.insertBefore(allBtn, overviewFooter.firstChild);
    }

    console.info('[TSMRunner] Buttons injected into', verticals.length, 'panels.');
  }

  function _updateRunnerUI(vertical, state) {
    const el = document.getElementById(`runner-status-${vertical}`);
    if (!el) return;
    const states = {
      'launching':           { text: '▶ LAUNCHING…',         color: '#00d4aa' },
      'warroom-complete':    { text: '✓ WAR ROOM COMPLETE',   color: '#ffd700' },
      'strategist-complete': { text: '✓ STRATEGIST COMPLETE', color: '#00e5ff' },
      'complete':            { text: '✓ CHAIN COMPLETE',      color: '#00ff50' },
      'timeout':             { text: '⚠ TIMED OUT',           color: '#ff3b3b' },
    };
    const s = states[state] || { text: state, color: '#c8d8c8' };
    el.textContent = s.text;
    el.style.color = s.color;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _safeJson(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function _docTypeFor(vertical) {
    const map = {
      hc: 'CLAIM DENIAL', finops: 'VENDOR INVOICE', ins: 'INSURANCE CLAIM',
      con: 'RFI', legal: 'LEGAL MATTER', re: 'REO ASSET', bpo: 'INCIDENT REPORT',
    };
    return map[vertical] || 'DOCUMENT';
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  global.TSMRunner = { runDemo, runAll, injectButtons, SAMPLE_DOCS, RELAY_MAP };

  // Auto-inject on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButtons);
  } else {
    setTimeout(injectButtons, 300);
  }

  console.info('[TSMRunner] Demo Runner v1.0 ready.');

})(window);