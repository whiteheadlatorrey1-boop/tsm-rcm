'use strict';

/*
 * TSM Vertical Decision Grounding — V1 Regression Gate
 *
 * Invariant under test:
 *
 *   INPUT DECISION
 *         |
 *   groundEnterpriseResult()
 *         |
 *   OUTPUT DECISION
 *
 * must satisfy:
 *   action / priority / confidence / driver / escalate   -> unchanged
 *   verticalFinding / decisionContext.finding / evidence  -> present
 *
 * i.e. vertical grounding ENRICHES the enterprise decision;
 * it never REPLACES it.
 */

const {
  groundEnterpriseDecision,
  VERTICAL_RULES
} = require('../server/enterprise/vertical-decision-grounding');

const EXPECTED_DECISION = {
  action: 'EXECUTIVE_REVIEW',
  priority: 'HIGH',
  confidence: 59,
  driver: 'VERTICAL_GROUNDING_TEST',
  escalate: true
};

const fixtures = [
  {
    vertical: 'healthcare',
    context: {
      vertical: 'healthcare',
      entity: 'HonorHealth Revenue Cycle',
      documentType: 'Denial Notice',
      customer: {
        id: 'PT-88213',
        name: 'Patient Account 88213'
      },
      contract: {
        id: 'CLAIM-88213',
        program: 'Medicare Advantage',
        amount: 18420
      },
      approval: {
        id: 'APPEAL-88213',
        description: 'Level 1 appeal drafted'
      },
      compliance: {
        id: 'HIPAA-DENY-88213',
        type: 'Timely Filing',
        severity: 'HIGH'
      },
      project: {
        id: 'CLAIM-88213',
        stage: 'denied'
      }
    }
  },

  {
    vertical: 'mortgage',
    context: {
      vertical: 'mortgage',
      entity: 'TSM Mortgage Pipeline',
      documentType: 'Underwriting Denial',
      customer: {
        id: 'DENY-SJ-001',
        name: 'Sarah Johnson'
      },
      contract: {
        id: 'DENY-SJ-001',
        program: 'Conventional',
        amount: 340000
      },
      approval: {
        id: 'COND-SJ-01',
        description: 'Alternative program pre-qual'
      },
      compliance: {
        id: 'TRID-014',
        type: 'TRID Tolerance',
        severity: 'HIGH'
      },
      project: {
        id: 'DENY-SJ-001',
        stage: 'denied'
      }
    }
  },

  {
    vertical: 'bpo',
    context: {
      vertical: 'bpo',
      entity: 'Acme Corp',
      documentType: 'SLA Breach Report',
      customer: {
        id: 'ACC-ACME-01',
        name: 'Acme Corp Account'
      },
      workflow: {
        id: 'QA-ESCALATION-118'
      },
      compliance: {
        id: 'SLA-BREACH-2026-118'
      }
    }
  },

  {
    vertical: 'insurance',
    context: {
      vertical: 'insurance',
      entity: 'TSM Insurance Book',
      documentType: 'Claim Denial',
      customer: {
        id: 'POL-44210',
        name: 'Policyholder 44210'
      },
      contract: {
        id: 'CLM-44210',
        program: 'Homeowners',
        amount: 22500
      },
      compliance: {
        id: 'AZ-DOI-44210',
        type: 'Prompt Pay',
        severity: 'HIGH'
      },
      audit: {
        id: 'CLAIMS-AUD-44210',
        type: 'Adjuster Review'
      }
    }
  },

  {
    vertical: 'real_estate',
    context: {
      vertical: 'real_estate',
      entity: 'REO Asset Management Group',
      documentType: 'Title Report',
      customer: {
        id: 'INV-1180',
        name: 'REO Portfolio Investor'
      },
      asset: {
        id: 'PHX-2024-0441'
      },
      contract: {
        id: 'DISP-0441'
      },
      audit: {
        id: 'TITLE-AUD-0441'
      }
    }
  },

  {
    vertical: 'construction',
    context: {
      vertical: 'construction',
      entity: 'TSM Construction Vertical',
      documentType: 'Change Order Exception',
      customer: {
        id: 'GC-3391',
        name: 'General Contractor 3391'
      },
      project: {
        id: 'PROJ-3391',
        stage: 'change_order_review'
      },
      contract: {
        id: 'CO-3391-07',
        program: 'Commercial Build',
        amount: 96500
      },
      compliance: {
        id: 'OSHA-3391',
        type: 'Safety Hold',
        severity: 'HIGH'
      }
    }
  },

  {
    vertical: 'legal',
    context: {
      vertical: 'legal',
      entity: 'TSM Legal Operations',
      documentType: 'Compliance Scenario',
      customer: {
        id: 'MATTER-5502',
        name: 'Matter 5502'
      },
      compliance: {
        id: 'REG-5502',
        type: 'Regulatory Filing',
        severity: 'HIGH'
      },
      approval: {
        id: 'GC-SIGNOFF-5502',
        description: 'General counsel sign-off pending'
      },
      audit: {
        id: 'LEGAL-AUD-5502',
        type: 'Matter Review'
      }
    }
  },

  {
    vertical: 'finops',
    context: {
      vertical: 'finops',
      entity: 'TSM FinOps Vertical',
      documentType: 'Recon Exception',
      customer: {
        id: 'GL-7729',
        name: 'GL Account 7729'
      },
      contract: {
        id: 'RECON-7729',
        program: 'Cost Center Recon',
        amount: 51200
      },
      compliance: {
        id: 'SOX-7729',
        type: 'SOX Control',
        severity: 'HIGH'
      },
      approval: {
        id: 'CFO-SIGNOFF-7729',
        description: 'CFO sign-off pending'
      }
    }
  }
];

const registeredVerticals = Object.keys(VERTICAL_RULES);
const fixtureVerticals = fixtures.map(f => f.vertical);

console.log('============================================================');
console.log(' TSM VERTICAL DECISION GROUNDING V1');
console.log('============================================================\n');

let passCount = 0;
let failCount = 0;
const failures = [];

for (const fixture of fixtures) {
  let output;

  try {
    output = groundEnterpriseDecision(
      {
        enrichment: {
          vertical: fixture.vertical
        },
        decision: Object.assign({}, EXPECTED_DECISION),
        explainability: {}
      },
      fixture.context
    );
  } catch (err) {
    failCount += 1;
    failures.push(`${fixture.vertical}: threw ${err.message}`);
    console.log(`FAIL: ${fixture.vertical} (threw ${err.message})`);
    continue;
  }

  const errorsForFixture = [];

  const preserved =
    output.decisionContext &&
    output.decisionContext.preservedEnterpriseDecision;

  if (!preserved) {
    errorsForFixture.push('decision was not preserved (decisionContext.preservedEnterpriseDecision missing)');
  } else {
    for (const key of Object.keys(EXPECTED_DECISION)) {
      if (preserved[key] !== EXPECTED_DECISION[key]) {
        errorsForFixture.push(
          `${key} changed from ${EXPECTED_DECISION[key]} to ${preserved[key]}`
        );
      }
    }
  }

  if (!output.verticalFinding || output.verticalFinding.vertical !== fixture.vertical) {
    errorsForFixture.push('vertical finding mismatch or missing');
  }

  if (!output.decisionContext || !output.decisionContext.finding) {
    errorsForFixture.push('decision context finding missing');
  }

  if (!output.explainability || !Array.isArray(output.explainability.evidence)) {
    errorsForFixture.push('explainability evidence missing');
  } else if (output.explainability.evidence.length === 0) {
    errorsForFixture.push('explainability evidence is empty');
  }

  if (errorsForFixture.length > 0) {
    failCount += 1;
    for (const msg of errorsForFixture) {
      failures.push(`${fixture.vertical}: ${msg}`);
    }
    console.log(`FAIL: ${fixture.vertical}`);
    for (const msg of errorsForFixture) {
      console.log(`  - ${msg}`);
    }
  } else {
    passCount += 1;
    console.log(`PASS: ${fixture.vertical}`);
  }
}

const missingFixtures = registeredVerticals.filter(
  v => !fixtureVerticals.includes(v)
);

console.log('\n============================================================');
console.log(' VERTICAL GROUNDING CONTRACT');
console.log('============================================================');
console.log(`Verticals tested:               ${fixtures.length}`);
console.log(`Vertical findings generated:    ${passCount}`);
console.log(`Enterprise decisions preserved: ${passCount}`);
console.log(`Explainability preserved:       ${passCount}`);
console.log(`Decision mutations:             ${failCount}`);

if (missingFixtures.length > 0) {
  console.log(`\nWARNING: registered verticals with no fixture coverage: ${missingFixtures.join(', ')}`);
}

console.log('\n============================================================');
if (failCount === 0 && missingFixtures.length === 0) {
  console.log(' VERTICAL GROUNDING V1: PASS');
  console.log('============================================================\n');
  process.exit(0);
} else {
  console.log(' VERTICAL GROUNDING V1: FAIL');
  console.log('============================================================\n');
  if (failures.length > 0) {
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
  }
  process.exit(1);
}
