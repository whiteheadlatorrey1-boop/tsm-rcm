'use strict';

/*
 * TSM Vertical Decision Grounding
 *
 * This module operates AFTER the existing Enterprise + BNCA
 * decision has been calculated.
 *
 * It does NOT replace:
 *   - enterprise-engine
 *   - BNCA
 *   - explainability-engine
 *   - strategist
 *   - execution
 *
 * It adds vertical context to the existing enterprise decision
 * contract for downstream client / executive / delivery layers.
 */

const VERTICAL_RULES = {
  healthcare: {
    labels: {
      case: 'Denial / Revenue Cycle Case',
      finding: 'Denial Finding',
      exposure: 'Financial Exposure'
    }
  },

  mortgage: {
    labels: {
      case: 'Mortgage Exception',
      finding: 'Underwriting Finding',
      exposure: 'Loan Exposure'
    }
  },

  bpo: {
    labels: {
      case: 'BPO Operations Case',
      finding: 'SLA / Operations Finding',
      exposure: 'Recovery Exposure'
    }
  },

  insurance: {
    labels: {
      case: 'Insurance Claim',
      finding: 'Claims Finding',
      exposure: 'Claim Exposure'
    }
  },

  real_estate: {
    labels: {
      case: 'Real Estate Asset Case',
      finding: 'Asset / Title Finding',
      exposure: 'Asset Exposure'
    }
  },

  construction: {
    labels: {
      case: 'Construction Exception',
      finding: 'Project Finding',
      exposure: 'Project Exposure'
    }
  },

  legal: {
    labels: {
      case: 'Legal Operations Case',
      finding: 'Legal Finding',
      exposure: 'Matter Exposure'
    }
  },

  finops: {
    labels: {
      case: 'Financial Operations Case',
      finding: 'FinOps Finding',
      exposure: 'Financial Exposure'
    }
  }
};

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function text(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return null;
}

function collectVerticalFacts(context = {}) {
  const facts = [];

  function add(label, value) {
    const rendered = text(value);

    if (rendered) {
      facts.push(`${label}: ${rendered}`);
    }
  }

  add('Entity', context.entity);
  add('Document', context.documentType);

  if (context.customer) {
    add(
      'Customer',
      firstDefined(
        context.customer.name,
        context.customer.id
      )
    );
  }

  if (context.contract) {
    add(
      'Contract',
      firstDefined(
        context.contract.id,
        context.contract.program
      )
    );

    add('Program', context.contract.program);
    add('Amount', context.contract.amount);
  }

  if (context.order) {
    add(
      'Order',
      firstDefined(
        context.order.id,
        context.order.name
      )
    );
  }

  if (context.approval) {
    add(
      'Approval',
      firstDefined(
        context.approval.id,
        context.approval.description
      )
    );
  }

  if (context.compliance) {
    add(
      'Compliance',
      firstDefined(
        context.compliance.id,
        context.compliance.type
      )
    );

    add(
      'Compliance Severity',
      context.compliance.severity
    );
  }

  if (context.project) {
    add(
      'Project',
      firstDefined(
        context.project.id,
        context.project.name
      )
    );

    add('Stage', context.project.stage);
  }

  if (context.workflow) {
    add(
      'Workflow',
      firstDefined(
        context.workflow.id,
        context.workflow.name
      )
    );
  }

  if (context.asset) {
    add(
      'Asset',
      firstDefined(
        context.asset.id,
        context.asset.name
      )
    );
  }

  if (context.audit) {
    add(
      'Audit',
      firstDefined(
        context.audit.id,
        context.audit.type
      )
    );
  }

  return facts;
}

function deriveVerticalFinding(vertical, context = {}) {
  const rules =
    VERTICAL_RULES[vertical] ||
    {
      labels: {
        case: 'Enterprise Case',
        finding: 'Vertical Finding',
        exposure: 'Exposure'
      }
    };

  const facts =
    collectVerticalFacts(context);

  return {
    vertical,
    title: rules.labels.finding,
    caseLabel: rules.labels.case,
    exposureLabel: rules.labels.exposure,
    recommendedAction: firstDefined(
      context.recommendedAction,
      context.recommendation,
      context.nextAction,
      context.action
    ),
    facts
  };
}

/*
 * Production adapter.
 *
 * Input:
 *   result = {
 *     enrichment,
 *     decision,
 *     explainability
 *   }
 *
 * Output:
 *   same result object plus vertical grounding metadata.
 */
function groundEnterpriseResult(
  result = {},
  context = {}
) {
  const enrichment =
    result.enrichment || {};

  const decision =
    result.decision || {};

  const explainability =
    result.explainability || {};

  const vertical =
    String(
      firstDefined(
        enrichment.vertical,
        context.vertical,
        context.sector
      ) || ''
    ).toLowerCase();

  if (!vertical) {
    return result;
  }

  const mergedContext = Object.assign(
    {},
    context,
    enrichment.context || {}
  );

  const finding =
    deriveVerticalFinding(
      vertical,
      mergedContext
    );

  const existingEvidence =
    Array.isArray(explainability.evidence)
      ? explainability.evidence
      : [];

  const verticalEvidence =
    finding.facts.map(
      fact => `${vertical}: ${fact}`
    );

  const groundedEvidence = [
    ...new Set([
      ...existingEvidence,
      ...verticalEvidence
    ])
  ];

  /*
   * Preserve the actual BNCA decision.
   */
  result.verticalFinding = finding;

  result.decisionContext = {
    vertical,

    finding,

    source:
      'TSM_VERTICAL_GROUNDING',

    preservedEnterpriseDecision: {
      action:
        decision.action || null,

      priority:
        decision.priority || null,

      confidence:
        decision.confidence ?? null,

      driver:
        decision.driver || null,

      escalate:
        decision.priority === 'HIGH'
    }
  };

  /*
   * Preserve the original explainability object while
   * extending it with vertical evidence.
   */
  result.explainability =
    Object.assign(
      {},
      explainability,
      {
        evidence: groundedEvidence,
        vertical,
        verticalFinding:
          finding.title,

        reasoning:
          firstDefined(
            explainability.reasoning,
            explainability.why,
            `Vertical ${vertical} evidence was incorporated into the enterprise decision context.`
          )
      }
    );

  return result;
}

module.exports = {
  VERTICAL_RULES,
  collectVerticalFacts,
  deriveVerticalFinding,
  groundEnterpriseResult,
  // Public enterprise decision-grounding contract.
  // Keep the existing implementation name for backward compatibility.
  groundEnterpriseDecision: groundEnterpriseResult
};
