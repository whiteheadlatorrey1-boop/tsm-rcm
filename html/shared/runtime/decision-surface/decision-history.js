// TSM Decision History
const __tsmExport = {
  record(decision) {
    return {
      timestamp: new Date().toISOString(),
      decision
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.decisionHistory = __tsmExport;
}
