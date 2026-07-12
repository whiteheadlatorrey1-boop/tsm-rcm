// TSM Anomaly Detector

const __tsmExport = {

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.anomalyDetector = __tsmExport;
}
