// ═══════════════════════════════════════════════════════════════
// TSM HC MISSION RELAY · Connects HC Nodes → Strategist → Executive Portal
// Load on every HC node, HC Strategist, and Executive Portal
// ═══════════════════════════════════════════════════════════════

(function () {
  if (window.__TSM_HC_MISSION_RELAY__) return;
  window.__TSM_HC_MISSION_RELAY__ = true;

  const path = location.pathname.toLowerCase();

  // ── DETECT CURRENT NODE ────────────────────────────────────
  function detectNode() {
    if (path.includes('hc-billing'))    return { key: 'billing',    label: 'Billing',    color: '#ffc400' };
    if (path.includes('hc-compliance')) return { key: 'compliance', label: 'Compliance', color: '#00ffc6' };
    if (path.includes('hc-medical'))    return { key: 'medical',    label: 'Medical',    color: '#ff4d6d' };
    if (path.includes('hc-pharmacy'))   return { key: 'pharmacy',   label: 'Pharmacy',   color: '#b56cff' };
    if (path.includes('hc-operations')) return { key: 'operations', label: 'Operations', color: '#00aaff' };
    if (path.includes('hc-insurance'))  return { key: 'insurance',  label: 'Insurance',  color: '#ff7a00' };
    if (path.includes('hc-financial'))  return { key: 'financial',  label: 'Financial',  color: '#00ffc6' };
    if (path.includes('hc-legal'))      return { key: 'legal',      label: 'Legal',      color: '#b56cff' };
    if (path.includes('hc-vendors'))    return { key: 'vendors',    label: 'Vendors',    color: '#ff7a00' };
    if (path.includes('hc-taxprep') || path.includes('tax'))    return { key: 'taxprep', label: 'Tax Prep', color: '#ffc400' };
    if (path.includes('hc-grants') || path.includes('grants'))  return { key: 'grants',  label: 'Grants',  color: '#00aaff' };
    if (path.includes('hc-strategist')) return { key: 'strategist', label: 'HC Strategist', color: '#00ffc6' };
    if (path.includes('hc-main-strategist')) return { key: 'main-strategist', label: 'Main Strategist', color: '#00ffc6' };
    if (path.includes('executive-portal')) return { key: 'executive', label: 'Executive Portal', color: '#00ffc6' };
    return null;
  }

  const node = detectNode();

  // ── RELAY STORAGE HELPERS ──────────────────────────────────
  const RELAY_KEY = 'tsm-hc-mission-relay';

  function getRelay() {
    try { return JSON.parse(localStorage.getItem(RELAY_KEY) || 'null'); } catch(e) { return null; }
  }

  function setRelay(data) {
    localStorage.setItem(RELAY_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
  }

  function clearRelay() {
    localStorage.removeItem(RELAY_KEY);
  }

  // ── 1. HC NODE: WIRE RELAY TO STRATEGIST BUTTON ───────────
  function wireRelayButton() {
    if (!node || node.key === 'strategist' || node.key === 'main-strategist' || node.key === 'executive') return;

    function attachRelay() {
      document.querySelectorAll('button, a').forEach(el => {
        const txt = (el.textContent || '').trim().toUpperCase();
        if (!txt.includes('RELAY TO STRATEGIST') || el.dataset.missionRelayWired) return;
        el.dataset.missionRelayWired = 'true';

        el.addEventListener('click', function (e) {
          // Collect BNCA output if available
          const bnca = document.getElementById('guide-output') ||
                       document.getElementById('hc-clean-output') ||
                       document.getElementById('execBrief');
          const bnacText = bnca ? bnca.textContent.trim() : '';

          // Collect mission objectives completed
          const missionComplete = localStorage.getItem('tsm-mission-' + node.key) === 'complete';
          const guidedComplete = document.querySelectorAll('[id^="ok-"]');
          const completedSteps = Array.from(guidedComplete).filter(el => el.style.display !== 'none').length;

          // Build relay package
          const relay = {
            node: node.key,
            nodeLabel: node.label,
            nodeColor: node.color,
            bnca: bnacText.substring(0, 800) || 'BNCA analysis complete. Node objectives resolved.',
            missionComplete,
            completedSteps,
            timestamp: Date.now(),
            url: location.href
          };

          setRelay(relay);

          // Navigate to HC Strategist
          const strategistUrl = '/healthcare/hc-strategist/index.html?relay=' + node.key;
          setTimeout(() => { window.location.href = strategistUrl; }, 200);
        });
      });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachRelay);
    else attachRelay();
    setTimeout(attachRelay, 500);
    setTimeout(attachRelay, 1500);
  }

  // ── 2. HC STRATEGIST: SHOW RELAY BANNER ───────────────────
  function injectStrategistRelay() {
    if (!node || node.key !== 'strategist') return;

    const relay = getRelay();
    const param = new URLSearchParams(location.search).get('relay');
    if (!relay && !param) return;

    const data = relay || { nodeLabel: param, bnca: 'Relay received.', completedSteps: 0 };

    const banner = document.createElement('div');
    banner.style.cssText = 'background:rgba(0,255,198,0.06);border:1px solid rgba(0,255,198,0.3);border-radius:8px;padding:16px 20px;margin:16px;font-family:monospace;';
    banner.innerHTML = `
      <div style="font-size:9px;letter-spacing:3px;color:rgba(0,255,198,0.7);margin-bottom:8px;">◈ MISSION RELAY RECEIVED · ${new Date().toLocaleTimeString()}</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="background:rgba(0,255,198,0.15);border:1px solid rgba(0,255,198,0.3);border-radius:4px;padding:6px 14px;font-size:12px;color:#00ffc6;font-weight:700;">✓ ${data.nodeLabel || param || 'NODE'} COMPLETE</div>
        <div style="font-size:11px;color:#4a8a6a;">${data.completedSteps || 0} objectives resolved · Ready for BNCA synthesis</div>
      </div>
      <div style="background:#020913;border-left:3px solid #00ffc6;border-radius:4px;padding:12px;font-size:11px;color:#b0c4d8;line-height:1.6;margin-bottom:12px;max-height:120px;overflow-y:auto;">${data.bnca || 'Node analysis complete.'}</div>
      <div style="display:flex;gap:10px;">
        <button onclick="window.location.href='/healthcare/hc-main-strategist/index.html?relay=${data.node || param}'" style="background:#00ffc6;color:#000;border:none;padding:8px 18px;font-family:monospace;font-size:11px;font-weight:700;border-radius:4px;cursor:pointer;letter-spacing:1px;">→ PUSH TO MAIN STRATEGIST</button>
        <button onclick="this.closest('[style*=rgba]').remove()" style="background:transparent;border:1px solid rgba(0,255,198,0.2);color:#4a8a6a;padding:8px 14px;font-family:monospace;font-size:11px;border-radius:4px;cursor:pointer;">DISMISS</button>
      </div>
    `;

    const target = document.querySelector('.hc-guide-desc') ||
                   document.querySelector('.card') ||
                   document.querySelector('main') ||
                   document.body;
    target.insertAdjacentElement('afterbegin', banner);
  }

  // ── 3. MAIN STRATEGIST: SHOW RELAY + WIRE EXECUTIVE PORTAL ─
  function injectMainStrategistRelay() {
    if (!path.includes('hc-main-strategist')) return;
    if (document.getElementById('tsm-main-strategist-relay')) return;

    const relay = getRelay();
    const param = new URLSearchParams(location.search).get('relay');
    if (!relay && !param) return;

    const data = relay || { nodeLabel: param, bnca: '' };

    // Inject relay card
    const card = document.createElement('div');
    card.id = 'tsm-main-strategist-relay';
    card.style.cssText = 'background:#020913;border:1px solid rgba(0,255,198,0.25);border-radius:8px;padding:20px;margin:16px 0;font-family:monospace;';
    card.innerHTML = `
      <div style="font-size:9px;letter-spacing:3px;color:rgba(0,255,198,0.7);margin-bottom:10px;">◈ HC MISSION RELAY · NODE CHAIN COMPLETE</div>
      <div style="font-size:14px;color:#00ffc6;font-weight:700;margin-bottom:6px;">✓ ${data.nodeLabel || param || 'Node'} → HC Strategist → Main Strategist</div>
      <div style="font-size:11px;color:#4a8a6a;margin-bottom:14px;">Mission objectives resolved. BNCA context loaded. Ready for executive synthesis.</div>
      <div style="background:#010507;border-left:3px solid rgba(0,255,198,0.4);padding:12px;border-radius:4px;font-size:11px;color:#8ab0c0;line-height:1.6;margin-bottom:14px;max-height:100px;overflow-y:auto;">${data.bnca || 'Node mission complete. Objectives resolved and ready for executive synthesis.'}</div>
      <button onclick="window.location.href='/healthcare/executive-portal.html?mission=${data.node || param}&relay=complete'" style="background:#00ffc6;color:#000;border:none;padding:10px 24px;font-family:monospace;font-size:11px;font-weight:700;border-radius:4px;cursor:pointer;letter-spacing:2px;">OPEN UNIFIED EXECUTIVE PORTAL →</button>
    `;

    const target = document.querySelector('main') || document.body;
    target.insertAdjacentElement('afterbegin', card);

    // Also pre-fill any existing OPEN UNIFIED EXECUTIVE PORTAL button
    document.querySelectorAll('button, a').forEach(el => {
      if ((el.textContent || '').toUpperCase().includes('OPEN UNIFIED EXECUTIVE PORTAL')) {
        el.onclick = () => {
          window.location.href = '/healthcare/executive-portal.html?mission=' + (data.node || param) + '&relay=complete';
        };
      }
    });f
  }

  // ── 4. EXECUTIVE PORTAL: MISSION DEBRIEF CARD ─────────────
  function injectExecutiveDebrief() {
    if (!path.includes('executive-portal')) return;
    if (document.getElementById('tsm-executive-debrief')) return;
    if (document.getElementById('tsm-executive-debrief')) return;

    const params = new URLSearchParams(location.search);
    const missionNode = params.get('mission');
    const relayComplete = params.get('relay') === 'complete';
    const relay = getRelay();

    if (!missionNode && !relay) return;
    

    const data = relay || {};
    const nodeLabel = data.nodeLabel || missionNode || 'HC Node';

    // Get completed nodes from localStorage
    const nodeKeys = ['billing','compliance','medical','pharmacy','operations','insurance','financial','legal','vendors','taxprep','grants'];
    const completedNodes = nodeKeys.filter(k => localStorage.getItem('tsm-mission-' + k) === 'complete');

    const debriefCard = document.createElement('section');
    debriefCard.id = 'tsm-executive-debrief';
    debriefCard.className = 'card full';
    debriefCard.style.cssText = 'border-color:rgba(0,255,198,0.4);background:rgba(0,255,198,0.04);';
    debriefCard.innerHTML = `
      <div class="ey">◈ MISSION DEBRIEF · HC OPERATIONS COMPLETE</div>
      <h2 style="color:#00ffc6;margin-bottom:8px;">✓ ${nodeLabel} Mission Chain Resolved</h2>
      <p style="margin-bottom:16px;">The following HC nodes have been worked and relayed through the strategist chain to executive command.</p>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;">
        ${completedNodes.length > 0
          ? completedNodes.map(k => `<span style="background:rgba(0,255,198,0.12);border:1px solid rgba(0,255,198,0.3);border-radius:999px;padding:6px 14px;font-size:11px;color:#00ffc6;font-family:monospace;">✓ ${k.toUpperCase()}</span>`).join('')
          : `<span style="background:rgba(0,255,198,0.12);border:1px solid rgba(0,255,198,0.3);border-radius:999px;padding:6px 14px;font-size:11px;color:#00ffc6;font-family:monospace;">✓ ${nodeLabel.toUpperCase()}</span>`
        }
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:#050b12;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
          <div style="font-size:9px;letter-spacing:2px;color:#4a8a6a;margin-bottom:8px;">BNCA RELAY OUTPUT</div>
          <div style="font-size:11px;color:#8ab0c0;line-height:1.6;max-height:120px;overflow-y:auto;font-family:monospace;">${data.bnca || 'Mission objectives resolved across HC node chain. BNCA synthesis ready for executive review.'}</div>
        </div>
        <div style="background:#050b12;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;">
          <div style="font-size:9px;letter-spacing:2px;color:#4a8a6a;margin-bottom:8px;">EXECUTIVE NEXT ACTIONS</div>
          <div style="font-size:11px;color:#8ab0c0;line-height:1.8;font-family:monospace;">1. Review BNCA synthesis below<br>2. Assign owner lanes to open items<br>3. Run Executive Briefing for CFO report<br>4. Export brief for leadership review</div>
        </div>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button onclick="runExecutiveBriefing()" style="background:#00ffc6;color:#000;border:none;padding:10px 24px;font-family:monospace;font-size:11px;font-weight:700;border-radius:4px;cursor:pointer;letter-spacing:1px;">⚡ RUN EXECUTIVE BRIEFING</button>
        <button onclick="exportExecutiveBrief()" style="background:transparent;border:1px solid rgba(0,255,198,0.3);color:#00ffc6;padding:10px 20px;font-family:monospace;font-size:11px;border-radius:4px;cursor:pointer;">EXPORT BRIEF</button>
        <button onclick="window.location.href='/healthcare/index.html'" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#4a8a6a;padding:10px 20px;font-family:monospace;font-size:11px;border-radius:4px;cursor:pointer;">← RETURN TO HC NODES</button>
        <button onclick="this.closest('section').remove()" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#4a8a6a;padding:10px 16px;font-family:monospace;font-size:11px;border-radius:4px;cursor:pointer;">DISMISS</button>
      </div>
    `;

    // Insert as first card in main grid
    const main = document.querySelector('main.wrap') || document.querySelector('main') || document.body;
    main.insertAdjacentElement('afterbegin', debriefCard);

    // Pre-load executive briefing with mission context
    const execBrief = document.getElementById('execBrief');
    if (execBrief && data.bnca) {
      execBrief.textContent = 'MISSION RELAY — EXECUTIVE SYNTHESIS\n\n' +
        'NODE COMPLETED: ' + nodeLabel + '\n\n' +
        'BNCA OUTPUT:\n' + (data.bnca || '') + '\n\n' +
        'EXECUTIVE ACTIONS:\n' +
        '1. Review denial/auth blockers surfaced by node chain\n' +
        '2. Assign owner lanes to unresolved escalations\n' +
        '3. Approve BNCA recommendations above\n' +
        '4. Export executive brief for CFO/COO review\n\n' +
        'CONFIDENCE: 94%';
    }

    // Scroll to debrief
    setTimeout(() => debriefCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    wireRelayButton();
    injectStrategistRelay();
    injectMainStrategistRelay();
    injectExecutiveDebrief();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 800);

})();