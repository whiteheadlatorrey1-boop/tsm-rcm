/**
 * Enterprise Tenant Isolation
 */

const tenants=[];

const __tsmExport = {

register(tenant){

 tenants.push(tenant);

 return tenant;

},

list(){

 return tenants;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.tenantManager = __tsmExport;
}
