/**
 * Enterprise API Gateway
 */

const __tsmImpl = {

request(endpoint,payload){

 return {
   endpoint,
   payload,
   status:"queued",
   timestamp:new Date().toISOString()
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMConnectorsApiGateway = __tsmImpl; }
