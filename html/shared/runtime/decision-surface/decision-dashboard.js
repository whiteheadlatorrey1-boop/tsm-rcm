// TSM Decision Dashboard
module.exports = {
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