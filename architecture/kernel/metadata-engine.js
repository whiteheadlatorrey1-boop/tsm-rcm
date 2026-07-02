/* ═══════════════════════════════════════════════════════════
   TSM METADATA ENGINE
   /architecture/kernel/metadata-engine.js
   Normalizes output from ANY vertical parser (HC, FinOps, O2C,
   Insurance, Construction, Legal, RE, BPO) into one shared
   TSMExtraction shape so the relevance engine and every war
   room consume the same object.
═══════════════════════════════════════════════════════════ */

(function (global) {
  "use strict";

  function emptyExtraction() {
    return {
      metadata: {
        documentType: "",
        title: "",
        confidence: 0,
        pages: 0,
        uploadTime: Date.now(),
        sourceFile: ""
      },
      entities: {
        customer: [], patient: [], vendor: [],
        invoice: [], quote: [], order: [], shipment: [],
        project: [], contract: [], purchaseOrder: [],
        cptCodes: [], icdCodes: [], diagnosis: [],
        products: [], skus: [],
        approvals: [], users: [],
        payer: [], authorization: [],
        propertyId: [], lienRecord: [],
        caseNumber: [], oshaFlag: []
      },
      finance: {
        totalAmount: 0,
        balance: 0,
        revenueRisk: 0,
        paymentStatus: ""
      },
      workflow: {
        stage: "",
        owner: "",
        priority: "",
        sla: "",
        blockers: []
      },
      risks: [],
      recommendations: [],
      aiSummary: ""
    };
  }

  /** Deep-merge a raw parser payload into a valid TSMExtraction shape. */
  function normalizeExtraction(raw) {
    const base = emptyExtraction();
    if (!raw || typeof raw !== "object") return base;

    if (raw.metadata) Object.assign(base.metadata, raw.metadata);
    if (raw.finance) Object.assign(base.finance, raw.finance);
    if (raw.workflow) Object.assign(base.workflow, raw.workflow);
    if (Array.isArray(raw.risks)) base.risks = raw.risks.slice();
    if (Array.isArray(raw.recommendations)) base.recommendations = raw.recommendations.slice();
    if (typeof raw.aiSummary === "string") base.aiSummary = raw.aiSummary;

    if (raw.entities && typeof raw.entities === "object") {
      Object.keys(raw.entities).forEach((key) => {
        const val = raw.entities[key];
        if (!(key in base.entities)) {
          // unknown entity type from a new vertical parser — accept it,
          // don't drop data just because the schema hasn't caught up
          base.entities[key] = [];
        }
        if (Array.isArray(val)) {
          base.entities[key] = val.filter((v) => v !== null && v !== undefined && v !== "");
        } else if (val !== null && val !== undefined && val !== "") {
          base.entities[key] = [val];
        }
      });
    }

    base.metadata.confidence = computeConfidence(base);
    return base;
  }

  /** Confidence = how much structured signal we actually pulled out. */
  function computeConfidence(extraction) {
    const entityKeys = Object.keys(extraction.entities);
    const filled = entityKeys.filter((k) => extraction.entities[k].length > 0).length;
    const entityScore = entityKeys.length ? filled / entityKeys.length : 0;

    const hasFinance = extraction.finance.totalAmount > 0 || extraction.finance.balance > 0 ? 1 : 0;
    const hasWorkflow = extraction.workflow.stage ? 1 : 0;
    const hasType = extraction.metadata.documentType ? 1 : 0;

    const raw = (entityScore * 0.6) + (hasFinance * 0.15) + (hasWorkflow * 0.1) + (hasType * 0.15);
    return Math.round(Math.min(raw, 1) * 100);
  }

  function extractEntities(text, patterns) {
    // patterns: { entityKey: RegExp | RegExp[] }
    const found = {};
    Object.keys(patterns || {}).forEach((key) => {
      const regexes = Array.isArray(patterns[key]) ? patterns[key] : [patterns[key]];
      const matches = [];
      regexes.forEach((re) => {
        const m = text.match(re);
        if (m) matches.push(...m.map((x) => x.trim()));
      });
      if (matches.length) found[key] = [...new Set(matches)];
    });
    return found;
  }

  function extractAmounts(text) {
    const matches = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
    return matches.map((m) => parseFloat(m.replace(/[$,]/g, "")));
  }

  function extractDates(text) {
    const iso = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
    const us = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) || [];
    return [...iso, ...us];
  }

  function detectRisk(extraction) {
    const risks = [];
    if (extraction.finance.revenueRisk > 0) {
      risks.push({ type: "revenue", severity: extraction.finance.revenueRisk > 10000 ? "high" : "medium", amount: extraction.finance.revenueRisk });
    }
    if (extraction.entities.authorization && extraction.entities.authorization.length === 0 &&
        extraction.entities.cptCodes && extraction.entities.cptCodes.length > 0) {
      risks.push({ type: "missing-authorization", severity: "high" });
    }
    if (extraction.workflow.blockers && extraction.workflow.blockers.length) {
      risks.push({ type: "workflow-blocked", severity: "medium", blockers: extraction.workflow.blockers });
    }
    return risks;
  }

  function buildMetadata(fileMeta) {
    return {
      documentType: fileMeta.documentType || "",
      title: fileMeta.title || fileMeta.fileName || "Untitled",
      confidence: 0,
      pages: fileMeta.pages || 1,
      uploadTime: Date.now(),
      sourceFile: fileMeta.fileName || ""
    };
  }

  const TSMMetadataEngine = {
    emptyExtraction,
    normalizeExtraction,
    computeConfidence,
    extractEntities,
    extractAmounts,
    extractDates,
    detectRisk,
    buildMetadata
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = TSMMetadataEngine;
  } else {
    global.TSMMetadataEngine = TSMMetadataEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);