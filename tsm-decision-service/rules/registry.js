// rules/registry.js
// Add new rules here as you build them. Each rule must export
// { rule_id, domain, trigger_event_type, evaluate(triggerEvent) }.

const dupInvoiceV1 = require('./dup_invoice_v1');

const ALL_RULES = [
  dupInvoiceV1
  // sla_breach_v1, credit_risk_v1, etc. go here as you build them
];

function getRulesForEventType(eventType) {
  return ALL_RULES.filter(r => r.trigger_event_type === eventType);
}

module.exports = { ALL_RULES, getRulesForEventType };
