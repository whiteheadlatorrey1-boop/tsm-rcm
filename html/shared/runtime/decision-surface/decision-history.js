// TSM Decision History
module.exports = {
  record(decision) {
    return {
      timestamp: new Date().toISOString(),
      decision
    };
  }
};