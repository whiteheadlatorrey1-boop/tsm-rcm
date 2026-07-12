
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

module.exports = entitlementManager;
if (typeof window !== 'undefined') { window.TSMCommercialEntitlementManager = entitlementManager; }
