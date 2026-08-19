/**
 * TSM BNCA Schema Guard
 * ---------------------------------------------------------------------
 * Validates the shape of tsmAIJSON() output for the construction,
 * mortgage, and PM Copilot node -> BNCA -> strategist -> executive
 * relay chains (server.js) before that output is written into
 * TSM_MEMORY and returned to the client.
 *
 * Same intent as server/tsm-output-contract.js (don't let a payload
 * missing required fields quietly pass as "done"), but scoped to the
 * route TYPE rather than the vertical's structured-case builder --
 * these routes don't have a client-side build*StructuredCase()
 * function, they call tsmAIJSON() directly and fall back to a
 * hardcoded default object on failure. enforceBNCASchema() checks
 * whichever object (real AI output or fallback) actually came back.
 *
 * This does NOT verify the values are non-fabricated -- tsmAIJSON()
 * can still return a plausible-looking but wrong "bnca" string. It
 * only verifies the required keys are present so a schema-incomplete
 * payload is visible (schema_check.is_compliant === false) instead of
 * silently relaying a partial object to the strategist/executive tier.
 * ---------------------------------------------------------------------
 */

const ROUTE_SCHEMAS = {
  // Per-node/per-entity analysis: /api/construction/node/:node, /api/mortgage/node/:node
  node: [
    "node", "status", "top_issue", "findings", "actions", "confidence"
  ],
  // Command-level BNCA: /api/construction/bnca, /api/mortgage/bnca
  bnca: [
    "suite", "top_issue", "risk_level", "node_summary", "bnca",
    "owner_lanes", "hitl_review_required", "confidence"
  ],
  // Strategist synthesis: /api/construction-strategist/bnca,
  // /api/mortgage-strategist/bnca, /api/pm-strategist/bnca
  strategist: [
    "suite", "strategic_summary", "priority_actions", "bnca",
    "relay_to_executive", "confidence"
  ],
  // Executive Portal synthesis: /api/construction/executive-portal,
  // /api/mortgage/executive-portal
  executive: [
    "portal", "audience", "decision_summary", "bnca_recommendation",
    "hitl_script", "approval_path", "next_step", "confidence"
  ]
};

function enforceBNCASchema(routeType, vertical, payload = {}) {
  const key = (routeType || "").toLowerCase();
  const usedDefaultFallback = !Object.prototype.hasOwnProperty.call(ROUTE_SCHEMAS, key);
  const requiredFields = ROUTE_SCHEMAS[key] || ROUTE_SCHEMAS.node;

  const missing = requiredFields.filter(field => payload[field] === undefined);

  return {
    route_type: key || "node",
    vertical: (vertical || "").toLowerCase(),
    schema_used: usedDefaultFallback ? "node (default)" : key,
    used_default_fallback: usedDefaultFallback,
    timestamp: new Date().toISOString(),
    is_compliant: missing.length === 0,
    missing_fields: missing,
    required_fields: requiredFields
  };
}

(function (global) {
  var TSMBNCASchema = { ROUTE_SCHEMAS: ROUTE_SCHEMAS, enforceBNCASchema: enforceBNCASchema };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = TSMBNCASchema;
  }
  if (typeof global !== "undefined") {
    global.TSMBNCASchema = TSMBNCASchema;
  }
})(typeof window !== "undefined" ? window : this);
