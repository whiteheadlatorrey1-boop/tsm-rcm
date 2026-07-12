/**
 * Security Audit Trail
 */

const events=[];

const __tsmExport = {

record(event){

 events.push({
   event,
   timestamp:new Date().toISOString()
 });

},

history(){

 return events;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.securityAudit = __tsmExport;
}
