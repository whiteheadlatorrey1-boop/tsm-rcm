/**
 * Webhook Event Manager
 */

const __tsmImpl = {

register(event,handler){

 return {
   event,
   handler,
   active:true
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMConnectorsWebhookManager = __tsmImpl; }
