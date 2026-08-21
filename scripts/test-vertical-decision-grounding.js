'use strict';

const {
  groundEnterpriseDecision
} = require('../server/enterprise/vertical-decision-grounding');

const fixtures = [
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
  }
];

for (const fixture of fixtures) {
  const output = groundEnterpriseDecision(
    {
      enrichment: {
        vertical: fixture.vertical
      },
      decision: {
        action: 'EXECUTIVE_REVIEW',
        priority: 'HIGH',
        confidence: 59,
        driver: 'VERTICAL_GROUNDING_TEST',
        escalate: true
      },
      explainability: {}
    },
    fixture.context
  );

  console.log('\n============================================================');
  console.log(`VERTICAL: ${fixture.vertical}`);
  console.log('============================================================');
  console.log(JSON.stringify(output, null, 2));
}
