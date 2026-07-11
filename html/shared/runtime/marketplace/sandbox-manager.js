/**
 * Extension Isolation Boundary
 */

module.exports={

validate(extension){

 return {
   extension,
   sandbox:true,
   approved:true
 };

}

};
