/**
 * Enterprise Synchronization Engine
 */

const __tsmImpl = {

sync(source,target){

 return {
   source,
   target,
   status:"synchronized"
 };

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMConnectorsSyncOrchestrator = __tsmImpl; }
