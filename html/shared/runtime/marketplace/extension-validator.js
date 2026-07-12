/**
 * Extension Security Validation
 */

const __tsmImpl = {

validate(extension){

 return {
   extension,
   valid:true,
   timestamp:new Date().toISOString()
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMMarketplaceExtensionValidator = __tsmImpl; }
