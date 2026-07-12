/**
 * Webhook Event Manager
 */

const __tsmExport = {

register(event,handler){

 return {
   event,
   handler,
   active:true
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.webhookManager = __tsmExport;
}
