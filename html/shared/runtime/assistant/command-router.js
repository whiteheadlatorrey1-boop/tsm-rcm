// TSM Command Router

const __tsmExport = {

route(command){

return {

command,

destination:
"decision-runtime"

};

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.commandRouter = __tsmExport;
}
