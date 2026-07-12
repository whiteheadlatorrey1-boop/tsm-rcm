/**
 * Enterprise Incident Management
 */

const incidents=[];

const __tsmExport = {

create(incident){

 const record={
   ...incident,
   created:new Date().toISOString()
 };

 incidents.push(record);

 return record;

},

list(){

 return incidents;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.incidentManager = __tsmExport;
}
