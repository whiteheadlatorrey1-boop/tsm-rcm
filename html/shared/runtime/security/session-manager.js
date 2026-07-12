/**
 * Runtime Session Control
 */

const sessions=[];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSecuritySessionManager = __tsmImpl; }
