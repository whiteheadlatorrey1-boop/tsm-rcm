
// TSM Configuration Wizard

const configurationWizard = {
  configure(options){
    return {
      status:"CONFIGURED",
      options
    };
  }
};

const __tsmExport = configurationWizard;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.configurationWizard = __tsmExport;
}
