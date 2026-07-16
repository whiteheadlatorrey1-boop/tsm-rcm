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
    route: "/html/construction-suite/construction-war-room.html"
  });

  TSMRegistry.register({
    id: "bpo-war-room",
    title: "BPO",
    color: "#f87171",
    entities: ["vendor", "customer", "order", "workflow"],
    weights: { vendor: 7, customer: 7, order: 8 },
    route: "/html/bpo/bpo-situation-room.html"
  });

  TSMRegistry.register({
    id: "re-war-room",
    title: "Real Estate",
    color: "#34d399",
    entities: ["propertyId", "lienRecord", "contract"],
    weights: { propertyId: 10, lienRecord: 9, contract: 6 },
    route: "/html/reo-pro/re-war-room.html"
  });

  TSMRegistry.register({
    id: "leg-war-room",
    title: "Legal",
    color: "#a78bfa",
    entities: ["caseNumber", "contract", "approvals"],
    weights: { caseNumber: 9, contract: 8, approvals: 6 },
    route: "/html/legal-pro/legal-war-room.html"
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
})();