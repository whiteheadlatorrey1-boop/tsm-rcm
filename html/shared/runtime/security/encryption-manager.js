/**
 * Enterprise Encryption Boundary
 */

module.exports={

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
