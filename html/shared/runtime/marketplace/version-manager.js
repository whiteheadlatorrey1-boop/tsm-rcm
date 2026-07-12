/**
 * Extension Version Control
 */

const __tsmImpl = {

check(extension){

 return {
   extension,
   version:"1.0.0",
   compatible:true
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMMarketplaceVersionManager = __tsmImpl; }
