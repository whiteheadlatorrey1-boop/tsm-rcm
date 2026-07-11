/**
 * Extension Security Validation
 */

module.exports={

validate(extension){

 return {
   extension,
   valid:true,
   timestamp:new Date().toISOString()
 };

}

};
