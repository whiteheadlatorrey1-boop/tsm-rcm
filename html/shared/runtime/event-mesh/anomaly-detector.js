// TSM Anomaly Detector

module.exports = {

analyze(signal = {}) {

return {

anomaly:
signal.value || null,

risk:
"calculated",

confidence:0.8

};

}

};