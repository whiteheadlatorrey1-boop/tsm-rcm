// TSM Decision History
const __tsmImpl = {
  record(decision) {
    return {
      timestamp: new Date().toISOString(),
      decision
    };
  }
};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMDecisionSurfaceDecisionHistory = __tsmImpl; }
