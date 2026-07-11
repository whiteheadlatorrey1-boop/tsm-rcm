/**
 * Enterprise Incident Management
 */

const incidents=[];

module.exports={

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
