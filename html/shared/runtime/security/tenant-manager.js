/**
 * Enterprise Tenant Isolation
 */

const tenants=[];

const __tsmImpl = {

register(tenant){

 tenants.push(tenant);

 return tenant;

},

list(){

 return tenants;

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSecurityTenantManager = __tsmImpl; }
