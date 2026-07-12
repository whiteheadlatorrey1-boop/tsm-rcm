
// TSM Usage Meter

const usageMeter = {

 track(event){
   return {
    event,
    timestamp:new Date().toISOString(),
    status:"RECORDED"
   };
 },

 summarize(tenant){
   return {
    tenant,
    documents:0,
    missions:0,
    automations:0,
    apiCalls:0
   };
 }

};

const __tsmExport = usageMeter;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.usageMeter = __tsmExport;
}
