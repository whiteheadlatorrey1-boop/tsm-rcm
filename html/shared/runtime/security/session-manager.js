/**
 * Runtime Session Control
 */

const sessions=[];

module.exports={

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
