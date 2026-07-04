/**
 * TSM AUTO-PIPELINE v1.1
 * Central orchestration spine — all verticals
 * Correctly located at html/js/core/tsm-auto-pipeline.js (served as /js/core/tsm-auto-pipeline.js)
 *
 * FIX (2026-07-01): This file previously only contained a 6-line TSMEventBus stub.
 * The real orchestration engine (RELAY_REGISTRY, relay detection, auto-launch) was
 * sitting unreferenced at the repo root and was never actually served or executed
 * by any of the 18+ war room / strategist / exec portal pages that <script> it.
 * This merges the real engine into the path Express actually serves, and keeps
 * the TSMEventBus definition CPQ and others already depend on.
 */

/* TSM Event Bus — preserved from prior stub, other pages depend on this existing */
window.TSMEventBus = window.TSMEventBus || {
  _handlers: {},
  on: function(evt, fn) { (this._handlers[evt] = this._handlers[evt] || []).push(fn); },
  emit: function(evt, data) { (this._handlers[evt] || []).forEach(fn => fn(data)); }
};

(function(global) {
  'use strict';

  const RELAY_REGISTRY = {
    healthcare:   { keys: ['TSM_HC_WAR_RELAY','tsm_hc_war_relay'],                      entryFn: 'runPipeline',    strategistPath: '/healthcare/hc-main-strategist/' },
    finops:       { keys: ['tsm_war_relay_finops-suite','TSM_FINOPS_WAR_RELAY'],         entryFn: 'generateReport', strategistPath: '/finops-suite/finops-main-strategist.html' },
    insurance:    { keys: ['TSM_INS_WAR_RELAY','tsm_ins_war_relay'],                     entryFn: 'runStrategist',  strategistPath: '/tsm-insurance/insurance-strategist.html' },
    construction: { keys: ['TSM_CONSTRUCTION_WAR_RELAY','tsm_construction_war_relay'],   entryFn: 'runBNCA',        strategistPath: '/construction-suite/construction-strategist.html' },
    legal:        { keys: ['TSM_LEGAL_WAR_RELAY','tsm_legal_war_relay'],                 entryFn: 'runSynthesis',   strategistPath: '/legal-pro/legal-main-strategist.html' },
    realestate:   { keys: ['TSM_RE_WAR_RELAY','tsm_re_war_relay'],                       entryFn: 'runStrategist',  strategistPath: '/reo-pro/re-strategist.html' },
    bpo:          { keys: ['TSM_BPO_WAR_RELAY','tsm_bpo_war_relay'],                     entryFn: 'runStrategist',  strategistPath: '/bpo/bpo-strategist-v2.html' },

    /* Added: verticals that exist in server.js (SP.cpq / SP.o2c / SP.crm / SP.approval /
       SP.mdm / SP.integration / SP.governance / SP.digital_twin) but were never wired
       into the pipeline engine because it was never actually loading. */
    cpq:          { keys: ['TSM_CPQ_WAR_RELAY','tsm_cpq_war_relay'],                     entryFn: 'runStrategist',  strategistPath: '/war-rooms/cpq/cpq-war-room.html' },
    o2c:          { keys: ['TSM_O2C_WAR_RELAY','tsm_o2c_war_relay'],                     entryFn: 'runStrategist',  strategistPath: '/war-rooms/o2c/o2c-war-room.html' },
    crm:          { keys: ['TSM_CRM_WAR_RELAY','tsm_crm_war_relay'],                     entryFn: 'runStrategist',  strategistPath: '/war-rooms/crm/crm-war-room.html' },
    approval:     { keys: ['TSM_APPROVAL_WAR_RELAY','tsm_approval_war_relay'],           entryFn: 'runStrategist',  strategistPath: '/war-rooms/approval/approval-war-room.html' },
    mdm:          { keys: ['TSM_MDM_WAR_RELAY','tsm_mdm_war_relay'],                     entryFn: 'runStrategist',  strategistPath: '/war-rooms/mdm/mdm-war-room.html' },
    integration:  { keys: ['TSM_INTEGRATION_WAR_RELAY','tsm_integration_war_relay'],     entryFn: 'runStrategist',  strategistPath: '/war-rooms/integration-hub/integration-hub.html' },
    governance:   { keys: ['TSM_GOVERNANCE_WAR_RELAY','tsm_governance_war_relay'],       entryFn: 'runStrategist',  strategistPath: '/war-rooms/governance/governance-war-room.html' },
    digitaltwin:  { keys: ['TSM_DIGITALTWIN_WAR_RELAY','tsm_digitaltwin_war_relay'],     entryFn: 'runStrategist',  strategistPath: '/war-rooms/digital-twin/digital-twin.html' },
  };

  const State = {
    enabled: true,
    currentVertical: null,
    relay: null,
    phase: 'IDLE',
  };

  function readRelay(keys) {
    for (const k of keys) {
      const v = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (v) { try { return JSON.parse(v); } catch { return null; } }
    }
    return null;
  }

  function writeRelay(keys, payload) {
    const str = JSON.stringify(payload);
    for (const k of keys) {
      try { sessionStorage.setItem(k, str); localStorage.setItem(k, str); } catch {}
    }
  }

  function isWarRoomPage() {
    const path = window.location.pathname.toLowerCase();
    return path.includes('war-room');
  }

  function detectVertical() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('healthcare') || path.includes('hc-'))   return 'healthcare';
    if (path.includes('finops'))                                return 'finops';
    if (path.includes('insurance'))                             return 'insurance';
    if (path.includes('construction'))                          return 'construction';
    if (path.includes('legal'))                                 return 'legal';
    if (path.includes('reo') || path.includes('re-'))          return 'realestate';
    if (path.includes('bpo'))                                   return 'bpo';
    if (path.includes('cpq'))                                   return 'cpq';
    if (path.includes('o2c') || path.includes('order-to-cash')) return 'o2c';
    if (path.includes('crm'))                                   return 'crm';
    if (path.includes('approval'))                              return 'approval';
    if (path.includes('mdm'))                                   return 'mdm';
    if (path.includes('integration'))                           return 'integration';
    if (path.includes('governance'))                            return 'governance';
    if (path.includes('digital-twin') || path.includes('digitaltwin')) return 'digitaltwin';
    return null;
  }

  function log(msg, level) {
    const prefix = '[TSM-PIPELINE]';
    if (level === 'error') console.error(prefix, msg);
    else if (level === 'warn') console.warn(prefix, msg);
    else console.log(prefix, msg);
    if (global.TSMEventBus && global.TSMEventBus.emit)
      global.TSMEventBus.emit('PIPELINE_LOG', { msg, level, ts: Date.now() });
  }

  function emit(event, payload) {
    if (global.TSMEventBus && global.TSMEventBus.emit)
      global.TSMEventBus.emit(event, { ...payload, ts: Date.now() });
  }

  function setPhase(phase) {
    State.phase = phase;
    emit('PIPELINE_PHASE_CHANGED', { phase, vertical: State.currentVertical });
    log('Phase → ' + phase);
  }

  async function runVerticalEntry(vertical, config) {
    setPhase('RUNNING');
    emit('WAR_ROOM_READY', { vertical, relay: State.relay });
    const fn = global[config.entryFn];
    if (typeof fn === 'function') {
      log('Calling ' + config.entryFn + '() for ' + vertical);
      try {
        await fn();
        setPhase('COMPLETE');
        emit('AI_ANALYSIS_COMPLETE', { vertical, relay: State.relay });
      } catch(e) {
        setPhase('ERROR');
        log(config.entryFn + '() threw: ' + e.message, 'error');
      }
    } else {
      log('Entry function ' + config.entryFn + ' not found on this page', 'warn');
      setPhase('IDLE');
    }
  }

  async function init() {
    if (localStorage.getItem('tsm_auto_mode') === 'off') { log('Auto-mode OFF'); return; }
    if (localStorage.getItem('TSM_AUTO_LAUNCH') === 'false') { log('TSM_AUTO_LAUNCH=false'); return; }

    const vertical = detectVertical();
    if (!vertical) { log('Vertical not detected'); return; }

    const config = RELAY_REGISTRY[vertical];
    State.currentVertical = vertical;

    /* War-room pages are where a relay is CREATED (via the "RELAY TO STRATEGIST"
       button), not where it's consumed. Their analysis functions live inside a
       page-local IIFE and are never attached to window, so calling entryFn here
       always fails with "not found on this page". Only strategist pages should
       auto-launch entryFn on relay detection. */
    if (isWarRoomPage()) {
      log('War-room page for ' + vertical + ' — auto-launch skipped (relay source, not consumer)');
      setPhase('IDLE');
      return;
    }

    const relay = readRelay(config.keys);
    if (!relay) {
      log('No relay for ' + vertical + ' — listening for storage event');
      window.addEventListener('storage', function onStorage(e) {
        if (config.keys.includes(e.key) && e.newValue) {
          window.removeEventListener('storage', onStorage);
          State.relay = JSON.parse(e.newValue);
          setPhase('RELAY_DETECTED');
          emit('DOCUMENT_IMPORTED', { vertical, relay: State.relay });
          setTimeout(() => runVerticalEntry(vertical, config), 800);
        }
      });
      return;
    }

    State.relay = relay;
    setPhase('RELAY_DETECTED');
    emit('DOCUMENT_IMPORTED', { vertical, relay: State.relay });
    setTimeout(() => runVerticalEntry(vertical, config), 1500);
  }

  global.TSMAutoPipeline = {
    init,
    getState:   () => ({ ...State }),
    getRegistry:() => ({ ...RELAY_REGISTRY }),
    readRelay:  (v) => { const c = RELAY_REGISTRY[v]; return c ? readRelay(c.keys) : null; },
    writeRelay: (v, p) => { const c = RELAY_REGISTRY[v]; if (c) writeRelay(c.keys, p); },
    enable:     () => { localStorage.setItem('TSM_AUTO_LAUNCH','true');  log('Pipeline ENABLED'); },
    disable:    () => { localStorage.setItem('TSM_AUTO_LAUNCH','false'); log('Pipeline DISABLED'); },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 100);

})(window);