// decision-service.js
// This is the piece that plugs into your event bus. It does NOT decide
// anomalies itself — it orchestrates: deterministic rule check first,
// confidence computed second, LLM explanation last (only if the rule fired).

const { getRulesForEventType } = require('./rules/registry');
const { computeConfidence } = require('./confidence');
const { explainDecision } = require('./explain');
const { saveDecision } = require('./decisions-store');
const { appendEvent } = require('./events-store');

/**
 * Call this for every event that comes through the bus. It's cheap to call
 * unconditionally — if no rule matches the event type, it's a no-op.
 *
 * @param {object} event - the triggering event (already appended to the log)
 * @param {object} options - { entityContext } optional extra context for explanation
 * @returns {object[]} - array of decisions produced (usually 0 or 1)
 */
async function processEvent(event, options = {}) {
  const applicableRules = getRulesForEventType(event.type);
  if (applicableRules.length === 0) return [];

  const decisions = [];

  for (const rule of applicableRules) {
    const result = rule.evaluate(event);
    if (!result || !result.fired) continue;

    const confidence = computeConfidence(result);
    const explanation = await explainDecision(result, event, options.entityContext);

    const decision = saveDecision({
      rule_id: result.rule_id,
      domain: rule.domain,
      entity_id: event.entity_id,
      severity: result.severity,
      confidence,
      recommended_action: explanation.recommended_action,
      reasoning: explanation.reasoning,
      risk_summary: explanation.risk_summary,
      evidence: result.matchedEventIds,
      governance: {
        requires_approval: confidence >= 0.75,
        approver_role: rule.domain === 'finops' ? 'ap_manager' : 'domain_owner'
      },
      explanation_source: explanation.source
    });

    // Write the decision back onto the event bus as its own event —
    // this is what makes it replayable/auditable later, and what lets
    // exec portals / WIP command center / audit trail all subscribe to
    // one signal instead of each calling the LLM themselves.
    appendEvent({
      type: 'DECISION_SYNTHESIZED',
      domain: rule.domain,
      entity_id: event.entity_id,
      payload: { decision_id: decision.decision_id, rule_id: rule.rule_id, confidence, severity: result.severity },
      source: 'decision-service'
    });

    decisions.push(decision);
  }

  return decisions;
}

module.exports = { processEvent };
