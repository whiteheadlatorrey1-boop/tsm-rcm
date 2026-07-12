/**
 * Security Audit Trail
 */

const events=[];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSecuritySecurityAudit = __tsmImpl; }
