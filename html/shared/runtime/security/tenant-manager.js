/**
 * Enterprise Tenant Isolation
 */

const tenants=[];

module.exports={

register(tenant){

 tenants.push(tenant);

 return tenant;

},

list(){

 return tenants;

}

};
