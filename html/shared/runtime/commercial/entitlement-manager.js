
// TSM Entitlement Manager

const entitlementManager = {

 check(tenant, capability){

   return {
    tenant,
    capability,
    allowed:true,
    reason:"Enterprise entitlement active"
   };

 }

};

const __tsmExport = entitlementManager;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.entitlementManager = __tsmExport;
}
