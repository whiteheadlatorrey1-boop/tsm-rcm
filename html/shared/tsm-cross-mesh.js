/**
 * TSM Cross-War-Room Intelligence Engine — READ/RENDER LAYER
 * ─────────────────────────────────────────────────────────────
 * Roadmap item #10 (AI Operations Command Upgrade — 10 Phases).
 *
 * MIGRATION NOTE (see reconstruction-plan-status.md, Part B step 2):
 * The derivation logic that used to live here — deriveGovernanceFindings(),
 * deriveIntegrationFindings(), deriveMissions(), evaluate(), and the
 * auto-evaluate init() listener — has moved to a declarative rule
 * (rules/mdm-cross-mesh.rule.js registered against TSMRuleRegistry) run by
 * the Enterprise Runtime (TSMRuntime.start({domain:'MDM'})). That rule is a
 * byte-for-byte behavior port: same IDs, same severity mapping, same copy,
 * same 85-point mission threshold. This file no longer computes anything —
 * it only reads whatever the runtime already wrote to the CROSS_MESH relay
 * domain and renders it. Anything that used to call TSMCrossMesh.evaluate()
 * directly should instead just make sure TSMRuntime.start({domain:'MDM'})
 * has been called once on page load (it re-evaluates on every MDM relay
 * change on its own — no manual re-trigger needed).
 *
 * This is the real cross-domain cascade — not to be confused with
 * tsm-operational-mesh.js, which is a decorative per-page widget with
 * hardcoded per-sector copy and no actual relay reads/writes between
 * verticals.
 *
 * Findings live in their own relay domain (CROSS_MESH) rather than merged
 * into MDM/GOVERNANCE/INTEGRATION's own payloads, so a war room re-firing
 * its own relay.write() never clobbers cross-domain findings derived
 * from it.
 *
 * Usage: include on any exec portal that should display cross-domain
 * findings, then call TSMCrossMesh.getFindings('GOVERNANCE') /
 * TSMCrossMesh.getMissions() to render.
 *
 * Exposed as window.TSMCrossMesh.
 */
(function (global) {
  'use strict';

  const CROSS_DOMAIN = 'CROSS_MESH';
  const CROSS_FALLBACK_KEY = 'TSM_CROSS_MESH_RELAY';

  // ── RELAY I/O (mirrors the read pattern already used by every war room) ──
  function readDomain(domain) {
    try {
      if (global.TSM && global.TSM.relay && global.TSM.relay.read) {
        const d = global.TSM.relay.read(domain);
        if (d) return d;
      }
    } catch (e) {}
    try {
      const key = 'TSM_' + domain + '_RELAY';
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function readCrossMesh() {
    return readDomain(CROSS_DOMAIN) || readDomain0();
    function readDomain0() {
      try {
        const raw = sessionStorage.getItem(CROSS_FALLBACK_KEY) || localStorage.getItem(CROSS_FALLBACK_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
  }

  function getFindings(domain) {
    const d = readCrossMesh();
    if (!d) return [];
    return d[domain] || [];
  }

  function getMissions() {
    const d = readCrossMesh();
    return (d && d.missions) || [];
  }

  // ── RENDER HELPER: drop-in section matching the exec-portal .sec/.list-row style ──
  function renderFindingsSection(mountId, domain, opts) {
    opts = opts || {};
    const el = typeof mountId === 'string' ? document.getElementById(mountId) : mountId;
    if (!el) return;

    const findings = getFindings(domain);
    const missions = domain === 'GOVERNANCE' ? getMissions() : [];

    if (!findings.length) {
      el.innerHTML = `<div class="sec"><div class="sec-hdr">CROSS-WAR-ROOM FINDINGS</div><div class="no-items">No cross-domain findings from MDM right now.</div></div>`;
      return;
    }

    const findingRows = findings.map(f => {
      const label = f.name || f.message;
      const badge = f.status || (f.severity !== undefined ? (f.severity >= 85 ? 'HIGH' : f.severity >= 60 ? 'MED' : 'LOW') : null);
      return `<div class="list-row">${badge ? `<span class="lbadge">${badge}</span>` : ''}<span>${label} <span style="color:var(--muted);font-size:.65rem">— ${f.source || 'Cross-Mesh'}</span></span></div>`;
    }).join('');

    let missionHtml = '';
    if (missions.length) {
      missionHtml = `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="font-family:'Orbitron',sans-serif;font-size:.6rem;letter-spacing:.1em;color:var(--red);margin-bottom:8px;">⚡ REMEDIATION MISSIONS AUTO-CREATED</div>
        ${missions.map(m => `<div class="list-row"><span class="lbadge" style="background:rgba(239,68,68,.12);color:var(--red);border-color:var(--red);">${m.priority}</span><span>${m.title} <span style="color:var(--muted);font-size:.65rem">— owner: ${m.owner}</span></span></div>`).join('')}
      </div>`;
    }

    el.innerHTML = `<div class="sec"><div class="sec-hdr">CROSS-WAR-ROOM FINDINGS · FROM MDM</div>${findingRows}${missionHtml}</div>`;
  }

  // NOTE: no init(), no auto-evaluate-on-load, no TSM_RELAY_EVENT/storage
  // listeners here anymore — TSMRuntime.start({domain:'MDM'}) owns that now.
  // A page that includes this file just needs TSMRuntime running somewhere
  // (doesn't have to be the same page) for CROSS_MESH to have fresh data to read.

  global.TSMCrossMesh = { getFindings, getMissions, renderFindingsSection };
})(window);