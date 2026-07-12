/**
 * Enterprise Capability Catalog
 */

const capabilities=[];

const __tsmImpl = {

register(capability){

 capabilities.push(capability);

 return capabilities;

},

list(){

 return capabilities;

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMMarketplaceCapabilityCatalog = __tsmImpl; }
