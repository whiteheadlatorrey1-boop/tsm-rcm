/**
 * tsm-rule-registry.js
 * Enterprise Runtime — declarative rule engine.
 *
 * Replaces bespoke per-domain engine files (tsm-cross-mesh.js's deriveX()
 * pattern, BPO's quality-score → governance logic, etc.) with a single
 * registry that any war room can register rules against.
 *
 * A rule is:
 *   {
 *     id: "mduDuplicateCluster",      // unique string
 *     domain: "MDM",                  // source domain this rule listens on
 *     description: "...",             // optional, for debugging/audit
 *     priority: 0,                    // optional, higher runs first (default 0)
 *     when(data, ctx) => boolean,     // guard — return false/falsy to skip
 *     execute(data, ctx) => {         // do the work, return findings
 *       findings: [
 *         {
 *           target: "Governance",     // domain the finding should be routed to
 *           type: "risk",             // "risk" | "advisory" | "mission" | custom
 *           severity: "P1",           // optional
 *           summary: "...",
 *           detail: { ... }           // optional arbitrary payload
 *         }
 *       ]
 *     }
 *   }
 *
 * This module has zero storage/event dependencies of its own — it is pure
 * evaluation logic. Routing findings into TSMRelay / TSMEventBus is the
 * Enterprise Runtime's job (tsm-enterprise-runtime.js), not the registry's.
 * This keeps the registry unit-testable with plain objects in Node.
 */
(function (global) {
  'use strict';

  var rules = Object.create(null); // id -> rule
  var domainIndex = Object.create(null); // domain -> [id, ...]

  function assertValidRule(rule) {
    if (!rule || typeof rule !== 'object') {
      throw new Error('TSMRuleRegistry.register: rule must be an object');
    }
    if (!rule.id || typeof rule.id !== 'string') {
      throw new Error('TSMRuleRegistry.register: rule.id (string) is required');
    }
    if (!rule.domain || typeof rule.domain !== 'string') {
      throw new Error('TSMRuleRegistry.register: rule.domain (string) is required');
    }
    if (typeof rule.execute !== 'function') {
      throw new Error('TSMRuleRegistry.register: rule.execute(data, ctx) is required');
    }
    if (rule.when != null && typeof rule.when !== 'function') {
      throw new Error('TSMRuleRegistry.register: rule.when must be a function if provided');
    }
  }

  function register(rule) {
    assertValidRule(rule);
    if (rules[rule.id]) {
      console.warn('[TSMRuleRegistry] Overwriting existing rule: ' + rule.id);
      unregister(rule.id);
    }

    var normalized = {
      id: rule.id,
      domain: rule.domain,
      description: rule.description || '',
      priority: typeof rule.priority === 'number' ? rule.priority : 0,
      when: rule.when || function () { return true; },
      execute: rule.execute
    };

    rules[rule.id] = normalized;
    if (!domainIndex[rule.domain]) domainIndex[rule.domain] = [];
    domainIndex[rule.domain].push(rule.id);

    return normalized;
  }

  function unregister(id) {
    var rule = rules[id];
    if (!rule) return false;
    delete rules[id];
    var list = domainIndex[rule.domain];
    if (list) {
      var idx = list.indexOf(id);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) delete domainIndex[rule.domain];
    }
    return true;
  }

  function getRule(id) {
    return rules[id] || null;
  }

  function getRulesForDomain(domain) {
    var ids = domainIndex[domain] || [];
    return ids
      .map(function (id) { return rules[id]; })
      .sort(function (a, b) { return b.priority - a.priority; });
  }

  function listDomains() {
    return Object.keys(domainIndex);
  }

  function listRules() {
    return Object.keys(rules).map(function (id) { return rules[id]; });
  }

  /**
   * Evaluate every rule registered against `domain` for the given `data`.
   * Never throws — a rule that errors is recorded in `errors` and skipped,
   * so one bad rule can't take down the rest of the cascade.
   *
   * @param {string} domain
   * @param {*} data       - the domain payload (e.g. an MDM relay snapshot)
   * @param {object} [ctx] - optional shared context passed to when()/execute()
   * @returns {{
   *   domain: string,
   *   findings: Array,
   *   ruleResults: Array<{id: string, matched: boolean, findings: Array}>,
   *   errors: Array<{id: string, error: string}>
   * }}
   */
  function evaluate(domain, data, ctx) {
    ctx = ctx || {};
    var applicable = getRulesForDomain(domain);
    var allFindings = [];
    var ruleResults = [];
    var errors = [];

    applicable.forEach(function (rule) {
      var matched = false;
      try {
        matched = !!rule.when(data, ctx);
      } catch (err) {
        errors.push({ id: rule.id, phase: 'when', error: err && err.message ? err.message : String(err) });
        return;
      }

      if (!matched) {
        ruleResults.push({ id: rule.id, matched: false, findings: [] });
        return;
      }

      try {
        var result = rule.execute(data, ctx) || {};
        var findings = Array.isArray(result.findings) ? result.findings : [];
        // Tag each finding with its origin rule/domain for downstream routing + audit.
        findings = findings.map(function (f) {
          return Object.assign({ sourceRule: rule.id, sourceDomain: domain }, f);
        });
        allFindings = allFindings.concat(findings);
        ruleResults.push({ id: rule.id, matched: true, findings: findings });
      } catch (err) {
        errors.push({ id: rule.id, phase: 'execute', error: err && err.message ? err.message : String(err) });
      }
    });

    return {
      domain: domain,
      findings: allFindings,
      ruleResults: ruleResults,
      errors: errors
    };
  }

  var TSMRuleRegistry = {
    register: register,
    unregister: unregister,
    getRule: getRule,
    getRulesForDomain: getRulesForDomain,
    listDomains: listDomains,
    listRules: listRules,
    evaluate: evaluate
  };

  // UMD-ish export: Node (for tests / server-side) + browser global.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TSMRuleRegistry;
  }
  global.TSMRuleRegistry = TSMRuleRegistry;
})(typeof window !== 'undefined' ? window : this);