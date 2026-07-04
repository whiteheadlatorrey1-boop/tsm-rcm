// rules/dup_invoice_v1.js
// Deterministic duplicate-invoice detector. This is the part an auditor can
// actually verify: same inputs always produce the same result. No LLM call
// happens in this file.

const { queryEvents } = require('../events-store');

function similarity(a, b) {
  // Simple relative-difference similarity for dollar amounts.
  // 1.0 = identical, 0.0 = wildly different.
  if (a === 0 && b === 0) return 1;
  const diff = Math.abs(a - b);
  const base = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.max(0, 1 - diff / base);
}

const rule = {
  rule_id: 'dup_invoice_v1',
  domain: 'finops',
  trigger_event_type: 'INVOICE_RECEIVED',
  severity: 'red',
  params: {
    window_days: 90,
    amount_match_threshold: 0.92
  },

  /**
   * @param {object} triggerEvent - the newly received INVOICE_RECEIVED event
   * @returns {object|null} - null if the rule doesn't fire, else a result object
   */
  evaluate(triggerEvent) {
    const { vendor_id, amount } = triggerEvent.payload;

    if (!vendor_id || typeof amount !== 'number') {
      return null; // not enough data to evaluate — fail closed, don't guess
    }

    const candidates = queryEvents({
      type: 'INVOICE_RECEIVED',
      domain: 'finops',
      payloadMatch: { vendor_id },
      withinDays: rule.params.window_days,
      referenceTimestamp: triggerEvent.timestamp,
      excludeId: triggerEvent.id
    });

    const matches = candidates
      .map(c => ({ event: c, score: similarity(c.payload.amount, amount) }))
      .filter(m => m.score >= rule.params.amount_match_threshold);

    if (matches.length === 0) return null;

    return {
      fired: true,
      rule_id: rule.rule_id,
      severity: rule.severity,
      matchedEventIds: matches.map(m => m.event.id),
      matchedEvents: matches.map(m => m.event),
      rawScore: Math.max(...matches.map(m => m.score))
    };
  }
};

module.exports = rule;
