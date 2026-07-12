// TSM Anomaly Detector

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMEventMeshAnomalyDetector = __tsmImpl; }
