const SAMPLES = {
  'struc-block-c': { label: 'Structural Foundation — Block C', type: 'PLANS', desc: 'Full foundation set.', risk: 'LOW', flags: '0', actions: '1', conf: '98%' },
  'mep-coord': { label: 'MEP Coordination — Level 1', type: 'PLANS', desc: 'Mechanical/Plumbing clashing.', risk: 'MED', flags: '2', actions: '2', conf: '91%' },
  'gc-agreement': { label: 'GC Agreement — Phase 2', type: 'CONTRACTS', desc: 'Steel erection contract.', risk: 'MED', flags: '1', actions: '1', conf: '95%' },
  'sub-bid-roofing': { label: 'Subcontractor Bid — Roofing', type: 'CONTRACTS', desc: 'Bid package audit.', risk: 'LOW', flags: '1', actions: '0', conf: '94%' },
  'permit-foundation': { label: 'Building Permit — Block C', type: 'PERMITS', desc: 'City approved foundation.', risk: 'HIGH', flags: '1', actions: '3', conf: '99%' },
  'zoning-variance': { label: 'Zoning Variance App', type: 'PERMITS', desc: 'Height variance draft.', risk: 'HIGH', flags: '4', actions: '2', conf: '88%' },
  'budget-recon': { label: 'Q1 Budget Reconciliation', type: 'REPORTS', desc: 'Budget vs Actual audit.', risk: 'HIGH', flags: '5', actions: '3', conf: '96%' },
  'weekly-progress': { label: 'Weekly Progress — Wk 17', type: 'REPORTS', desc: 'Site 4B schedule tracking.', risk: 'MED', flags: '2', actions: '1', conf: '97%' },
  'osha-plan': { label: 'OSHA Safety Plan — 2026', type: 'SAFETY', desc: 'Site-wide protocols.', risk: 'LOW', flags: '0', actions: '0', conf: '99%' },
  'incident-report': { label: 'Incident Report — Apr 14', type: 'SAFETY', desc: 'Near miss / rigging.', risk: 'CRIT', flags: '1', actions: '4', conf: '92%' },
  'invoice-summary': { label: 'Q1 Invoice Summary', type: 'FINANCIAL', desc: '22 vendor totals.', risk: 'MED', flags: '3', actions: '2', conf: '95%' },
  'change-order-7': { label: 'Change Order #7', type: 'FINANCIAL', desc: 'Foundation variance.', risk: 'MED', flags: '1', actions: '1', conf: '98%' }
};
