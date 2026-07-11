// TSM Impact Calculator

module.exports = {

calculate(inputs = {}) {

return {

financialImpact:
inputs.financial || 0,

operationalImpact:
inputs.operational || "unknown"

};

}

};