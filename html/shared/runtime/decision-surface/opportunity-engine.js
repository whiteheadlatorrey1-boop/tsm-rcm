// TSM Opportunity Engine
module.exports = {
  discover(data = {}) {
    return {
      opportunities: data.opportunities || []
    };
  }
};