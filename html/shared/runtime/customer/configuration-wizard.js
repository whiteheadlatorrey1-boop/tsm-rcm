
// TSM Configuration Wizard

const configurationWizard = {
  configure(options){
    return {
      status:"CONFIGURED",
      options
    };
  }
};

module.exports = configurationWizard;
if (typeof window !== 'undefined') { window.TSMCustomerConfigurationWizard = configurationWizard; }
