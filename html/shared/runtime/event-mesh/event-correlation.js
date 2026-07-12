// TSM Event Correlation Engine

const __tsmExport = {

correlate(events = []) {

return {

events,

relationships: [],

correlated:true

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.eventCorrelation = __tsmExport;
}
