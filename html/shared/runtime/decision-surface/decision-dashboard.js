// TSM Decision Dashboard
const __tsmExport = {
  name: "decision-dashboard",

  summarize(state = {}) {
    return {
      health: state.health || 0,
      risks: state.risks || [],
      missions: state.missions || [],
      automation: state.automation || 0,
      roi: state.roi || 0
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.decisionDashboard = __tsmExport;
}
