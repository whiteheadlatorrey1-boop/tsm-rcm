/**
 * Enterprise Encryption Boundary
 */

const __tsmExport = {

encrypt(data){

 return {
   encrypted:true,
   payload:data
 };

},

decrypt(data){

 return {
   decrypted:true,
   payload:data
 };

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.encryptionManager = __tsmExport;
}
