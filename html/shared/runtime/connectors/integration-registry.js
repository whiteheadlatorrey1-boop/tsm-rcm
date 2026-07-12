/**
 * Integration Catalog
 */

const integrations=[];

const __tsmImpl = {

register(adapter){

 integrations.push(adapter);

 return integrations;

},

list(){

 return integrations;

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMConnectorsIntegrationRegistry = __tsmImpl; }
