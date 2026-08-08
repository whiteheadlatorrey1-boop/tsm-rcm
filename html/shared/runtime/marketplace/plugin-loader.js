/**
 * Runtime Plugin Loader
 */

module.exports = {

load(plugin){

 return {
   loaded:true,
   plugin,
   timestamp:new Date().toISOString()
 };

}

};
