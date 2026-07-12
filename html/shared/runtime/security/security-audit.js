/**
 * Security Audit Trail
 */

const events=[];

module.exports={

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
