/**
 * Enterprise Encryption Boundary
 */

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSecurityEncryptionManager = __tsmImpl; }
