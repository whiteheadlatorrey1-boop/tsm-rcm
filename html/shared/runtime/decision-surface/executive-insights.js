// TSM Executive Insights Engine
module.exports = {
  generate(signal = {}) {
    return {
      changed: signal.change || null,
      impact: signal.impact || null,
      recommendation: signal.recommendation || null
    };
  }
};