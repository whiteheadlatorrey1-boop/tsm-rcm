// TSM Regulation Engine

const __tsmExport = {

evaluate(requirement = {}) {

return {

requirement,

compliant:true

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.regulationEngine = __tsmExport;
}
