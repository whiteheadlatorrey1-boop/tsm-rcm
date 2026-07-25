/**
 * ============================================================
 * Demo fixture contexts for POST /api/enterprise/enrich
 * ------------------------------------------------------------
 * Previously: the client sent { demo: "<vertical>" } for each of the
 * demo buttons, but nothing server-side ever interpreted a `demo` key
 * — the orchestrator only reads context.vertical / context.entity /
 * whatever trigger fields the capability modules check for (customer,
 * order, approval, audit, etc., see each file in server/enterprise/).
 * So every demo button was silently enriching against an empty
 * context and returning "0 of 10 capabilities relevant."
 *
 * This file supplies one realistic context object per vertical, keyed
 * by the same demoKey the client already sends. enterprise-router.js
 * looks a key up here when req.body.demo is present.
 *
 * IDs below are synthetic/illustrative, NOT pulled from each
 * vertical's real war-room data files (those weren't part of this
 * upload — only server/ and mortgage-war-rooms/ were). The mortgage
 * fixture is the one exception: DENY-SJ-001 / COND-SJ-01 / TRID-014
 * are real records from mortgage-war-rooms/data/mortgage-model.json,
 * confirmed present in that file. If/when the other verticals' war
 * room data files are available, swap their fixture IDs for real ones
 * the same way.
 *
 * Each fixture is deliberately scoped to hit a subset of the 10
 * capabilities (see the trigger field each capability module checks
 * for — customer->crm, order/invoice/contract->o2c, quote/product->cpq,
 * product/catalog->catalog, approval/request/workflow->approval,
 * compliance/risk/policy/audit->governance, integration/api/system->
 * integration, project/task/work/milestone->wip, asset/model/
 * entityState->digital-twin; mdm fires on its own static anomaly
 * stub regardless of context — see mdm.js / mdm-engine.js note).
 * ============================================================
 */
'use strict';

module.exports = {

  healthcare: {
    vertical: "healthcare",
    entity: "Banner Health",
    documentType: "Claim Denial Notice",
    customer: { id: "PT-88213", name: "Banner Health Patient" },
    approval: { id: "PA-4471", type: "Prior Authorization" },
    audit: { id: "HIPAA-AUD-2026-014" },
    compliance: { id: "HIPAA-2026-014" }
  },

  legal: {
    vertical: "legal",
    entity: "Whitmore & Cole LLP",
    documentType: "Engagement Letter",
    customer: { id: "CLI-3390", name: "Whitmore & Cole Client" },
    contract: { id: "ENG-2026-0117" },
    approval: { id: "CONFLICT-CHK-0117" },
    policy: { id: "PRIV-3" }
  },

  construction: {
    vertical: "construction",
    entity: "Meridian Builders",
    documentType: "Change Order Notice",
    customer: { id: "OWN-2201", name: "Meridian Project Owner" },
    contract: { id: "CO-7", project: "PROJ-MESA-88B" },
    approval: { id: "CO-APPROVAL-7" },
    project: { id: "PROJ-MESA-88B" },
    compliance: { id: "PERMIT-COD-14" }
  },

  insurance: {
    vertical: "insurance",
    entity: "Sentinel Mutual Insurance",
    documentType: "Claims Adjudication File",
    customer: { id: "POL-55210", name: "Sentinel Policyholder" },
    order: { id: "CLM-55210-A" },
    approval: { id: "CLAIMS-APPROVAL-55210" },
    audit: { id: "REG-AUD-2026-009" }
  },

  real_estate: {
    vertical: "real_estate",
    entity: "REO Asset Management Group",
    documentType: "Title Report",
    customer: { id: "INV-1180", name: "REO Portfolio Investor" },
    asset: { id: "PHX-2024-0441" },
    contract: { id: "DISP-0441" },
    audit: { id: "TITLE-AUD-0441" }
  },

  bpo: {
    vertical: "bpo",
    entity: "Acme Corp",
    documentType: "SLA Breach Report",
    customer: { id: "ACC-ACME-01", name: "Acme Corp Account" },
    workflow: { id: "QA-ESCALATION-118" },
    compliance: { id: "SLA-BREACH-2026-118" }
  },

  mortgage: {
    vertical: "mortgage",
    entity: "TSM Mortgage Pipeline",
    documentType: "Underwriting Denial",
    customer: { id: "DENY-SJ-001", name: "Sarah Johnson" },
    contract: { id: "DENY-SJ-001", program: "Conventional", amount: 340000 },
    approval: { id: "COND-SJ-01", description: "Alternative program pre-qual" },
    compliance: { id: "TRID-014", type: "TRID Tolerance", severity: "HIGH" },
    project: { id: "DENY-SJ-001", stage: "denied" }
  }

};