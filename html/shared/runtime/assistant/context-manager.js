// TSM Context Manager

const __tsmExport = {

build(context = {}) {

return {

domain:context.domain || "enterprise",

entities:context.entities || [],

session:
Date.now()

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.contextManager = __tsmExport;
}
