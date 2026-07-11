/**
 * Enterprise API Gateway
 */

module.exports = {

request(endpoint,payload){

 return {
   endpoint,
   payload,
   status:"queued",
   timestamp:new Date().toISOString()
 };

}

};
