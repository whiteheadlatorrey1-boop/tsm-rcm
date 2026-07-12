// TSM Pattern Detector

const __tsmExport = {

detect(history = []) {

return {

patterns: history,

confidence:0.75

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.patternDetector = __tsmExport;
}
