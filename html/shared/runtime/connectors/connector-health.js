/**
 * Connector Monitoring
 */

const __tsmImpl = {

check(name){

 return {
   connector:name,
   healthy:true,
   timestamp:new Date().toISOString()
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMConnectorsConnectorHealth = __tsmImpl; }
