/**
 * Credential and Secret Boundary
 */

const secrets={};

const __tsmExport = {

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.secretManager = __tsmExport;
}
