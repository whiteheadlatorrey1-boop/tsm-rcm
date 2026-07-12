// TSM Signal Router

const __tsmExport = {

route(signal = {}) {

return {

destination:
signal.destination || "intelligence",

signal

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.signalRouter = __tsmExport;
}
