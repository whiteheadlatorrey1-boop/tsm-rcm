// TSM Compliance Mapper

const __tsmExport = {

map(decision = {}) {

return {

decision,

controls:[],

mapped:true

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.complianceMapper = __tsmExport;
}
