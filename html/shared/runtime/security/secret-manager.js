/**
 * Credential and Secret Boundary
 */

const secrets={};

const __tsmImpl = {

store(name,value){

 secrets[name]=value;

 return {
   stored:true,
   name
 };

},

retrieve(name){

 return secrets[name];

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSecuritySecretManager = __tsmImpl; }
