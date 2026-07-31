/**
 * TSM Construction Strategist Bridge v1.0
 * Upgrades construction-strategist.html to read from TSMMission/TSMState
 * while keeping 100% backward compatibility with the existing page.
 *
 * Load at the END of construction-strategist.html, after all existing scripts.
 * Replaces: manual localStorage.getItem('tsm_construction_war_relay') pattern
 * Adds:     mission-aware context injection into existing runConstructionBNCAFromRelay()
 *
 * Dependencies: tsm-event-bus.js · tsm-state.js · tsm-mission-engine.js
 */

(function (global) {
  'use strict';

  // ── 1. Hydrate relay from Mission Engine if available ─────────────────────
  // The existing page checks warRoomRelay — we populate it from TSMState
  // so the existing runConstructionBNCAFromRelay() works with richer data.

  function hydratRelayFromMission() {
    if (!global.TSMState || !global.TSMMission) return false;

    const mission = global.TSMState.get('mission');
    if (!mission || !mission.id || mission.sector !== 'construction') return false;

    // Build the relay shape the existing strategist expects
    const relay = {
      docType:   mission.source  || mission.meta?.docType || 'Document',
      timestamp: mission.createdAt,
      missionId: mission.id,
      snapshot: {
        risk:     mission.meta?.riskScore || '—',
        exposure: mission.exposure ? '$' + Number(mission.exposure).toLocaleString() : '—',
        priority: mission.priority,
        confidence: mission.confidence,
      },
      engines: (() => {
        // Pull from relay payload if present (written by analyzer)
        try {
          const raw = localStorage.getItem('TSM_RELAY_PAYLOAD');
          if (raw) {
            const p = JSON.parse(raw);
            return p.engineOutputs || {};
          }
        } catch (_) {}
        return {};
      })(),
      // Enrich with structured mission data
      mission,
    };

    // Inject into the existing page's warRoomRelay variable
    if (typeof global.warRoomRelay !== 'undefined') {
      global.warRoomRelay = relay;
    } else {
      // Define it if not yet set
      Object.defineProperty(global, 'warRoomRelay', {
        value: relay,
        writable: true,
        configurable: true,
      });
    }

    console.info('[Strategist Bridge] Relay hydrated from mission:', mission.id);
    return relay;
  }

  // ── 2. Enrich the Groq prompt context with mission fields ─────────────────
  // Wrap the existing runConstructionBNCAFromRelay to inject mission context
  // before the Groq call, then update the mission after synthesis completes.

  function patchBNCAFunction() {
    if (typeof global.runConstructionBNCAFromRelay !== 'function') return;

    const _orig = global.runConstructionBNCAFromRelay.bind(global);

    global.runConstructionBNCAFromRelay = async function () {
      // Ensure relay is mission-enriched before the existing function runs
      const relay = hydratRelayFromMission();

      // If we have a mission, inject structured findings into the relay engines
      if (relay && relay.mission) {
        const m = relay.mission;
        const findingsSummary = (m.findings || [])
          .slice(0, 6)
          .map((f, i) => `${i + 1}. [${f.severity?.toUpperCase() || 'MEDIUM'}] ${f.title}`)
          .join('\n');

        const actionsSummary = (m.actions || [])
          .slice(0, 4)
          .map((a, i) => `${i + 1}. ${a.title}${a.exposure ? ' — $' + Number(a.exposure).toLocaleString() : ''}${a.owner ? ' — ' + a.owner : ''}${a.deadline ? ' — ' + a.deadline : ''}`)
          .join('\n');

        // Append mission intelligence to engine 06 context
        if (relay.engines) {
          relay.engines.e6 = [
            relay.engines.e6 || '',
            '\n--- MISSION ENGINE INTELLIGENCE ---',
            `MISSION ID: ${m.id}`,
            `PRIORITY: ${m.priority?.toUpperCase()}`,
            `CONFIDENCE: ${m.confidence}%`,
            `EXPOSURE: ${m.exposure ? '$' + Number(m.exposure).toLocaleString() : 'TBD'}`,
            `\nSTRUCTURED FINDINGS:\n${findingsSummary || 'See engine outputs above'}`,
            `\nSTRUCTURED ACTIONS:\n${actionsSummary || 'See engine outputs above'}`,
          ].join('\n');
        }
      }

      // Run the original BNCA function
      await _orig();

      // After synthesis — update mission with strategist output
      _postSynthesisUpdate();
    };

    console.info('[Strategist Bridge] BNCA function patched.');
  }

  function _postSynthesisUpdate() {
    if (!global.TSMMission || !global.TSMState) return;

    const mission = global.TSMState.get('mission');
    if (!mission || !mission.id) return;

    // Read BNCA output from the page
    const bncaEl = document.getElementById('bncaOutput');
    const bncaText = bncaEl ? bncaEl.textContent : '';

    if (bncaText.length < 50) return;

    // Extract confidence from XP JSON if present
    let confidence = mission.confidence;
    try {
      const raw = localStorage.getItem('TSM_RELAY_PAYLOAD');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.confidence) confidence = p.confidence;
      }
    } catch (_) {}

    // Extract executive summary from BNCA text
    const summaryMatch = bncaText.match(/BNCA[^:]*:\s*([\s\S]+?)(?=ESCALATION|$)/i);
    const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 500) : bncaText.slice(0, 500);

    // Parse priority actions
    const actionsBlock = bncaText.match(/CONTROLLER PRIORITY ACTIONS[^:]*:([\s\S]+?)(?=APP ROUTING|BNCA|$)/i);
    const actions = [];
    if (actionsBlock) {
      actionsBlock[1].split('\n')
        .filter(l => /^\d+\./.test(l.trim()))
        .forEach(l => {
          const clean = l.replace(/^\d+\.\s*/, '').trim();
          if (clean) {
            const parts = clean.split('—').map(s => s.trim());
            actions.push({ title: parts[0], owner: parts[2] || null, deadline: parts[3] || null });
          }
        });
    }

    // Update strategist slice in state
    global.TSMState.update('strategist', {
      sector:           'construction',
      executiveSummary: summary,
      actions,
      readyAt:          Date.now(),
    });

    // Update mission status → ready for executive
    global.TSMMission.update(mission.id, {
      status: 'ready',
      confidence,
    });

    global.TSMMission.addTimeline(mission.id, {
      event: 'strategist_synthesis_complete',
      actor: 'strategist',
      data:  { actionsCount: actions.length },
    });

    // Enrich the strategist relay written by existing storeStrategistRelay()
    // with mission id so exec portal can find it
    try {
      const existing = JSON.parse(
        sessionStorage.getItem('TSM_CONSTRUCTION_STRATEGIST_RELAY') ||
        localStorage.getItem('tsm_construction_strategist_output') || '{}'
      );
      existing.missionId = mission.id;
      existing.strategistActions = actions;
      existing.confidence = confidence;
      sessionStorage.setItem('TSM_CONSTRUCTION_STRATEGIST_RELAY', JSON.stringify(existing));
      localStorage.setItem('tsm_construction_strategist_output', JSON.stringify(existing));
    } catch (_) {}

    // Fire bus event
    if (global.TSMBus) {
      global.TSMBus.emit('STRATEGIST_PLAN_READY', {
        missionId: mission.id,
        sector: 'construction',
        actions,
        confidence,
      });
    }

    console.info('[Strategist Bridge] Post-synthesis update complete. Mission ready for executive.');
  }

  // ── 3. Patch escalateToExecutive to pass mission id ───────────────────────

  function patchEscalateFunction() {
    if (typeof global.escalateToExecutive !== 'function') return;

    const _origEsc = global.escalateToExecutive.bind(global);

    global.escalateToExecutive = function () {
      // Ensure mission state is current before navigating
      if (global.TSMState && global.TSMMission) {
        const mission = global.TSMState.get('mission');
        if (mission?.id) {
          global.TSMMission.update(mission.id, { status: 'executing' });
          global.TSMMission.addTimeline(mission.id, {
            event: 'escalated_to_executive',
            actor: 'strategist',
          });
          if (global.TSMBus) {
            global.TSMBus.emit('EXECUTIVE_READY', {
              missionId: mission.id,
              sector: 'construction',
            });
          }
        }
      }
      _origEsc();
    };

    console.info('[Strategist Bridge] escalateToExecutive patched.');
  }

  // ── 4. Listen for War Room events ─────────────────────────────────────────

  function wireEventListeners() {
    if (!global.TSMBus) return;

    // Auto-load relay when War Room fires findings
    global.TSMBus.on('WARROOM_FINDINGS_READY', function (payload) {
      if (payload.mission?.sector !== 'construction') return;
      const relay = hydratRelayFromMission();
      if (relay) {
        // Trigger existing populateFromWarRoom if it exists
        if (typeof global.populateFromWarRoom === 'function') {
          global.populateFromWarRoom(relay);
        }
        console.info('[Strategist Bridge] Auto-populated from WARROOM_FINDINGS_READY event.');
      }
    });

    // Listen for mission updates
    global.TSMBus.on('MISSION_UPDATED', function (payload) {
      if (payload.mission?.sector !== 'construction') return;
      // Refresh relay binding silently
      hydratRelayFromMission();
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    hydratRelayFromMission();
    patchBNCAFunction();
    patchEscalateFunction();
    wireEventListeners();

    // Also try to trigger existing loadWarRoomRelay() with enriched data
    if (typeof global.loadWarRoomRelay === 'function') {
      // Only if existing relay wasn't already loaded
      setTimeout(() => {
        if (!global.warRoomRelay || !global.warRoomRelay.missionId) {
          hydratRelayFromMission();
          if (typeof global.populateFromWarRoom === 'function' && global.warRoomRelay) {
            global.populateFromWarRoom(global.warRoomRelay);
          }
        }
      }, 200);
    }

    console.info('[Strategist Bridge] v1.0 initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 150); // after inline scripts run
  }

})(window);