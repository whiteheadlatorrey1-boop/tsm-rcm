/**
 * Enterprise Incident Management
 */

const incidents=[];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMOperationsIncidentManager = __tsmImpl; }
