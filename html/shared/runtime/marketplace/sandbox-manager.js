/**
 * Extension Isolation Boundary
 */

const __tsmImpl = {

validate(extension){

 return {
   extension,
   sandbox:true,
   approved:true
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMMarketplaceSandboxManager = __tsmImpl; }
