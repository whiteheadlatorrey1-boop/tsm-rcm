/**
 * Runtime Plugin Loader
 */

const __tsmImpl = {

load(plugin){

 return {
   loaded:true,
   plugin,
   timestamp:new Date().toISOString()
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMMarketplacePluginLoader = __tsmImpl; }
