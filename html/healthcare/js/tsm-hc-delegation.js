// ═══════════════════════════════════════════════════════════════════════════
// TSM HC DELEGATION ENGINE — tsm-hc-delegation.js
// Turns a real Anomaly Advisor finding into a delegated task: owner lane,
// priority, and a due-by window — then relays it to hc-strategist via the
// same real endpoint tsm-node-relay-bridge.js uses.
//
// HONESTY CONTRACT:
//   - Owner assignment is a ROLE LANE ("Billing Lead", "Compliance Officer"),
//     never a fabricated named person. Assigning a real staff member by name
//     requires an authenticated, role-scoped staff-lookup endpoint exposed
//     to node pages — /api/admin/staff exists but is admin-only today
//     (server.js requireAdmin). Until that's exposed safely, this engine
//     stays at the role-lane level, matching the "node + ' Lead'" convention
//     hc-strategist-relay.js already uses.
//   - Priority reuses tsm-doc-anomaly-bridge.js's exact severity vocabulary
//     (CRITICAL/HIGH/MEDIUM/ACTIVE via checkStatus) so a task's urgency here
//     always matches what the banner already told the operator — no second,
//     conflicting severity scale.
//   - Due-by windows reuse the escalation windows already established
//     server-side (routes/hc.js: authDelayHours>48 alert threshold, "24-72
//     hours" framing used across hc/layer2 + hc/query) rather than inventing
//     new deadlines.
//   - A task is only created from a REAL anomaly payload (the same one the
//     Anomaly Advisor banner rendered) — this engine never generates a task
//     out of nothing.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.__TSM_HC_DELEGATION__) return;
  window.__TSM_HC_DELEGATION__ = true;

  const OWNER_LANE = {
    billing: 'Billing Lead', insurance: 'Prior Auth Coordinator', financial: 'AR Manager',
    operations: 'Operations Manager', compliance: 'Compliance Officer', pharmacy: 'Pharmacy Director',
    legal: 'Legal Counsel', medical: 'Medical Director', vendors: 'Vendor Manager',
    grants: 'Grants Administrator', taxprep: 'Tax Compliance Lead', denial: 'Denial Management Lead'
  };

  const SEVERITY_META = {
    CRITICAL: { color: '#ff4d6d', dueHours: 24 },
    HIGH: { color: '#f59e0b', dueHours: 48 },
    MEDIUM: { color: '#a78bfa', dueHours: 72 },
    ACTIVE: { color: '#00e5ff', dueHours: 72 }
  };
  const CHECK_STATUS_TO_SEVERITY = {
    DENIAL_RISK: 'CRITICAL', COMPLIANCE_BLOCK: 'CRITICAL', AUTH_BLOCK: 'CRITICAL',
    PAYMENT_BLOCK: 'CRITICAL', LEGAL_HOLD: 'CRITICAL',
    DOCUMENTATION_BLOCK: 'HIGH', THROUGHPUT_BLOCK: 'HIGH', DISPENSE_BLOCK: 'HIGH',
    VENDOR_BLOCK: 'HIGH', GRANT_HOLD: 'HIGH',
    FILING_BLOCK: 'MEDIUM'
  };

  function resolveNodeId() {
    if (window.TSM_NODE_ID) return window.TSM_NODE_ID;
    const m = window.location.pathname.match(/hc-([^\/]+)\//);
    return m ? m[1].toLowerCase() : null;
  }

  function severityFor(checkStatus) {
    return CHECK_STATUS_TO_SEVERITY[(checkStatus || '').toUpperCase()] || 'ACTIVE';
  }

  function dueByLabel(hours) {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // ── task creation from a real anomaly payload ───────────────────────────
  const tasks = [];

  function createTask(payload, nodeId) {
    const severity = severityFor(payload.checkStatus);
    const meta = SEVERITY_META[severity];
    const lane = OWNER_LANE[nodeId] || (nodeId.charAt(0).toUpperCase() + nodeId.slice(1) + ' Lead');
    const task = {
      id: 'task-' + Date.now().toString(36),
      nodeId,
      lane,
      severity,
      dueBy: dueByLabel(meta.dueHours),
      title: (payload.docType ? payload.docType + ': ' : '') + (payload.fileName || payload.ref || payload.checkStatus || 'Anomaly finding'),
      financialImpact: payload.financialImpact || null,
      stepCount: Array.isArray(payload.steps) ? payload.steps.length : 0,
      status: 'OPEN'
    };
    tasks.push(task);
    return task;
  }

  function relayTask(task, action) {
    if (!window.TSMNodeRelay) return;
    const impactStr = task.financialImpact ? (' · $' + Number(task.financialImpact).toLocaleString() + ' exposure') : '';
    window.TSMNodeRelay.push('task-' + action, {
      note: `[DELEGATED] ${task.title} → ${task.lane} · ${task.severity} · due ${task.dueBy}${impactStr} · ${task.stepCount} remediation step(s)`
    });
  }

  // ── render a small delegation strip under the anomaly banner ───────────
  function renderTaskStrip(task) {
    const meta = SEVERITY_META[task.severity];
    const host = document.getElementById('tsm-anb-wrapper');
    const container = host || document.body;

    const strip = document.createElement('div');
    strip.id = 'tsm-delegation-' + task.id;
    strip.style.cssText = `margin:0 0 22px 0;border:1px solid ${meta.color}55;border-radius:6px;background:rgba(0,0,0,.25);font-family:'Courier New',monospace;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px`;
    strip.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="background:${meta.color};color:#000;font-size:.6rem;font-weight:900;letter-spacing:.1em;padding:3px 8px;border-radius:2px">📌 DELEGATED</span>
        <span style="color:#e2e8f0;font-size:.7rem">${task.title}</span>
        <span style="color:#64748b;font-size:.62rem">→</span>
        <span style="color:${meta.color};font-size:.7rem;font-weight:700">${task.lane}</span>
        <span style="color:#475569;font-size:.6rem">· due ${task.dueBy}</span>
        ${task.financialImpact ? `<span style="color:${meta.color};font-size:.62rem">· $${Number(task.financialImpact).toLocaleString()} exposure</span>` : ''}
      </div>
      <div>
        <button data-act="ack" style="background:transparent;border:1px solid ${meta.color}55;color:${meta.color};font-family:inherit;font-size:.6rem;padding:4px 10px;border-radius:3px;cursor:pointer;margin-right:6px">✓ ACKNOWLEDGE</button>
        <button data-act="reassign" style="background:transparent;border:1px solid #334155;color:#94a3b8;font-family:inherit;font-size:.6rem;padding:4px 10px;border-radius:3px;cursor:pointer">↻ REASSIGN LANE</button>
      </div>`;

    strip.querySelector('[data-act="ack"]').onclick = () => {
      task.status = 'ACKNOWLEDGED';
      relayTask(task, 'acknowledged');
      strip.style.opacity = '.55';
      strip.querySelector('[data-act="ack"]').textContent = '✓ ACKNOWLEDGED';
      strip.querySelector('[data-act="ack"]').disabled = true;
    };
    strip.querySelector('[data-act="reassign"]').onclick = () => {
      const lanes = Object.values(OWNER_LANE);
      const idx = lanes.indexOf(task.lane);
      task.lane = lanes[(idx + 1) % lanes.length];
      strip.querySelector('span[style*="font-weight:700"]').textContent = task.lane;
      relayTask(task, 'reassigned');
    };

    if (host) {
      host.insertBefore(strip, host.nextSibling);
    } else {
      const target = document.querySelector('.main-content') || document.querySelector('main') || document.body;
      target.insertBefore(strip, target.firstChild);
    }
  }

  function handleAnomaly(payload, nodeId) {
    if (!payload || !nodeId) return;
    const task = createTask(payload, nodeId);
    renderTaskStrip(task);
    relayTask(task, 'delegated');
  }

  window.TSMDelegation = {
    getTasks: () => tasks.slice(),
    // manual entry point, e.g. from a "delegate this" button elsewhere
    delegate: (payload) => handleAnomaly(payload, resolveNodeId())
  };

  window.addEventListener('tsm-anomaly-ready', (e) => {
    const payload = e && e.detail && e.detail.payload;
    const nodeId = (e && e.detail && e.detail.nodeId) || resolveNodeId();
    handleAnomaly(payload, nodeId);
  });
})();
