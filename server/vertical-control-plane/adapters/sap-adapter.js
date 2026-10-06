'use strict';

const {
  createEnvelope,
  validateEnvelope
} = require('../contract');

const sap = require('../../../html/shared/tsm-sap-intelligence');

const RECOMMENDATION = {
  CRITICAL: 'ESCALATE',
  HIGH: 'REVIEW',
  MODERATE: 'MONITOR',
  LOW: 'MONITOR',
  UNKNOWN: 'MONITOR'
};

function fromRelay(payloads = {}) {
  const analysis = sap.analyze(payloads);

  const entities = analysis.domains.map(domain => ({
    type: 'SAP_DOMAIN',
    domain,
    source: `TSM_${domain}_RELAY`
  }));

  const events = analysis.domains.map(domain => ({
    type: 'RELAY_RECEIVED',
    domain,
    source: `TSM_${domain}_RELAY`
  }));

  const findings = [];

  if (!analysis.crossCheck.matched) {
    findings.push({
      type: 'MDM_CPQ_MISMATCH',
      severity: 'HIGH',
      missingInCPQ: analysis.crossCheck.missingInCPQ,
      missingInMDM: analysis.crossCheck.missingInMDM
    });
  }

  const exposures = analysis.exposures.map(item => ({
    type: 'SAP_DOMAIN_EXPOSURE',
    domain: item.domain,
    amount: item.amount,
    currency: item.currency,
    source: item.source
  }));

  const decision = {
    id: `SAP-${Date.now()}`,
    type: 'SAP_RELEASE_REVIEW',
    severity: analysis.severity,
    recommendation:
      RECOMMENDATION[analysis.severity] || 'MONITOR',
    totalExposure: analysis.totalExposure,
    requiresApproval: true,
    executed: false,
    source: 'sap-intelligence'
  };

  const envelope = createEnvelope({
    vertical: 'sap',
    entities,
    events,
    findings,
    exposures,
    relationships: analysis.domains.map(domain => ({
      type: 'RELAY_TO_DOMAIN',
      domain
    })),
    decisions: [decision],
    governance: {
      approvalRequired: true,
      approved: false
    },
    actions: [],
    verification: {
      mdmCpqCrossCheck: analysis.crossCheck
    },
    writeback: {
      allowed: false,
      executed: false
    },
    metadata: {
      source: 'sap-intelligence',
      adapter: 'sap-adapter',
      domainCount: analysis.domainCount,
      severity: analysis.severity
    }
  });

  if (!validateEnvelope(envelope)) {
    throw new Error('SAP adapter produced an invalid control-plane envelope');
  }

  return envelope;
}

module.exports = {
  fromRelay
};
