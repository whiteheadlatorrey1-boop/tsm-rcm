/**
 * Extension Dependency Resolver
 */

module.exports={

resolve(extension){

 return {
   extension,
   dependencies:[],
   resolved:true
 };

}

};
