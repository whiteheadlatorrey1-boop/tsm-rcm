(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TSMSAPIntelligence = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DOMAINS = ['CATALOG', 'CRM', 'CPQ', 'O2C'];

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function catalogExposure(payload) {
    if (!payload || !Array.isArray(payload.products)) return 0;

    const flags = payload.attention_flags || {};
    const flaggedSkus = new Set([
      ...(Array.isArray(flags.low_stock) ? flags.low_stock : []).map(p => p && p.sku),
      ...(Array.isArray(flags.compliance) ? flags.compliance : []).map(p => p && p.sku)
    ]);

    return payload.products.reduce((sum, p) => {
      if (!p) return sum;

      const atRisk =
        flaggedSkus.has(p.sku) ||
        ['EOL Announced', 'End of Life'].includes(p.stage);

      return sum + (
        atRisk
          ? number(p.list_price) * number(p.stock_qty)
          : 0
      );
    }, 0);
  }

  function exposureFor(domain, payload) {
    if (!payload) return 0;

    if (domain === 'CATALOG') {
      return catalogExposure(payload);
    }

    const kpis = payload.kpis || {};

    const keys = {
      CRM: ['pipeline_value'],
      CPQ: ['quote_value'],
      O2C: ['order_value']
    };

    return (keys[domain] || [])
      .reduce((sum, key) => sum + number(kpis[key]), 0);
  }

  function firstTwoTokens(value) {
    return text(value)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(' ');
  }

  function mdmCrossCheck(mdmPayload, cpqPayload) {
    const mdm = mdmPayload || {};
    const cpq = cpqPayload || {};

    const mdmRecords =
      Array.isArray(mdm.records) ? mdm.records :
      Array.isArray(mdm.entities) ? mdm.entities :
      [];

    const cpqRecords =
      Array.isArray(cpq.quotes) ? cpq.quotes :
      Array.isArray(cpq.records) ? cpq.records :
      [];

    const mdmKeys = new Set(
      mdmRecords
        .map(r => firstTwoTokens(
          r && (r.material || r.name || r.description || r.customer)
        ))
        .filter(Boolean)
    );

    const cpqKeys = new Set(
      cpqRecords
        .map(r => firstTwoTokens(
          r && (r.material || r.name || r.description || r.customer)
        ))
        .filter(Boolean)
    );

    const missingInCPQ = [...mdmKeys].filter(k => !cpqKeys.has(k));
    const missingInMDM = [...cpqKeys].filter(k => !mdmKeys.has(k));

    return {
      matched: missingInCPQ.length === 0 && missingInMDM.length === 0,
      missingInCPQ,
      missingInMDM
    };
  }

  function severityFor(payloads, crossCheck) {
    const source = payloads || {};

    const o2cHolds = number(
      source.O2C &&
      source.O2C.kpis &&
      source.O2C.kpis.credit_holds
    );

    if (o2cHolds > 0) return 'CRITICAL';

    const stale = Object.values(source).some(payload =>
      payload &&
      payload.timestamp &&
      Date.now() - new Date(payload.timestamp).getTime() > 12 * 60 * 60 * 1000
    );

    if (stale) return 'HIGH';

    if (crossCheck && !crossCheck.matched) return 'HIGH';

    const total = DOMAINS.reduce(
      (sum, domain) => sum + exposureFor(domain, source[domain]),
      0
    );

    if (total > 0) return 'MODERATE';

    if (Object.values(source).some(Boolean)) return 'LOW';

    return 'UNKNOWN';
  }

  function analyze(payloads) {
    const source = payloads || {};

    const domains = DOMAINS.filter(domain => !!source[domain]);

    const exposures = DOMAINS
      .map(domain => ({
        domain,
        amount: exposureFor(domain, source[domain]),
        currency: 'USD',
        source: `TSM_${domain}_RELAY`
      }))
      .filter(item => item.amount > 0);

    const crossCheck = mdmCrossCheck(source.MDM, source.CPQ);

    return {
      domains,
      domainCount: domains.length,
      totalExposure: exposures.reduce((sum, item) => sum + item.amount, 0),
      severity: severityFor(source, crossCheck),
      crossCheck,
      exposures
    };
  }

  return {
    DOMAINS,
    catalogExposure,
    exposureFor,
    firstTwoTokens,
    mdmCrossCheck,
    severityFor,
    analyze
  };
});
