/**
 * Runtime Session Control
 */

const sessions=[];

const __tsmExport = {

create(user){

 const session={
   user,
   created:new Date().toISOString()
 };

 sessions.push(session);

 return session;

},

active(){

 return sessions;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.sessionManager = __tsmExport;
}
