/**
 * tsm-enterprise-runtime.js
 * Enterprise Runtime — the glue between TSMRelay, TSMEventBus, and
 * TSMRuleRegistry.
 *
 * This is what tsm-cross-mesh.js becomes a thin consumer of, eventually:
 * instead of a bespoke file that reads MDM's relay directly and hand-writes
 * Governance/Integration Hub findings, a domain just does:
 *
 *   TSMRuleRegistry.register({ id, domain: "MDM", when, execute });
 *   TSMRuntime.start({ domain: "MDM" });
 *
 * ...and the runtime handles: watching the domain's relay for changes,
 * running the registry against the new payload, and routing any findings
 * to their target domains via TSMRelay.merge(), then broadcasting a
 * RUNTIME_FINDING event so exec-portal UIs can react live.
 *
 * Depends on (must be loaded first):
 *   - tsm-relay.js       -> global TSMRelay      (read/write/merge/watch/unwatch)
 *   - tsm-event-bus.js   -> global TSMEventBus   (publish/subscribe/unsubscribe/once)
 *   - tsm-rule-registry.js -> global TSMRuleRegistry (evaluate)
 *
 * CONFIRMED against the real html/shared/tsm-event-bus.js and
 * html/shared/tsm-relay.js (not guessed): TSMEventBus has no on()/off()/emit(),
 * only publish/subscribe/unsubscribe/once — this file's emit() wrapper calls
 * TSMEventBus.publish() internally. TSMRelay's real methods are
 * read/write/merge/watch(domain, cb)->unwatch fn, matching what's used below.
 */
(function (global) {
  'use strict';

  var active = Object.create(null); // domain -> { unwatch, options }

  function requireDeps() {
    var missing = [];
    if (!global.TSMRelay) missing.push('TSMRelay (tsm-relay.js)');
    if (!global.TSMRuleRegistry) missing.push('TSMRuleRegistry (tsm-rule-registry.js)');
    if (missing.length) {
      throw new Error('[TSMRuntime] Missing dependency: ' + missing.join(', '));
    }
    // TSMEventBus is soft-optional: runtime still works (relay-routing only),
    // it just can't broadcast RUNTIME_FINDING/RUNTIME_ERROR live.
    if (!global.TSMEventBus) {
      console.warn('[TSMRuntime] TSMEventBus not found — findings will still route via TSMRelay, but no live RUNTIME_FINDING events will fire.');
    }
  }

  function emit(event, detail) {
    // Confirmed against the real html/shared/tsm-event-bus.js: it exposes
    // publish/subscribe/unsubscribe/once — there is no emit() or on()/off().
    if (global.TSMEventBus && typeof global.TSMEventBus.publish === 'function') {
      global.TSMEventBus.publish(event, detail);
    }
  }

  /**
   * CROSS-MESH ROUTING
   * ──────────────────
   * Confirmed against the real tsm-cross-mesh.js (uploaded, not guessed):
   * derived cross-domain findings do NOT get merged into GOVERNANCE's or
   * INTEGRATION's own relay payload. They're written to an isolated
   * CROSS_MESH relay domain instead, specifically so a war room re-firing
   * its own relay.write() can never clobber findings derived from it.
   * Consumers call TSMCrossMesh.getFindings('GOVERNANCE') /
   * .getMissions() / .renderFindingsSection(), which read:
   *   { GOVERNANCE: [...], INTEGRATION: [...], missions: [...] }
   * off the CROSS_MESH domain.
   *
   * The original evaluate() also fully recomputes and OVERWRITES that
   * payload every time MDM changes — it's not additive. To preserve that
   * semantic while also supporting more source domains later (Part B step 3:
   * BPO, Construction, Legal all feeding the same CROSS_MESH domain), this
   * runtime keys each source domain's slice separately under `bySource` and
   * replaces only that slice on each evaluation, then republishes flattened
   * GOVERNANCE/INTEGRATION/missions arrays (concatenated across all
   * sources) so TSMCrossMesh's existing read-side functions work unchanged.
   *
   * Findings destined for CROSS_MESH carry a `payload` field holding the
   * exact original-shaped object (id/name/severity/... for governance,
   * id/message/... for integration, id/title/... for missions) — the rule
   * owns that shape, the runtime just buckets and writes it.
   */
  var CROSS_MESH_DOMAIN = 'CROSS_MESH';
  var CROSS_MESH_BUCKET_MAP = { risk: 'GOVERNANCE', advisory: 'INTEGRATION', mission: 'missions' };

  function routeCrossMeshBatch(sourceDomain, findings, sourceTimestamp) {
    var slice = { GOVERNANCE: [], INTEGRATION: [], missions: [], sourceTimestamp: sourceTimestamp || null, timestamp: new Date().toISOString() };

    findings.forEach(function (f) {
      var bucket = CROSS_MESH_BUCKET_MAP[f.type];
      if (!bucket) {
        console.warn('[TSMRuntime] Unknown cross-mesh finding type "' + f.type + '" — dropping:', f);
        return;
      }
      slice[bucket].push(f.payload || f);
    });

    // Confirmed against real html/shared/tsm-relay.js: read/write are the actual method names.
    var current = global.TSMRelay.read(CROSS_MESH_DOMAIN) || {};
    current.bySource = current.bySource || {};
    current.bySource[sourceDomain] = slice; // REPLACE this source's slice — matches original's full-recompute-per-evaluate() behavior

    var flatGov = [], flatInt = [], flatMissions = [];
    Object.keys(current.bySource).forEach(function (src) {
      var s = current.bySource[src];
      flatGov = flatGov.concat(s.GOVERNANCE || []);
      flatInt = flatInt.concat(s.INTEGRATION || []);
      flatMissions = flatMissions.concat(s.missions || []);
    });
    current.GOVERNANCE = flatGov;
    current.INTEGRATION = flatInt;
    current.missions = flatMissions;
    current.timestamp = new Date().toISOString();

    global.TSMRelay.write(CROSS_MESH_DOMAIN, current);

    // The original writeCrossMesh() also dispatches this — keep firing it so
    // any page still listening for the raw event (rather than going through
    // TSMCrossMesh) doesn't silently stop working.
    try {
      global.dispatchEvent(new CustomEvent('TSM_CROSS_MESH_EVENT', { detail: current }));
    } catch (e) {}

    return current;
  }

  /**
   * Direct (non-cross-mesh) routing — for future rules that target a
   * domain's OWN relay payload directly (e.g. a rule that writes straight
   * into GOVERNANCE.risks rather than through CROSS_MESH), or a genuine
   * remediation mission via the real mission engine.
   */
  var TYPE_BUCKET_MAP = {
    risk: 'risks',
    advisory: 'advisories'
    // mission intentionally absent — handled by routeMissionFinding() below.
  };

  function routeMissionFinding(finding) {
    if (!global.TSMMission || typeof global.TSMMission.create !== 'function') {
      console.warn('[TSMRuntime] Dropping mission finding — TSMMission (tsm-mission-engine.js) not loaded:', finding);
      return null;
    }
    var mission = global.TSMMission.create({
      sector: (finding.sector || finding.sourceDomain || 'general').toLowerCase(),
      priority: finding.severity === 'P1' ? 'critical' : (finding.priority || 'medium'),
      source: finding.sourceRule || finding.sourceDomain,
      exposure: finding.exposure != null ? finding.exposure : null,
      confidence: finding.confidence != null ? finding.confidence : null,
      meta: {
        summary: finding.summary,
        detail: finding.detail || null,
        routedFrom: finding.sourceDomain,
        routedAt: new Date().toISOString()
      }
    });
    return Object.assign({}, finding, { missionId: mission.id, routedAt: new Date().toISOString() });
  }

  function routeFinding(finding) {
    if (!finding || !finding.target) {
      console.warn('[TSMRuntime] Dropping finding with no target domain:', finding);
      return null;
    }

    if (finding.type === 'mission') {
      return routeMissionFinding(finding);
    }

    var bucket = TYPE_BUCKET_MAP[finding.type] || 'findings';
    var stamped = Object.assign({}, finding, {
      routedAt: new Date().toISOString()
    });

    var current = global.TSMRelay.read(finding.target) || {};
    var existing = Array.isArray(current[bucket]) ? current[bucket] : [];
    var updated = existing.concat([stamped]);

    global.TSMRelay.merge(finding.target, (function () {
      var patch = {};
      patch[bucket] = updated;
      return patch;
    })());

    return stamped;
  }

  /**
   * Run the registry for `domain` against `data`, route resulting findings,
   * and broadcast results. Exposed standalone so it can be called manually
   * (e.g. on initial load) as well as from the relay-watch callback.
   */
  function evaluateAndRoute(domain, data) {
    var result = global.TSMRuleRegistry.evaluate(domain, data, {
      runtime: true,
      evaluatedAt: new Date().toISOString()
    });

    var crossMeshFindings = result.findings.filter(function (f) { return f.target === CROSS_MESH_DOMAIN; });
    var directFindings = result.findings.filter(function (f) { return f.target !== CROSS_MESH_DOMAIN; });

    var routed = [];
    if (crossMeshFindings.length) {
      routeCrossMeshBatch(domain, crossMeshFindings, data && data.timestamp);
      routed = routed.concat(crossMeshFindings);
    }
    routed = routed.concat(directFindings.map(routeFinding).filter(function (f) { return f !== null; }));

    if (result.errors.length) {
      console.error('[TSMRuntime] Rule errors while evaluating domain "' + domain + '":', result.errors);
      emit('RUNTIME_ERROR', { domain: domain, errors: result.errors });
    }

    if (routed.length) {
      emit('RUNTIME_FINDING', { domain: domain, findings: routed });
    }

    return Object.assign({}, result, { routed: routed });
  }

  /**
   * Start watching a domain: on every relay update, evaluate rules and
   * route findings automatically. Idempotent — calling start() again for
   * a domain already running just returns the existing handle.
   *
   * @param {object} options
   * @param {string} options.domain            - domain to watch (e.g. "MDM")
   * @param {boolean} [options.evaluateOnStart] - run once immediately against current relay state (default true)
   * @returns {{domain: string, stop: function}}
   */
  function start(options) {
    requireDeps();
    if (!options || !options.domain) {
      throw new Error('[TSMRuntime] start() requires { domain }');
    }
    var domain = options.domain;
    var evaluateOnStart = options.evaluateOnStart !== false;

    if (active[domain]) {
      console.warn('[TSMRuntime] start(): domain "' + domain + '" is already running; returning existing handle.');
      return active[domain].handle;
    }

    // Confirmed against real html/shared/tsm-relay.js: watch() is the actual method
    // (there is no subscribe()); it returns an unwatch() closure, used in stop() below.
    var unwatch = global.TSMRelay.watch(domain, function (payload) {
      evaluateAndRoute(domain, payload);
    });

    if (evaluateOnStart) {
      var initial = global.TSMRelay.read(domain);
      if (initial != null) evaluateAndRoute(domain, initial);
    }

    var handle = {
      domain: domain,
      stop: function () { stop(domain); }
    };

    active[domain] = { unwatch: unwatch, handle: handle };
    return handle;
  }

  function stop(domain) {
    var entry = active[domain];
    if (!entry) return false;
    if (typeof entry.unwatch === 'function') entry.unwatch();
    delete active[domain];
    return true;
  }

  function stopAll() {
    Object.keys(active).forEach(stop);
  }

  function listActiveDomains() {
    return Object.keys(active);
  }

  var TSMRuntime = {
    start: start,
    stop: stop,
    stopAll: stopAll,
    listActiveDomains: listActiveDomains,
    // Exposed for manual/one-off evaluation (e.g. server-side batch jobs)
    // without needing a live relay watch.
    evaluateAndRoute: evaluateAndRoute
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TSMRuntime;
  }
  global.TSMRuntime = TSMRuntime;
})(typeof window !== 'undefined' ? window : this);