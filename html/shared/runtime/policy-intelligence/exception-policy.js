// TSM Exception Policy Engine

const __tsmExport = {

create(exception = {}) {

return {

exception,

requiresReview:true,

timestamp:new Date().toISOString()

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.exceptionPolicy = __tsmExport;
}
