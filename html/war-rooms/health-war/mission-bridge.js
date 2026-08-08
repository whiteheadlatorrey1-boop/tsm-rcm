/**
 * TSM Mission Bridge
 * Shared state between crc-hc-practice.html and index.html
 * Uses localStorage for cross-page communication.
 * Include on BOTH pages.
 */

const MissionBridge = {

  STORAGE_KEY: 'tsm_mission_state',

  // Write state
  set(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      ...data,
      updatedAt: Date.now()
    }));
  },

  // Called when user actually opens/enters a node — gates MARK COMPLETE
  flagNodeOpened(nodeId) {
    const state = this.get();
    this.set({ ...state, executingNode: nodeId, nodeOpened: true });
  },

  // Read state
  get() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    } catch { return {}; }
  },

  // Mark an objective complete and store score
  completeObjective(objectiveId, missionKey, riskDelta) {
    const state = this.get();
    const completed = state.completed || [];
    if (!completed.includes(objectiveId)) completed.push(objectiveId);
    this.set({
      ...state,
      missionKey,
      completed,
      riskScore: Math.max(4, (state.riskScore || 72) + riskDelta),
      lastCompleted: objectiveId
    });
  },

  // Launch a node from practice.html → index.html
  launchNode(nodeId, objectiveId, missionKey, returnUrl) {
    this.set({
      ...this.get(),
      pendingNode: nodeId,
      pendingObjective: objectiveId,
      missionKey,
      returnUrl: returnUrl || window.location.href,
      launchedAt: Date.now(),
      executingNode: null,   // reset — not executing until OPEN NODE clicked
      nodeOpened: false      // reset — gate for MARK COMPLETE
    });
    window.location.href = `/healthcare/index.html?node=${nodeId}&objective=${objectiveId}`;
  },

  // Called on index.html load — checks if a node was requested
  checkIncoming() {
    const params = new URLSearchParams(window.location.search);
    const nodeId = params.get('node');
    const objectiveId = params.get('objective');
    if (nodeId) {
      return { nodeId, objectiveId };
    }
    return null;
  },

  // Called when user completes action on index.html
  reportComplete(objectiveId, missionKey, riskDelta) {
    const state = this.get();
    this.completeObjective(objectiveId, missionKey, riskDelta);
    return state.returnUrl || '/healthcare/crc-hc-practice.html';
  },

  // Get completion % for a mission
  getProgress(missionKey, totalObjectives) {
    const state = this.get();
    if (state.missionKey !== missionKey) return { completed: [], pct: 0, riskScore: 72 };
    const completed = state.completed || [];
    return {
      completed,
      pct: Math.round((completed.length / totalObjectives) * 100),
      riskScore: state.riskScore || 72
    };
  },

  // Clear state (reset mission)
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

// Tab switcher UI — inject on both pages
MissionBridge.renderTabSwitcher = function(activePage) {
  const tabs = document.createElement('div');
  tabs.id = 'tsm-tab-switcher';
  tabs.style.cssText = `
    position:fixed; top:0; right:0; z-index:9999;
    display:flex; gap:0; font-family:'JetBrains Mono',monospace; font-size:10px;
  `;
  const pages = [
    { label: 'HC NODES', url: '/healthcare/index.html' },
    { label: 'PRACTICE', url: '/healthcare/crc-hc-practice.html' }
  ];
  pages.forEach(p => {
    const btn = document.createElement('a');
    btn.href = p.url;
    btn.textContent = p.label;
    const isActive = p.label.toLowerCase().includes(activePage.toLowerCase());
    btn.style.cssText = `
      padding:6px 14px; text-decoration:none; letter-spacing:1.5px;
      background:${isActive ? '#00c896' : '#111'};
      color:${isActive ? '#000' : '#555'};
      border:1px solid ${isActive ? '#00c896' : '#222'};
      font-weight:${isActive ? '700' : '400'};
      transition:all 0.15s;
    `;
    btn.addEventListener('mouseenter', () => { if (!isActive) { btn.style.color='#00c896'; btn.style.borderColor='#00c896'; }});
    btn.addEventListener('mouseleave', () => { if (!isActive) { btn.style.color='#555'; btn.style.borderColor='#222'; }});
    tabs.appendChild(btn);
  });
  document.body.appendChild(tabs);
};

// Score badge — shows live mission progress on any page
MissionBridge.renderScoreBadge = function(missionKey, totalObjectives) {
  const progress = this.getProgress(missionKey, totalObjectives);
  const badge = document.createElement('div');
  badge.id = 'tsm-score-badge';
  badge.style.cssText = `
    position:fixed; bottom:16px; left:50%; transform:translateX(-50%);
    background:#0d0d0d; border:1px solid #1e1e1e;
    border-radius:20px; padding:6px 16px;
    font-family:'JetBrains Mono',monospace; font-size:10px;
    color:#555; display:flex; gap:16px; align-items:center;
    z-index:8000; transition:all 0.3s;
  `;
  badge.innerHTML = `
    <span style="color:#00c896;letter-spacing:1px;">MISSION</span>
    <span>RISK <b style="color:${progress.riskScore > 50 ? '#e84040' : progress.riskScore > 25 ? '#f5a623' : '#00c896'}">${progress.riskScore}</b></span>
    <span>COMPLETE <b style="color:#00c896">${progress.pct}%</b></span>
    <span style="color:#333;cursor:pointer;" onclick="MissionBridge.reset();location.reload();">RESET</span>
  `;
  document.body.appendChild(badge);

  // Update when storage changes (cross-tab)
  window.addEventListener('storage', () => {
    const p = MissionBridge.getProgress(missionKey, totalObjectives);
    badge.querySelector('b').style.color = p.riskScore > 50 ? '#e84040' : p.riskScore > 25 ? '#f5a623' : '#00c896';
  });
};

window.MissionBridge = MissionBridge;