/**
 * Extension Dependency Resolver
 */

const __tsmImpl = {

resolve(extension){

 return {
   extension,
   dependencies:[],
   resolved:true
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMMarketplaceDependencyResolver = __tsmImpl; }
