/**
 * ============================================================
 * Domain-specific labels for the 10 shared enterprise capabilities.
 * ------------------------------------------------------------
 * Same engine, same scoring (enterprise-engine.js's MODULES list never
 * changes) — but the label shown to a human should speak that vertical's
 * language, not the generic module id. Keyed by vertical, one level
 * down by capability module id (matches MODULES in enterprise-engine.js
 * and each capability module's own `id`).
 *
 * REBUILT FROM SCRATCH (2026-07-16): the file previously here was not
 * valid JavaScript — five bare `key: "value"` lines with no enclosing
 * object, no vertical key, and no module.exports. It was never
 * require()'d from anywhere, so this was an unfinished draft, not a
 * live regression. Those five original healthcare label strings
 * (crm, approval, mdm, governance, digital-twin) are preserved exactly
 * as found; the healthcare o2c/cpq/catalog/integration/wip labels and
 * every other vertical are new.
 *
 * Coverage: healthcare, legal, construction, insurance, real_estate,
 * bpo, mortgage — the 7 verticals wired into demo-fixtures.js today.
 * Note: tsm-sector-intelligence.js's navigation registry uses "reo"
 * (not "real_estate") and has no "mortgage" key at all — that's a
 * separate playbook/navigation system, not this capability-scoring
 * layer, so the key sets aren't required to match. Flagging so it
 * doesn't get "silently aligned" without a decision on which is right.
 * ============================================================
 */
'use strict';

module.exports = {

  healthcare: {
    o2c:            "Claims → Payment",
    crm:            "Patient Relationship",
    cpq:            "Service Package Pricing",
    catalog:        "Procedure / Service Catalog",
    approval:       "Prior Authorization",
    mdm:            "Patient Master",
    integration:    "EHR / Payer Integration",
    governance:     "HIPAA",
    wip:            "Care Episode Progress",
    "digital-twin": "Population Forecast"
  },

  legal: {
    o2c:            "Engagement → Invoice",
    crm:            "Client Relationship",
    cpq:            "Fee Arrangement Pricing",
    catalog:        "Matter / Practice Area Catalog",
    approval:       "Conflict Check Approval",
    mdm:            "Client & Matter Master",
    integration:    "Court / Filing System Integration",
    governance:     "Privilege & Ethics Compliance",
    wip:            "Matter Progress",
    "digital-twin": "Docket Forecast"
  },

  construction: {
    o2c:            "Contract → Draw Payment",
    crm:            "Owner / GC Relationship",
    cpq:            "Bid & Change Order Pricing",
    catalog:        "Trade / Material Catalog",
    approval:       "Change Order Approval",
    mdm:            "Project & Vendor Master",
    integration:    "Permit / Municipal System Integration",
    governance:     "Building Code Compliance",
    wip:            "Project Schedule Progress",
    "digital-twin": "Site Progress Model"
  },

  insurance: {
    o2c:            "Policy → Premium Payment",
    crm:            "Policyholder Relationship",
    cpq:            "Underwriting Rate Pricing",
    catalog:        "Coverage / Product Catalog",
    approval:       "Claims Approval",
    mdm:            "Policyholder Master",
    integration:    "Carrier / Reinsurer Integration",
    governance:     "Regulatory Compliance",
    wip:            "Claims Adjudication Progress",
    "digital-twin": "Loss Reserve Forecast"
  },

  real_estate: {
    o2c:            "Listing → Contract → Closing",
    crm:            "Buyer / Investor Relationship",
    cpq:            "Offer & Disposition Pricing",
    catalog:        "Asset / Listing Catalog",
    approval:       "Disposition Approval",
    mdm:            "Asset & Title Master",
    integration:    "MLS / Title Company Integration",
    governance:     "Fair Housing & Title Compliance",
    wip:            "Disposition Timeline Progress",
    "digital-twin": "Portfolio Valuation Forecast"
  },

  bpo: {
    o2c:            "Service Order → Client Invoice",
    crm:            "Client Account Relationship",
    cpq:            "Service Tier Pricing",
    catalog:        "Service Catalog",
    approval:       "Delivery QA Approval",
    mdm:            "Client & Vendor Master",
    integration:    "OCR / RPA / ERP Integration",
    governance:     "SLA Compliance",
    wip:            "Production Queue Progress",
    "digital-twin": "Capacity & Staffing Forecast"
  },

  mortgage: {
    o2c:            "Application → Funded Loan",
    crm:            "Borrower Relationship",
    cpq:            "Rate / Program Pricing",
    catalog:        "Loan Program Catalog",
    approval:       "Underwriting Condition Approval",
    mdm:            "Borrower & Loan Master",
    integration:    "AUS / Investor / Title Integration",
    governance:     "TRID / RESPA / HMDA Compliance",
    wip:            "Loan Pipeline Progress",
    "digital-twin": "Pipeline & Rate Lock Forecast"
  }

};