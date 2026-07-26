/* ═══════════════════════════════════════════════════════════
   TSM VERTICAL REGISTRATIONS
   /architecture/kernel/tsm-registry-verticals.js
   Load order: metadata-engine.js -> relevance-engine.js -> this file
   IDs/routes match WAR_ROOM_ROUTES already in tsm-doc-search-multi.html
   so this is a drop-in, not a rename.
═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";
  if (typeof TSMRegistry === "undefined") {
    console.error("TSMRegistry not loaded — include relevance-engine.js first");
    return;
  }

  TSMRegistry.register({
    id: "hc-war-room",
    title: "Healthcare",
    color: "#38bdf8",
    entities: ["patient", "cptCodes", "icdCodes", "payer", "authorization", "diagnosis"],
    weights: { patient: 10, payer: 10, cptCodes: 9, icdCodes: 9, authorization: 10, diagnosis: 6 },
    route: "/html/healthcare/hc-denial-war-room.html"
  });

  TSMRegistry.register({
    id: "fo-war-room",
    title: "Financial Operations",
    color: "#86efac",
    entities: ["invoice", "vendor", "purchaseOrder"],
    weights: { invoice: 9, vendor: 6, purchaseOrder: 7 },
    route: "/html/finops-suite/finops-war-room.html"
  });

  TSMRegistry.register({
    id: "ins-war-room",
    title: "Insurance",
    color: "#c084fc",
    entities: ["patient", "authorization", "payer", "caseNumber"],
    weights: { patient: 7, authorization: 8, payer: 8, caseNumber: 9 },
    route: "/html/tsm-insurance/insurance-war-room.html"
  });

  TSMRegistry.register({
    id: "con-war-room",
    title: "Construction",
    color: "#fbbf24",
    entities: ["project", "contract", "oshaFlag", "purchaseOrder"],
    weights: { project: 9, contract: 7, oshaFlag: 10, purchaseOrder: 6 },
    route: "/html/war-rooms/construct-war/construction-war-room.html"
  });

  TSMRegistry.register({
    id: "bpo-war-room",
    title: "BPO",
    color: "#f87171",
    entities: ["vendor", "customer", "order", "workflow"],
    weights: { vendor: 7, customer: 7, order: 8 },
    route: "/html/war-rooms/bpo/bpo-war-room.html"
  });

  TSMRegistry.register({
    id: "re-war-room",
    title: "Real Estate",
    color: "#34d399",
    entities: ["propertyId", "lienRecord", "contract"],
    weights: { propertyId: 10, lienRecord: 9, contract: 6 },
    route: "/html/war-rooms/re-war/re-war-room.html"
  });

  TSMRegistry.register({
    id: "leg-war-room",
    title: "Legal",
    color: "#a78bfa",
    entities: ["caseNumber", "contract", "approvals"],
    weights: { caseNumber: 9, contract: 8, approvals: 6 },
    route: "/html/war-rooms/legal-war/legal-war-room.html"
  });

  // O2C — not yet in WAR_ROOM_ROUTES; registered here so it participates
  // in ranking as soon as a route is wired in tsm-doc-search-multi.html
  TSMRegistry.register({
    id: "o2c-war-room",
    title: "Order-to-Cash",
    color: "#38bdf8",
    entities: ["customer", "quote", "order", "shipment", "invoice"],
    weights: { customer: 7, quote: 6, order: 8, shipment: 6, invoice: 8 },
    route: "/html/o2c/o2c-war-room.html"
  });

  // ── SAP-centric verticals backfill ─────────────────────────────────
  TSMRegistry.register({
    id: "crm-war-room",
    title: "CRM",
    color: "#fb7185",
    entities: ["lead", "opportunity", "contractRenewal", "churnRisk"],
    weights: { lead: 6, opportunity: 9, contractRenewal: 7, churnRisk: 9 },
    route: "/html/war-rooms/crm/crm-war-room.html"
  });
  TSMRegistry.register({
    id: "cpq-war-room",
    title: "CPQ",
    color: "#fbbf24",
    entities: ["quote", "priceException", "bundle", "product"],
    weights: { quote: 8, priceException: 9, bundle: 6, product: 5 },
    route: "/html/war-rooms/cpq/cpq-war-room.html"
  });
  TSMRegistry.register({
    id: "catalog-war-room",
    title: "Catalog",
    color: "#a3e635",
    entities: ["sku", "priceList", "discontinuation"],
    weights: { sku: 7, priceList: 7, discontinuation: 8 },
    route: "/html/war-rooms/catalog/catalog-war-room.html"
  });
  TSMRegistry.register({
    id: "approval-war-room",
    title: "Approval Center",
    color: "#facc15",
    entities: ["purchaseOrder", "expense", "discountRequest"],
    weights: { purchaseOrder: 8, expense: 8, discountRequest: 6 },
    route: "/html/war-rooms/approval/approval-war-room.html"
  });
  TSMRegistry.register({
    id: "mdm-war-room",
    title: "Master Data Management",
    color: "#22d3ee",
    entities: ["customerRecord", "goldenRecord", "dataQualityException"],
    weights: { customerRecord: 7, goldenRecord: 8, dataQualityException: 9 },
    route: "/html/war-rooms/mdm/mdm-war-room.html"
  });
  TSMRegistry.register({
    id: "governance-war-room",
    title: "Governance",
    color: "#818cf8",
    entities: ["policyException", "auditFinding", "complianceCert"],
    weights: { policyException: 7, auditFinding: 9, complianceCert: 6 },
    route: "/html/war-rooms/governance/governance-war-room.html"
  });
  TSMRegistry.register({
    id: "integration-hub",
    title: "Integration Hub",
    color: "#2dd4bf",
    entities: ["apiSync", "webhook", "dataMapping"],
    weights: { apiSync: 9, webhook: 6, dataMapping: 7 },
    route: "/html/war-rooms/integration-hub/integration-hub.html"
  });
  TSMRegistry.register({
    id: "digital-twin-war-room",
    title: "Digital Twin",
    color: "#f472b6",
    entities: ["sensorAnomaly", "simulation", "assetHealth"],
    weights: { sensorAnomaly: 9, simulation: 6, assetHealth: 7 },
    route: "/html/war-rooms/digital-twin/digital-twin.html"
  });
})();