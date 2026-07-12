/**
 * TSM Extension Registry
 * Central capability registration
 */

const extensions = [];

const __tsmImpl = {

register(extension){
  extensions.push(extension);

  return extension;
},

list(){
  return extensions;
}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMMarketplaceExtensionRegistry = __tsmImpl; }
