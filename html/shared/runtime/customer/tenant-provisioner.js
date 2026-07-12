
// TSM Tenant Provisioner

const tenantProvisioner = {
  provision(config){
    return {
      tenantId:"TSM-" + Date.now(),
      status:"PROVISIONED",
      configuration:config
    };
  }
};

module.exports = tenantProvisioner;
if (typeof window !== 'undefined') { window.TSMCustomerTenantProvisioner = tenantProvisioner; }
